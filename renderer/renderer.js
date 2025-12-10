const ordersEl = document.getElementById('orders');
const toastEl = document.getElementById('toast');
const state = { items: [] };

function render() {
  ordersEl.innerHTML = '';
  state.items.slice(0, 20).forEach((order) => {
    const card = document.createElement('div');
    card.className = 'card';
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div>#${order.id} - ${order.status}</div><div>${order.total} ${order.currency}</div>`;
    const actions = document.createElement('div');
    const doneBtn = document.createElement('button');
    doneBtn.textContent = '完成';
    doneBtn.onclick = () => update(order, 'completed');
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => update(order, 'cancelled');
    actions.appendChild(doneBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(row);
    card.appendChild(actions);
    ordersEl.appendChild(card);
  });
}

function update(order, status) {
  window.wooNotify.updateOrder(order.id, status).catch((err) => {
    showToast(err.message || '更新失敗');
  });
}

function showToast(msg) {
  toastEl.textContent = msg;
  setTimeout(() => {
    toastEl.textContent = '';
  }, 4000);
}

window.wooNotify.onNewOrder((order) => {
  state.items.unshift(order);
  render();
});

window.wooNotify.onToast((msg) => showToast(msg));
