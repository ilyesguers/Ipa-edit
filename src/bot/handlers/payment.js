const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const User = require('../../models/User');
const Settings = require('../../models/Settings');
const orderService = require('../../services/orderService');
const logger = require('../../utils/logger');

const paymentHandler = async (ctx, next) => {
  if (!ctx.message || !ctx.message.text) return next?.();

  const text = ctx.message.text;
  const user = ctx.dbUser;

  // Check if user is submitting a payment proof (TxHash)
  // Format: tx:TXHASH or just a long alphanumeric string that looks like a transaction
  const txHashPattern = /^[a-fA-F0-9]{64}$|^0x[a-fA-F0-9]{64}$/;
  const isTxHash = txHashPattern.test(text.trim());

  if (isTxHash) {
    const pendingOrder = await Order.findOne({
      user: user.telegramId,
      status: 'pending',
      paymentMethod: { $in: ['binance', 'manual_crypto'] }
    }).sort({ createdAt: -1 });

    if (pendingOrder) {
      pendingOrder.paymentTxHash = text.trim();
      pendingOrder.status = 'processing';
      await pendingOrder.save();

      await ctx.reply(
        `✅ <b>تم استلام إثبات الدفع!</b>\n\n` +
        `📋 رقم الطلب: <code>${pendingOrder.orderNumber}</code>\n` +
        `🔗 TxHash: <code>${text.trim().substring(0, 20)}...</code>\n\n` +
        `⏳ سيتم التحقق وتسليم مفتاحك خلال دقائق`,
        { parse_mode: 'HTML' }
      );

      // Notify admins
      const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
      const notifyOnPayment = await Settings.get('admin_notification_on_payment', true);

      if (notifyOnPayment) {
        const verifyButtons = Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ تأكيد وتسليم', `verify_payment_${pendingOrder._id}`),
            Markup.button.callback('❌ رفض', `reject_payment_${pendingOrder._id}`)
          ]
        ]);

        for (const adminId of adminIds) {
          await ctx.telegram.sendMessage(adminId,
            `💳 <b>إثبات دفع جديد!</b>\n\n` +
            `👤 المستخدم: ${user.fullName} (@${user.username || 'N/A'})\n` +
            `🆔 ID: ${user.telegramId}\n` +
            `📦 الطلب: ${pendingOrder.productName} - ${pendingOrder.durationName}\n` +
            `💰 المبلغ: $${pendingOrder.finalPrice.toFixed(2)}\n` +
            `🔗 TxHash: <code>${text.trim()}</code>`,
            { parse_mode: 'HTML', ...verifyButtons }
          ).catch(() => {});
        }
      }

      return;
    }
  }

  // Check if admin is verifying a payment via callback
  return next?.();
};

module.exports = { paymentHandler };
