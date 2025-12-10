const { Notification, shell } = require('electron');

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
  // 若未來需要實作更新，可在此呼叫後端 API。
  const message = '更新 API 未實作';
  sendFeedback(message);
  throw new Error(message);
}

module.exports = {
  showOrderNotification,
  handleOrderAction,
  CAN_UPDATE
};
