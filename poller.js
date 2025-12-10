const { wooApi } = require('./lib/woocommerce');

const DEFAULT_INTERVAL = Number(process.env.POLL_INTERVAL_MS || 30000);

class OrderPoller {
  constructor(notifyFn) {
    this.notifyFn = notifyFn;
    this.intervalId = null;
    this.lastChecked = null;
    this.seen = new Set();
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
      const params = this.lastChecked
        ? { modified_after: this.lastChecked.toISOString() }
        : undefined;
      const orders = await wooApi.getOrders(params);
      if (!Array.isArray(orders)) return;
      orders.forEach((order) => {
        if (!order || !order.id) return;
        if (this.seen.has(order.id)) return;
        this.seen.add(order.id);
        this.notifyFn(order);
      });
      this.lastChecked = new Date();
    } catch (error) {
      console.error('[poller] 無法抓取訂單', error.message);
    }
  }
}

module.exports = { OrderPoller };
