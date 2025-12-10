const ordersEl = document.getElementById('orders');
const toastEl = document.getElementById('toast');
const statusEl = document.getElementById('status');
const autoLaunchEl = document.getElementById('autoLaunchToggle');
const state = { items: [], canUpdate: false, status: { state: 'idle' } };

function render() {
  ordersEl.innerHTML = '';
  if (!state.items.length) {
    const empty = document.createElement('div');
    empty.textContent = '目前沒有訂單。';
    empty.style.color = '#666';
    ordersEl.appendChild(empty);
  }
  state.items.slice(0, 20).forEach((order) => {
    const card = document.createElement('div');
    card.className = 'card';
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div>#${order.id} - ${order.status}</div><div>${order.total} ${order.currency}</div>`;
    if (state.canUpdate) {
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
    } else {
      card.appendChild(row);
    }
    ordersEl.appendChild(card);
  });
}

function update(order, status) {
  window.wooNotify.updateOrder(order.id, status)
    .then(() => window.wooNotify.refreshOrders().catch(() => {}))
    .catch((err) => {
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
  const existingIdx = state.items.findIndex((o) => o.id === order.id);
  if (existingIdx >= 0) {
    state.items.splice(existingIdx, 1);
  }
  state.items.unshift(order);
  render();
});

window.wooNotify.onOrders((orders) => {
  state.items = orders || [];
  render();
});

window.wooNotify.onStatus((st) => {
  state.status = st || { state: 'idle' };
  renderStatus();
});

window.wooNotify.onToast((msg) => showToast(msg));

async function initAutoLaunchToggle() {
  if (!autoLaunchEl) return;
  try {
    const enabled = await window.wooNotify.getAutoLaunch();
    autoLaunchEl.checked = enabled;
  } catch (_) {}

  autoLaunchEl.addEventListener('change', async (e) => {
    const target = e.target;
    try {
      await window.wooNotify.setAutoLaunch(target.checked);
      showToast(target.checked ? '已設定開機自動啟動' : '已關閉開機自動啟動');
    } catch (err) {
      showToast('設定失敗：' + (err.message || 'unknown'));
      target.checked = !target.checked;
    }
  });
}

initAutoLaunchToggle();

async function initCapabilities() {
  try {
    const caps = await window.wooNotify.getCapabilities();
    state.canUpdate = Boolean(caps && caps.canUpdateOrders);
  } catch (_) {
    state.canUpdate = false;
  }
  render();
}

initCapabilities();

function renderStatus() {
  if (!statusEl) return;
  const st = state.status || {};
  const ts = st.ts ? new Date(st.ts) : null;
  const timeText = ts ? ts.toLocaleTimeString() : '';
  let text = '狀態：待機';
  if (st.state === 'fetching') text = '狀態：讀取中...';
  if (st.state === 'ok') text = `狀態：連線正常（${st.count || 0} 筆），時間 ${timeText}`;
  if (st.state === 'error') text = `狀態：錯誤 - ${st.message || '未知'} (${timeText})`;
  if (st.state === 'idle' && st.window === 'off') {
    text = `狀態：休眠中（輪詢時段 ${process.env.POLL_START_HOUR || 7}:00 - ${process.env.POLL_END_HOUR || 22}:00）`;
  }
  statusEl.textContent = text;
}

renderStatus();
