const { Notification, shell } = require('electron');
const axios = require('axios');

const UPDATE_API_URL = process.env.ORDER_UPDATE_URL || '';
const CAN_UPDATE = Boolean(UPDATE_API_URL);

function showOrderNotification(order, onAction) {
  const title = `新訂單 #${order.id} (${order.status})`;
  const body = order.billing && order.billing.first_name
    ? `${order.billing.first_name} - ${order.total} ${order.currency}`
    : `金額 ${order.total} ${order.currency}`;

  const options = {
    title,
    body,
    silent: false,
    closeButtonText: '忽略'
  };

  if (CAN_UPDATE) {
    options.actions = [
      { type: 'button', text: '標記完成' },
      { type: 'button', text: '取消訂單' }
    ];
  }

  const notification = new Notification(options);

  notification.on('action', async (_, index) => {
    if (index === 0) {
      onAction(order, 'completed');
    } else if (index === 1) {
      onAction(order, 'cancelled');
    }
  });

  notification.on('click', () => {
    if (order.url) {
      shell.openExternal(order.url);
    }
  });

  notification.show();
}

async function handleOrderAction(order, status, sendFeedback) {
  if (!CAN_UPDATE) {
    const message = '目前未設定訂單更新 API，僅提供通知';
    sendFeedback(message);
    throw new Error(message);
  }

  try {
    const resp = await axios.post(UPDATE_API_URL, { id: order.id, status }, { timeout: 10000 });
    if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);
    sendFeedback(`訂單 #${order.id} 已更新為 ${status}`);
    return resp.data;
  } catch (error) {
    let message = error.message || '更新失敗';
    if (axios.isAxiosError(error)) {
      const apiMsg = error.response && error.response.data && (error.response.data.message || error.response.data.error);
      message = apiMsg || message;
    }
    sendFeedback(`訂單 #${order.id} 更新失敗：${message}`);
    throw new Error(message);
  }
}

module.exports = {
  showOrderNotification,
  handleOrderAction,
  CAN_UPDATE
};
