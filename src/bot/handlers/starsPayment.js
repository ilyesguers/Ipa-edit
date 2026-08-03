/**
 * ⭐ Telegram Stars payment handlers.
 *
 *   pre_checkout_query  → Telegram asks us (≤ 10s) whether to allow the payment
 *   successful_payment  → Money arrived; deliver the keys instantly
 *
 * Safety rails:
 *  - A payment only fulfills a pending/processing order, exactly once.
 *  - If stock ran out (or the order was cancelled/expired) after the user paid,
 *    the Stars are refunded automatically through refundStarPayment and the
 *    user + admins get a clear message — money is never lost silently.
 */

const Order = require('../../models/Order');
const User = require('../../models/User');
const orderService = require('../../services/orderService');
const { refundStarPayment } = require('../../services/starsService');
const logger = require('../../utils/logger');
const { botLocale } = require('./language');

const t = (lang, ar, en) => (lang === 'en' ? en : ar);

/**
 * Telegram fires this right before charging the user. We validate the order
 * and answer within the 10 second window or Telegram cancels the checkout.
 */
const preCheckoutHandler = async (ctx) => {
  const query = ctx.preCheckoutQuery;
  if (!query) return;

  const ok = async () => ctx.answerPreCheckoutQuery(true).catch(() => {});
  const fail = async (ar, en) => {
    const lang = botLocale(ctx.dbUser?.preferredLanguage || 'ar');
    await ctx.answerPreCheckoutQuery(false, t(lang, ar, en)).catch(() => {});
  };

  try {
    if (query.currency !== 'XTR') return fail('عملة غير مدعومة', 'Unsupported currency');

    const order = await Order.findById(String(query.invoice_payload || ''));
    if (!order) return fail('الطلب غير موجود. أنشئ طلباً جديداً من المتجر.', 'Order not found. Please create a new one in the store.');
    if (order.user !== query.from.id) return fail('هذا الطلب لا يخصك', 'This order does not belong to you');
    if (order.status !== 'pending') return fail('انتهت صلاحية هذا الطلب. أنشئ طلباً جديداً.', 'This order has expired. Please create a new one.');
    if (Number(query.total_amount) !== Number(order.starsAmount)) return fail('مبلغ النجوم غير مطابق', 'Stars amount mismatch');

    return ok();
  } catch (err) {
    logger.error('pre_checkout_query error:', err);
    return fail('خطأ مؤقت، حاول مرة أخرى', 'Temporary error, please retry');
  }
};

/**
 * Payment confirmed. Fulfilling the order delivers the keys and updates every
 * counter — the same pipeline used by wallet/manual admin verification.
 */
