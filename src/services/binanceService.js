const crypto = require('crypto');
const axios = require('axios');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

class BinanceService {
  async getCredentials() {
    const [apiKey, secretKey, merchantId, wallet] = await Promise.all([
      Settings.get('binance_api_key', ''),
      Settings.get('binance_secret_key', ''),
      Settings.get('binance_merchant_id', ''),
      Settings.get('usdt_wallet_trc20', '')
    ]);
    return { apiKey, secretKey, merchantId, wallet };
  }

  generateSignature(payload, secretKey) {
    return crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
  }

  async createPayOrder(amount, currency = 'USDT', orderRef, description = 'Digital Key Purchase') {
    try {
      const { apiKey, secretKey, merchantId } = await this.getCredentials();
      if (!apiKey || !secretKey) throw new Error('Binance credentials not configured');

      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16).toString('hex');
      const payload = {
        env: { terminalType: 'APP' },
        merchantTradeNo: orderRef,
        orderAmount: parseFloat(amount).toFixed(2),
        currency: 'USDT',
        description,
        goodsDetails: [{
          goodsType: '02',
          goodsCategory: 'Z000',
          referenceGoodsId: orderRef,
          goodsName: description,
          goodsUnitAmount: { currency: 'USDT', amount: parseFloat(amount).toFixed(2) }
        }]
      };

      const body = JSON.stringify(payload);
      const payloadStr = `${timestamp}\n${nonce}\n${body}\n`;
      const signature = this.generateSignature(payloadStr, secretKey);

      const response = await axios.post(
        'https://bpay.binanceapi.com/binancepay/openapi/v2/order',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'BinancePay-Timestamp': timestamp,
            'BinancePay-Nonce': nonce,
            'BinancePay-Certificate-SN': apiKey,
            'BinancePay-Signature': signature.toUpperCase()
          },
          timeout: 15000
        }
      );

      if (response.data.status === 'SUCCESS') {
        return { success: true, data: response.data.data };
      }
      throw new Error(response.data.errorMessage || 'Binance Pay order creation failed');
    } catch (error) {
      logger.error('Binance Pay error:', error.message);
      throw error;
    }
  }

  async queryOrder(binancePrepayId) {
    try {
      const { apiKey, secretKey } = await this.getCredentials();
      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16).toString('hex');
      const payload = JSON.stringify({ prepayId: binancePrepayId });
      const payloadStr = `${timestamp}\n${nonce}\n${payload}\n`;
      const signature = this.generateSignature(payloadStr, secretKey);

      const response = await axios.post(
        'https://bpay.binanceapi.com/binancepay/openapi/v2/order/query',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'BinancePay-Timestamp': timestamp,
            'BinancePay-Nonce': nonce,
            'BinancePay-Certificate-SN': apiKey,
            'BinancePay-Signature': signature.toUpperCase()
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Binance query error:', error.message);
      throw error;
    }
  }

  generateManualPaymentQR(amount) {
    return {
      amount: parseFloat(amount).toFixed(6),
      currency: 'USDT TRC20',
      note: `Please send exactly ${amount} USDT on TRC20 network`
    };
  }
}

module.exports = new BinanceService();
