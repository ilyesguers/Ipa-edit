/**
 * ⭐ Telegram Stars (XTR) payment service.
 *
 * Works through the Bot HTTP API directly (axios) instead of a bot instance,
 * so invoices can be created even before the bot finishes launching.
 *
 * Flow:
 *   1. Mini App POST /api/orders/stars            → createInvoiceLink()
 *   2. Telegram WebApp.openInvoice(link)           → user pays with Stars
 *   3. Bot receives pre_checkout_query             → validate + answer (starsPayment handler)
 *   4. Bot receives successful_payment             → fulfill order (starsPayment handler)
 *
 * The admin controls pricing from the Settings page:
 *   - stars_enabled : on/off switch
 *   - stars_per_usd : how many Stars equal $1 (e.g. 50 ⭐ = $1)
 */

const axios = require('axios');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

const TELEGRAM_API = (method) => `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`;

const DEFAULT_STARS_PER_USD = 50;

const getStarsConfig = async () => {
  const [enabled, perUsdRaw] = await Promise.all([
    Settings.get('stars_enabled', true),
    Settings.get('stars_per_usd', DEFAULT_STARS_PER_USD)
  ]);
  const perUsd = Number(perUsdRaw);
  return {
    enabled: enabled !== false && String(enabled) !== 'false',
    perUsd: Number.isFinite(perUsd) && perUsd > 0 ? perUsd : DEFAULT_STARS_PER_USD
  };
};

/** Convert a USD amount to whole Telegram Stars (always rounds up, min 1). */
const usdToStars = (usdAmount, perUsd) => Math.max(1, Math.ceil(Number(usdAmount || 0) * perUsd));

/**
 * Create a Telegram invoice link for a Stars payment.
 * @param {object} order - Mongoose Order document (already saved, status pending)
 * @param {number} starsAmount - whole Stars to charge
 * @returns {Promise<{invoiceUrl: string}>}
 */
const createInvoiceLink = async (order, starsAmount) => {
  if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is not configured');

  const payload = {
    title: `${order.productName} — ${order.durationName}`,
    description: `Order ${order.orderNumber} · instant delivery inside the store`,
    payload: String(order._id),
    currency: 'XTR',
    prices: [{ label: `${order.productName}`.slice(0, 32), amount: starsAmount }]
  };

  try {
    const { data } = await axios.post(TELEGRAM_API('createInvoiceLink'), payload, { timeout: 12000 });
    if (!data?.ok || !data.result) {
      throw new Error(data?.description || 'Telegram did not return an invoice link');
    }
    return { invoiceUrl: data.result };
  } catch (err) {
    const description = err.response?.data?.description || err.message;
    logger.error('createInvoiceLink failed:', description);
    throw new Error(`تعذر إنشاء رابط الدفع بالنجوم: ${description}`);
  }
};

/**
 * Refund a completed Stars payment back to the buyer.
 * @param {number} telegramId - buyer's Telegram user id
 * @param {string} telegramPaymentChargeId - charge id from successful_payment
 */
const refundStarPayment = async (telegramId, telegramPaymentChargeId) => {
  if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is not configured');
  const { data } = await axios.post(TELEGRAM_API('refundStarPayment'), {
    user_id: telegramId,
    telegram_payment_charge_id: telegramPaymentChargeId
  }, { timeout: 12000 });
  if (!data?.ok) throw new Error(data?.description || 'refundStarPayment failed');
  return true;
};

module.exports = {
  getStarsConfig,
  usdToStars,
  createInvoiceLink,
  refundStarPayment
};
