const axios = require('axios');

const ORDER_SOURCE_URL = process.env.ORDER_SOURCE_URL || process.env.CONTENT_URL || '';
const SOURCE_CONFIGURED = Boolean(ORDER_SOURCE_URL);

function normalizeOrder(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || raw.orderId || raw.number;
  const status = raw.status || raw.state || 'pending';
  const total = raw.total || raw.amount || '0';
  const currency = raw.currency || raw.curr || 'TWD';
  const billingName = raw.customer || (raw.billing && raw.billing.name) || (raw.billing && raw.billing.first_name);
  const link = raw.url || raw.link || raw.editUrl;

  return id ? {
    id,
    status,
    total,
    currency,
    billing: { first_name: billingName },
    url: link
  } : null;
}

async function fetchOrders() {
  if (!SOURCE_CONFIGURED) {
    throw new Error('未設定 ORDER_SOURCE_URL');
  }
  const resp = await axios.get(ORDER_SOURCE_URL, {
    timeout: 10000,
    headers: { 'Accept': 'application/json' }
  });
  const list = Array.isArray(resp.data) ? resp.data : resp.data && resp.data.orders;
  if (!Array.isArray(list)) {
    throw new Error('訂單來源格式錯誤：應為陣列或 { orders: [] }');
  }
  return list
    .map(normalizeOrder)
    .filter(Boolean);
}

module.exports = {
  fetchOrders,
  SOURCE_CONFIGURED,
  ORDER_SOURCE_URL
};
