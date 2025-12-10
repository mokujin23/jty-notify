const { fetchOrders } = require('./lib/order-source');

const DEFAULT_INTERVAL = Number(process.env.POLL_INTERVAL_MS || 30000);

class OrderPoller {
  constructor(notifyFn) {
    this.notifyFn = notifyFn;
    this.intervalId = null;
    this.seen = new Set();
    this.initialized = false;
  }

  start() {
    if (this.intervalId) return;
    this.tick(); // immediate
    this.intervalId = setInterval(() => this.tick(), DEFAULT_INTERVAL);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async tick() {
    try {
      const orders = await fetchOrders();
      if (!Array.isArray(orders)) return;
      orders.forEach((order) => {
        if (!order || !order.id) return;
        if (this.seen.has(order.id)) return;
        this.seen.add(order.id);
        if (this.initialized) {
          this.notifyFn(order);
        }
      });
      this.initialized = true;
    } catch (error) {
      console.error('[poller] 無法抓取訂單', error.message);
    }
  }
}

module.exports = { OrderPoller };
