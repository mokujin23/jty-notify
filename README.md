# Win11 Woo 訂單通知工具

桌面 Electron 應用，輪詢 WooCommerce 訂單並在 Windows 11 發送通知，支援直接將訂單狀態改為 **completed** / **cancelled**。

## 安裝
1. **第一次啟動前準備憑證**
   - Windows：將 `.env.example` 複製為 `.env`，填入 `WOOCOMMERCE_URL`、`WOOCOMMERCE_CONSUMER_KEY`、`WOOCOMMERCE_CONSUMER_SECRET` 後放在專案根目錄。啟動時會自動讀取、寫入 Windows Credential Manager，並刪除 `.env`。
   - 若已經存在系統環境變數或已寫入 Credential Manager，則可跳過放置 `.env`。
2. 安裝依賴：`npm install`
3. 啟動：`npm start`

## 打包分發 (Windows exe)
1. 準備應用圖示 `build/icon.ico`（256x256 建議）。
2. 先安裝依賴：`npm install`
3. 執行：`npm run dist`
   - 產出在 `dist/` 下的 NSIS 安裝程式（預設可選路徑、非 one-click）。

## 功能
- 30 秒輪詢 `pending/processing` 訂單並發送 Toast。
- 通知按鈕或視窗操作可將訂單標記為完成/取消，並回寫 WooCommerce。
- 點擊通知可開啟 Woo 後台對應訂單頁。

## 檔案
- `index.js`：Electron 主行程、托盤、IPC。
- `poller.js`：輪詢與去重。
- `notifier.js`：系統通知與狀態更新呼叫。
- `lib/woocommerce.js`：WooCommerce REST 封裝（getOrders / updateOrderStatus）。
- `renderer/`：視窗 UI（顯示最新訂單、手動更新狀態）。

## 待辦
- 將 Woo 客戶端抽成共用套件，與 `jty-vercel-shop` 保持同步。
- 增加 webhook 模式，降低輪詢延遲。
- 將憑證儲存改為 Windows Credential Manager。
