const { Notification, shell } = require('electron');
const { wooApi } = require('./lib/woocommerce');

function showOrderNotification(order, onAction) {
  const title = `新訂單 #${order.id} (${order.status})`;
  const body = order.billing && order.billing.first_name
    ? `${order.billing.first_name} - ${order.total} ${order.currency}`
    : `金額 ${order.total} ${order.currency}`;

  const notification = new Notification({
    title,
    body,
    silent: false,
    actions: [
      { type: 'button', text: '標記完成' },
      { type: 'button', text: '取消訂單' }
    ],
    closeButtonText: '忽略'
  });

  notification.on('action', async (_, index) => {
    if (index === 0) {
      onAction(order, 'completed');
    } else if (index === 1) {
      onAction(order, 'cancelled');
    }
  });

  notification.on('click', () => {
    if (order.id) {
      shell.openExternal(`${process.env.WOOCOMMERCE_URL}/wp-admin/post.php?post=${order.id}&action=edit`);
    }
  });

  notification.show();
}

async function handleOrderAction(order, status, sendFeedback) {
  try {
    const updated = await wooApi.updateOrderStatus(order.id, status);
    sendFeedback(`訂單 #${order.id} 已更新為 ${status}`);
    return updated;
  } catch (error) {
    sendFeedback(`訂單 #${order.id} 更新失敗：${error.message}`);
    throw error;
  }
}

module.exports = {
  showOrderNotification,
  handleOrderAction
};
