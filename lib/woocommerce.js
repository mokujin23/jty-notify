const axios = require('axios');

const WOOCOMMERCE_URL = (process.env.WOOCOMMERCE_URL || '').replace(/\/$/, '');
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
const WOO_CONFIGURED = Boolean(WOOCOMMERCE_URL && WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET);

const wooAuthParams = WOO_CONFIGURED
  ? { consumer_key: WOOCOMMERCE_CONSUMER_KEY, consumer_secret: WOOCOMMERCE_CONSUMER_SECRET }
  : {};

const woocommerceClient = axios.create({
  baseURL: WOOCOMMERCE_URL ? `${WOOCOMMERCE_URL}/wp-json/wc/v3` : 'https://placeholder.com/wp-json/wc/v3',
  auth: {
    username: WOOCOMMERCE_CONSUMER_KEY || 'placeholder',
    password: WOOCOMMERCE_CONSUMER_SECRET || 'placeholder'
  },
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
});

function handleWooError(error) {
  if (axios.isAxiosError(error)) {
    const status = error.response && error.response.status;
    const apiMessage = error.response && error.response.data && error.response.data.message;
    const code = error.response && error.response.data && error.response.data.code;
    const paramDetails = error.response && error.response.data && error.response.data.data && error.response.data.data.params;
    const paramHint = paramDetails ? ` 詳細：${JSON.stringify(paramDetails)}` : '';
    const message = (apiMessage || error.message || 'WooCommerce API 錯誤') + paramHint;
    throw new Error(code ? `${message} (${code})` : message, { cause: error, status });
  }
  throw error instanceof Error ? error : new Error('未知的 WooCommerce 錯誤');
}

async function getOrders(params) {
  try {
    if (!WOO_CONFIGURED) throw new Error('WooCommerce 環境變數未設定');
    const response = await woocommerceClient.get('/orders', {
      params: { per_page: 20, status: ['pending', 'processing'], orderby: 'date', order: 'desc', ...wooAuthParams, ...params }
    });
    return response.data;
  } catch (error) {
    handleWooError(error);
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    if (!WOO_CONFIGURED) throw new Error('WooCommerce 環境變數未設定');
    const response = await woocommerceClient.put(`/orders/${orderId}`, { status }, { params: wooAuthParams });
    return response.data;
  } catch (error) {
    handleWooError(error);
  }
}

module.exports = {
  wooApi: {
    getOrders,
    updateOrderStatus
  },
  formatPrice(price) {
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'NT$';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${symbol}${numPrice.toLocaleString('zh-TW')}`;
  }
};
