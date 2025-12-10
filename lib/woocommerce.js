// 此檔保留以避免舊代碼 require 失敗，但邏輯已移至 lib/order-source.js。
// 如需 WooCommerce API，請改用新模組或自行實作。
module.exports = {
  wooApi: {
    getOrders() {
      throw new Error('已改為外部網址提供訂單資料，請設定 ORDER_SOURCE_URL');
    },
    updateOrderStatus() {
      throw new Error('已改為外部網址提供訂單資料，未提供更新 API');
    }
  },
  formatPrice(price) {
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'NT$';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${symbol}${numPrice.toLocaleString('zh-TW')}`;
  }
};
