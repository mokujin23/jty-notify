# Win11 訂單通知工具

桌面 Electron 應用，週期性向外部網址讀取訂單資料並在 Windows 11 發送通知。資料來源由獨立專案（如 `jty-notify-content` 部署於 Vercel）提供 JSON。

## 安裝
1. **設定資料來源**
   - 將 `.env.example` 複製為 `.env`，填入 `ORDER_SOURCE_URL`（必填，指向 Vercel 上的訂單 JSON 端點）。
   - 如需從桌面端更新訂單狀態，填入 `ORDER_UPDATE_URL`（POST JSON：`{ id, status }`）。
   - 輪詢預設每分鐘一次，僅在 7:00~22:00 間執行，可用 `POLL_INTERVAL_MS`、`POLL_START_HOUR`、`POLL_END_HOUR` 覆寫。
2. 安裝依賴：`npm install`
3. 啟動：`npm start`
4. Windows 會自動將應用加入「開機自動啟動」（AutoLaunch）。UI 內亦可勾選開關。

## 功能
- 依 `POLL_INTERVAL_MS`（預設 30 秒）向 `ORDER_SOURCE_URL` 取回訂單陣列，對新出現的訂單發送 Toast。
- 輪詢僅在設定時段內執行（預設 07:00-22:00），休眠時顯示狀態提示。
- 點擊通知可開啟訂單的 `url/link`（若來源提供）。
- 若設定 `ORDER_UPDATE_URL`，可在通知/列表按鈕直接更新訂單狀態（POST `{ id, status }`）。

## 檔案
- `index.js`：Electron 主行程、托盤、IPC。
- `poller.js`：輪詢與去重。
- `notifier.js`：系統通知與訂單狀態更新呼叫。
- `lib/order-source.js`：由外部網址抓取訂單。
- `renderer/`：視窗 UI（顯示最新訂單、開機自啟動控制）。

## 待辦
- 增加 webhook/push 模式，降低輪詢延遲。
