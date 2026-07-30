const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const User = require('../../models/User');
const Settings = require('../../models/Settings');
const orderService = require('../../services/orderService');
const logger = require('../../utils/logger');

// ── Helper: get user language ──
const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

/**
 * Smart TxHash detection:
 * 1. Pure hex64 (Ethereum/Tron style): /^[a-fA-F0-9]{64}$/
 * 2. 0x prefixed hex64: /^0x[a-fA-F0-9]{64}$/
 * 3. Binance Order ID (numeric, 10+ digits): /^\d{10,}$/
 * 4. Binance Pay ID format: /^\d{16,}$/
 * 5. TRC-20 TxID (base58, 64 chars): /^[T][a-zA-Z0-9]{33}$/
 */
const detectTxHash = (text) => {
  const trimmed = text.trim();

  // Standard hex64 TxHash (ETH, BSC, etc.)
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return { type: 'hex64', value: trimmed };

  // 0x-prefixed hex64
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return { type: 'hex64_0x', value: trimmed };

  // Binance numeric Order ID (10+ digits)
  if (/^\d{10,}$/.test(trimmed)) return { type: 'binance_id', value: trimmed };

  // TRC-20 address as reference
  if (/^T[a-zA-Z0-9]{33}$/.test(trimmed)) return { type: 'trc20_ref', value: trimmed };

  // Alphanumeric 32-128 chars (generic crypto reference)
  if (/^[a-zA-Z0-9]{32,128}$/.test(trimmed)) return { type: 'generic_ref', value: trimmed };

  return null;
};

const paymentHandler = async (ctx, next) => {
  if (!ctx.message || !ctx.message.text) return next?.();

  const text = ctx.message.text;
  const user = ctx.dbUser;
  const lang = getLang(ctx);

  // ── Detect TxHash or payment reference ──
  const txResult = detectTxHash(text);

  if (txResult) {
    const pendingOrder = await Order.findOne({
      user: user.telegramId,
      status: { $in: ['pending', 'processing'] },
      paymentMethod: { $in: ['binance', 'manual_crypto'] }
    }).sort({ createdAt: -1 });

    if (pendingOrder) {
      pendingOrder.paymentTxHash = txResult.value;
      pendingOrder.paymentType = txResult.type;
      pendingOrder.status = 'processing';
      await pendingOrder.save();

      // ── Bilingual response with payment proof details ──
      const typeLabels = {
        hex64: 'ETH/BSC TxHash',
        hex64_0x: '0x TxHash',
        binance_id: 'Binance Order ID',
        trc20_ref: 'TRC-20 Reference',
        generic_ref: 'Payment Reference'
      };

      const shortHash = txResult.value.length > 20
        ? `${txResult.value.substring(0, 12)}...${txResult.value.substring(txResult.value.length - 8)}`
        : txResult.value;

      const msg = (
        `✅ <b>${t(lang, 'تم استلام إثبات الدفع!', 'Payment Proof Received!')}</b>\n\n` +
        `📋 ${t(lang, 'رقم الطلب', 'Order #')}: <code>${pendingOrder.orderNumber}</code>\n` +
        `🔗 ${t(lang, 'النوع', 'Type')}: <b>${typeLabels[txResult.type]}</b>\n` +
        `🔗 ${t(lang, 'المرجع', 'Reference')}: <code>${shortHash}</code>\n\n` +
        `⏳ ${t(lang, 'سيتم التحقق وتسليم مفتاحك خلال دقائق', 'Verification and key delivery within minutes')}`
      );

      await ctx.reply(msg, { parse_mode: 'HTML' });

      // ── Notify admins with inline verify/reject buttons ──
      const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
      const notifyOnPayment = await Settings.get('admin_notification_on_payment', true);

      if (notifyOnPayment) {
        const verifyButtons = Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ ' + t(lang, 'تأكيد وتسليم', 'Confirm & Deliver'), `verify_payment_${pendingOrder._id}`),
            Markup.button.callback('❌ ' + t(lang, 'رفض', 'Reject'), `reject_payment_${pendingOrder._id}`)
          ]
        ]);

        for (const adminId of adminIds) {
          await ctx.telegram.sendMessage(adminId,
            `💳 <b>${t(lang, 'إثبات دفع جديد!', 'New Payment Proof!')}</b>\n\n` +
            `👤 ${t(lang, 'المستخدم', 'User')}: ${user.fullName} (@${user.username || 'N/A'})\n` +
            `🆔 ID: ${user.telegramId}\n` +
            `📦 ${t(lang, 'الطلب', 'Order')}: ${pendingOrder.productName} - ${pendingOrder.durationName}\n` +
            `💰 ${t(lang, 'المبلغ', 'Amount')}: $${pendingOrder.finalPrice.toFixed(2)}\n` +
            `🔗 ${t(lang, 'النوع', 'Type')}: ${typeLabels[txResult.type]}\n` +
            `🔗 TxHash: <code>${txResult.value}</code>`,
            { parse_mode: 'HTML', ...verifyButtons }
          ).catch(() => {});
        }
      }

      return;
    }
  }

  // If not a payment proof, pass to next handler
  return next?.();
};

module.exports = { paymentHandler, detectTxHash };