const successfulPaymentHandler = async (ctx) => {
  const payment = ctx.message?.successful_payment;
  if (!payment) return;

  const lang = botLocale(ctx.dbUser?.preferredLanguage || 'ar');

  try {
    const order = await Order.findOne({
      _id: String(payment.invoice_payload || ''),
      paymentMethod: 'telegram_stars'
    });
    if (!order) {
      logger.warn(`successful_payment for unknown order payload: ${payment.invoice_payload}`);
      return;
    }

    // Idempotency: network retries / update replays must never deliver twice.
    if (order.status === 'completed') return;

    order.telegramPaymentChargeId = payment.telegram_payment_charge_id || null;
    order.providerPaymentChargeId = payment.provider_payment_charge_id || null;

    // A cancelled/expired order that still got paid → refund the Stars, no delivery.
    if (!['pending', 'processing'].includes(order.status)) {
      await autoRefundStars(ctx, order, payment, lang);
      return;
    }

    const user = await User.findOne({ telegramId: order.user });
    if (!user) {
      await autoRefundStars(ctx, order, payment, lang);
      return;
    }

    try {
      const result = await orderService.fulfillOrder(order, user);
      // fulfillOrder saved the order; attach the charge ids afterwards.
      await Order.findByIdAndUpdate(order._id, {
        telegramPaymentChargeId: order.telegramPaymentChargeId,
        providerPaymentChargeId: order.providerPaymentChargeId,
        paymentVerifiedAt: new Date()
      });

      const keysText = result.keys.map((k) => `<code>${k.keyValue}</code>`).join('\n');
      await ctx.reply(
        `⭐ <b>${t(lang, 'تم استلام نجومك بنجاح!', 'Stars received successfully!')}</b>\n\n` +
        `📦 ${order.productName} — ${order.durationName}\n` +
        `🧾 ${t(lang, 'رقم الطلب', 'Order')}: <code>${order.orderNumber}</code>\n` +
        `⭐ ${t(lang, 'المدفوع', 'Paid')}: <b>${order.starsAmount} Stars</b>\n\n` +
        `🔑 <b>${t(lang, 'مفاتيحك جاهزة', 'Your keys are ready')}:</b>\n${keysText}\n\n` +
        `${t(lang, 'شكراً لثقتك — تجد نسخة دائمة داخل المتجر في قسم «مفاتيحي».', 'Thank you for your trust — a permanent copy is inside the store under “My Keys”.')}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});

      // Notify admins about the Stars sale
      const adminIds = (process.env.ADMIN_IDS || '').split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
      for (const adminId of adminIds) {
        ctx.telegram.sendMessage(
          adminId,
          `⭐ <b>عملية دفع ناجحة بالنجوم</b>\n\n` +
          `👤 ${user.fullName} (@${user.username || '—'})\n` +
          `📦 ${order.productName} — ${order.durationName}\n` +
          `⭐ ${order.starsAmount} Stars · $${order.finalPrice.toFixed(2)}\n` +
          `🧾 <code>${order.orderNumber}</code>`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }

      logger.info(`⭐ Stars order ${order.orderNumber} fulfilled (${order.starsAmount} XTR) for ${order.user}`);
    } catch (fulfillErr) {
      // Stock vanished between checkout and payment → refund instead of stealing the Stars.
      logger.error(`Stars fulfillment failed for ${order.orderNumber}: ${fulfillErr.message}`);
      await autoRefundStars(ctx, order, payment, lang, fulfillErr);
    }
  } catch (err) {
    logger.error('successful_payment handler error:', err);
  }
};

/** Refund the Stars and mark the order failed/cancelled with a clear reason. */
const autoRefundStars = async (ctx, order, payment, lang, cause = null) => {
  try {
    await refundStarPayment(order.user, payment.telegram_payment_charge_id);
    order.starsRefundedAt = new Date();
    order.status = 'cancelled';
    order.adminNotes = cause
      ? `تعذر التسليم (${cause.message}) — تم إرجاع النجوم تلقائياً`
      : 'أُلغي الطلب قبل إتمام الدفع — تم إرجاع النجوم تلقائياً';
    await order.save();

    await ctx.reply(
      `✅ <b>${t(lang, 'تم إرجاع نجومك بالكامل', 'Your Stars were fully refunded')}</b>\n\n` +
      `${cause
        ? t(lang, 'نفد المخزون أثناء إتمام عملية الدفع، أرجعنا لك النجوم فوراً.', 'Stock ran out during checkout, so your Stars were returned immediately.')
        : t(lang, 'هذا الطلب كان قد انتهى قبل وصول الدفع، أرجعنا لك النجوم فوراً.', 'This order had already expired when your payment arrived, so your Stars were returned immediately.')}\n\n` +
      `${t(lang, 'تواصل مع الدعم وسنرتّب طلبك يدوياً بأولوية.', 'Contact support and we will arrange your order manually with priority.')}`,
      { parse_mode: 'HTML' }
    ).catch(() => {});

    const adminIds = (process.env.ADMIN_IDS || '').split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
    for (const adminId of adminIds) {
      ctx.telegram.sendMessage(
        adminId,
        `↩️ <b>استرجاع نجوم تلقائي</b>\n\n🧾 <code>${order.orderNumber}</code>\n👤 ${order.user}\n⭐ ${order.starsAmount}\n📝 ${order.adminNotes}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }
  } catch (err) {
    logger.error(`autoRefundStars failed for order ${order.orderNumber}: ${err.message}`);
  }
};

module.exports = { preCheckoutHandler, successfulPaymentHandler };
