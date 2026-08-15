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
const WalletTopup = require('../../models/WalletTopup');
const User = require('../../models/User');
const orderService = require('../../services/orderService');
const { creditTopup } = require('../../services/walletTopupService');
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

    const invoicePayload = String(query.invoice_payload || '');
    if (invoicePayload.startsWith('topup:')) {
      const topup = await WalletTopup.findById(invoicePayload.slice(6));
      if (!topup || topup.method !== 'telegram_stars') return fail('طلب الشحن غير موجود', 'Top-up request not found');
      if (topup.status !== 'pending') return fail('تمت معالجة طلب الشحن مسبقاً', 'This top-up was already processed');
      if (Number(query.total_amount) !== Number(topup.starsAmount)) return fail('مبلغ النجوم غير مطابق', 'Stars amount mismatch');
      return ok();
    }

    const order = await Order.findById(invoicePayload);
    if (!order) return fail('الطلب غير موجود. أنشئ طلباً جديداً من المتجر.', 'Order not found. Please create a new one in the store.');
    // The store account may be administrator-issued and therefore not share
    // Telegram's numeric ID. Whoever opens the one-time invoice may pay it,
    // while delivery remains bound to the authenticated store account.
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
    const invoicePayload = String(payment.invoice_payload || '');
    if (invoicePayload.startsWith('topup:')) {
      const topup = await WalletTopup.findOne({ _id: invoicePayload.slice(6), method: 'telegram_stars' });
      if (!topup) return logger.warn(`successful_payment for unknown top-up: ${invoicePayload}`);
      if (Number(payment.total_amount) !== Number(topup.starsAmount)) return logger.warn(`Stars amount mismatch for top-up ${topup.topupNumber}`);
      try {
        const result = await creditTopup(topup._id, {
          chargeId: payment.telegram_payment_charge_id,
          providerChargeId: payment.provider_payment_charge_id,
          paidByTelegramId: ctx.from?.id
        });
        if (result.alreadyCompleted) return;
        await ctx.reply(
          `✅ <b>${t(lang, 'تم شحن المحفظة بنجاح', 'Wallet topped up successfully')}</b>\n\n` +
          `💰 ${t(lang, 'المبلغ المضاف', 'Amount added')}: <b>$${Number(topup.amount).toFixed(2)}</b>\n` +
          `⭐ ${t(lang, 'المدفوع', 'Paid')}: <b>${topup.starsAmount} Stars</b>\n` +
          `🧾 <code>${topup.topupNumber}</code>\n\n` +
          `${t(lang, 'الرصيد أصبح متاحاً الآن داخل حساب المتجر.', 'Your balance is now available in your store account.')}`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
        logger.info(`⭐ Wallet top-up ${topup.topupNumber} credited $${topup.amount} to ${topup.user}`);
        return;
      } catch (creditError) {
        await refundStarPayment(ctx.from.id, payment.telegram_payment_charge_id).catch(() => {});
        topup.status = 'cancelled';
        topup.adminNotes = `تعذر شحن الحساب وتمت محاولة إعادة النجوم: ${creditError.message}`;
        await topup.save().catch(() => {});
        await ctx.reply(t(lang, 'تعذر شحن الحساب وتم إرجاع النجوم. تواصل مع الدعم.', 'Top-up failed and the Stars were refunded. Contact support.')).catch(() => {});
        return;
      }
    }

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
    order.starsPaidByTelegramId = ctx.from?.id || null;

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
        starsPaidByTelegramId: order.starsPaidByTelegramId,
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
    await refundStarPayment(ctx.from?.id || order.starsPaidByTelegramId || order.user, payment.telegram_payment_charge_id);
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
