/**
 * tronService — automatic verification of USDT (TRC20) transfers.
 *
 * The store owner only fills in a TRC20 wallet address (plus their Binance ID
 * and a payment timeout) in the admin panel — there are no Binance Pay API
 * credentials involved. This service confirms, directly against the public
 * TronGrid API, that a customer actually sent the right amount of USDT to the
 * merchant wallet, so the order can be completed automatically ("truly
 * effective") instead of waiting for a human to check a screenshot.
 *
 * Two ways to verify:
 *   1. By transaction id (TxID) — the customer pastes the hash after sending.
 *   2. By auto-detection — we scan the wallet's recent incoming USDT transfers
 *      and match the one whose amount equals this order's amount and arrived
 *      inside the payment window. No manual input required.
 */

const axios = require('axios');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

// USDT TRC20 contract on Tron mainnet (6 decimals).
const TRONGRID_BASE = 'https://api.trongrid.io';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const DECIMALS = 6;

const apiKey = process.env.TRONGRID_API_KEY || '';
const headers = apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {};

// Avoid hammering TronGrid while the mini app polls for auto-detection.
const transferCache = new Map();
const CACHE_TTL = 8 * 1000;

const isTrc20Address = (value) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(String(value || ''));

function toAmount(value) {
  const n = Number(value) / Math.pow(10, DECIMALS);
  return Number.isFinite(n) ? n : 0;
}

// TRC20 transfers may carry a free-form `data` memo (hex). Decode it when it
// looks like printable ASCII so we can match an order id the customer added.
function decodeMemo(hex) {
  if (!hex || typeof hex !== 'string') return '';
  try {
    const clean = hex.replace(/^0x/, '');
    let out = '';
    for (let i = 0; i < clean.length; i += 2) {
      const b = parseInt(clean.substr(i, 2), 16);
      if (Number.isNaN(b) || b === 0) continue;
      out += String.fromCharCode(b);
    }
    return /[ -~]/.test(out) ? out.replace(/[^ -~]/g, '').trim() : '';
  } catch (_) {
    return '';
  }
}

async function fetchTrc20Transfers(wallet, limit = 50) {
  const cached = transferCache.get(wallet);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  const { data } = await axios.get(`${TRONGRID_BASE}/v1/accounts/${wallet}/transactions/trc20`, {
    params: { contract_address: USDT_CONTRACT, limit, order_by: 'block_timestamp,desc' },
    headers,
    timeout: 12000
  });

  const transfers = Array.isArray(data?.data) ? data.data : [];
  transferCache.set(wallet, { at: Date.now(), data: transfers });
  return transfers;
}

function normalize(tx) {
  return {
    txId: tx.transaction_id,
    from: tx.from,
    to: tx.to,
    amount: toAmount(tx.value),
    blockTimestamp: Number(tx.block_timestamp) || 0,
    memo: decodeMemo(tx.data)
  };
}

/**
 * Verify a USDT (TRC20) transfer for an order.
 * @param {object} params
 * @param {string} params.wallet          Merchant TRC20 address.
 * @param {number} params.expectedAmount  Order final price in USDT.
 * @param {number} [params.paymentAmount] Exact amount the customer was asked to send.
 * @param {string} params.orderId         Human order number (memo hint).
 * @param {string} [params.txId]          Explicit transaction id to verify.
 * @param {number} [params.timeoutMinutes] Payment window for auto-detection.
 * @returns {Promise<{verified:boolean, reason?:string, txId?:string, from?:string, amount?:number, memo?:string}>}
 */
async function verifyTransfer({ wallet, expectedAmount, paymentAmount, orderId, txId, timeoutMinutes = 15 }) {
  if (!isTrc20Address(wallet)) return { verified: false, reason: 'invalid_wallet' };

  let transfers;
  try {
    transfers = await fetchTrc20Transfers(wallet);
  } catch (err) {
    logger.warn('[tronService] TronGrid fetch failed:', err.message);
    return { verified: false, reason: 'network_error' };
  }

  const incoming = transfers.map(normalize).filter((t) => t.to === wallet && t.amount > 0);

  // 1) Explicit TxID path — trust the hash the customer pasted.
  if (txId) {
    const needle = String(txId).trim().toLowerCase();
    const match = incoming.find((t) => t.txId && t.txId.toLowerCase() === needle);
    if (!match) return { verified: false, reason: 'tx_not_found' };
    if (match.amount + 1e-6 < expectedAmount) {
      return { verified: false, reason: 'amount_too_low', match };
    }
    return { verified: true, txId: match.txId, from: match.from, amount: match.amount, memo: match.memo };
  }

  // 2) Auto-detection — match by amount inside the payment window.
  const since = Date.now() - timeoutMinutes * 60 * 1000;
  const candidates = incoming.filter(
    (t) => t.amount >= expectedAmount - 1e-6 && t.amount <= expectedAmount + 0.05 && t.blockTimestamp >= since
  );

  // Strong match: exact amount the customer was told to send.
  if (paymentAmount) {
    const exact = candidates.find((t) => Math.abs(t.amount - paymentAmount) < 1e-4);
    if (exact) return { verified: true, txId: exact.txId, from: exact.from, amount: exact.amount, memo: exact.memo };
  }

  // Prefer a transfer whose memo contains this order id.
  const byMemo = candidates.find((t) => orderId && t.memo && t.memo.includes(String(orderId)));
  if (byMemo) return { verified: true, txId: byMemo.txId, from: byMemo.from, amount: byMemo.amount, memo: byMemo.memo };

  if (candidates.length === 1) {
    const only = candidates[0];
    return { verified: true, txId: only.txId, from: only.from, amount: only.amount, memo: only.memo };
  }

  // Zero or ambiguous (several pending orders share the same amount) → ask for TxID.
  return { verified: false, reason: candidates.length ? 'ambiguous' : 'not_found' };
}

module.exports = { verifyTransfer, isTrc20Address, USDT_CONTRACT };
