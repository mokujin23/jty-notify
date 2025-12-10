# Win11 WooCommerce 桌面訂單通知與狀態更新計劃

## 目標
- 在 Windows 11 桌面提供 WooCommerce 訂單即時/準即時通知，點擊通知即可開啟訂單詳情窗。
- 允許從桌面 UI 對單筆訂單執行「完成 completed」與「取消 cancelled」狀態更新，並回寫 WooCommerce。
- 重用 `/home/mu/git/jty/jty-vercel-shop` 內的 WooCommerce API 客戶端與型別（`lib/woocommerce.ts`, `types/woocommerce.ts`），降低重工。

## 技術選型（建議）
- **App 容器**：Electron（Node + Chromium），原因：可直接沿用現有 TS/JS Woo API 客戶端，並使用 Web Notification / `electron-windows-notifications` 發送 Windows Toast；另可做背景 Tray App。
- **通知與動作**：Windows Toast Action + 深連結 (`myapp://order/123`) 回到 Electron window；或在通知上直接給兩個按鈕（完成/取消）。
- **資料存放**：本機 `config.json`（僅存 Woo URL、consumer key/secret）；敏感值可後續改存 Windows Credential Manager。
- **背景同步策略**：短期用輪詢（預設 30s，帶 `status=pending&orderby=modified&order=desc&modified_after=`），中期可加入雲端 webhook relay（Azure Function / Cloudflare Worker）將 Woo webhook 轉發至本機 WebSocket。

## 架構與模組
- `main process`：負責背景輪詢、與 Woo API 溝通、托盤菜單、通知發送。
- `renderer (React/Preact)`：顯示訂單列表、詳情、狀態切換按鈕；使用 IPC 呼叫 main 完成/取消。
- `woo client`：直接從 `jty-vercel-shop/lib/woocommerce.ts` 複製/抽出為 npm workdir 模組；新增 `updateOrderStatus(orderId, status)`。
- `config`：讀寫本機設定（Woo URL、金鑰、輪詢間隔、開機自啟 flag）。
- `logging`：write 到 `%LOCALAPPDATA%/jty-notify/logs/app.log`，方便支援。

## 核心流程
1. **啟動**：讀取設定 → 驗證環境變數/金鑰 → 進入托盤模式並開始輪詢。
2. **抓取新訂單**：使用 `wooApi.getOrders({ status: ['pending','processing'], modified_after: lastChecked })`（需在客戶端擴充 getOrders 支援查詢條件）。
3. **發送通知**：對每筆未通知過的訂單建立 Toast；通知附帶 `orderId` 與 action：`完成`、`取消`、`查看詳情`。
4. **狀態更新**：按鈕觸發 IPC → main 呼叫 `wooApi.updateOrderStatus(orderId, 'completed'|'cancelled')`（實際為 `PUT /orders/{id}` payload `{ status: 'completed' }`）。
5. **結果回饋**：操作成功/失敗彈出二次通知並在 UI 中更新列表；失敗時記錄錯誤並提供「重試」。

## 與 jty-vercel-shop 的整合點
- **重用檔案**：`lib/woocommerce.ts`、`types/woocommerce.ts`。需：
  - 增加 `getOrders(params)` 與 `updateOrderStatus(orderId, status)`；保持相同錯誤處理。
  - 環境變數沿用：`WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`。
- **共用封裝**：可將上述檔案抽成 workspace 共用套件（例如 packages/woo-client），避免雙邊分叉。

## 迭代計畫
- **M1 原型 (1~2 天)**：Electron 背景輪詢 + 系統通知（僅顯示文字，無按鈕）；硬編碼 Woo 憑證於 .env.local。
- **M2 互動 (2~3 天)**：通知上加入「完成/取消」動作；加入小視窗顯示訂單明細；錯誤提示。
- **M3 強化 (2 天)**：設定頁（輪詢間隔/開機自啟/憑證輸入）；本機憑證加密儲存；日志檔。
- **M4 Webhook 模式 (可選)**：雲端 webhook relay + 本機 WebSocket，降低輪詢延遲與 API 壓力。

## 測試與驗收
- **單元**：woo client 方法（getOrders/updateOrderStatus）mock axios；設定存取；輪詢節點的去重邏輯。
- **整合**：假 Woo API（msw/Mock Service Worker 或 Nock）模擬 pending → completed/ cancelled 流程。
- **手動驗收**：在測試店面建立訂單 → 30s 內收到通知 → 點擊完成 → Woo 後台狀態更新成功；同理取消。

## 風險與待決策
- Windows Toast 行為在未註冊 AUMID 時可能受限；需在安裝時註冊 AppID。
- 輪詢頻率過高會增加 Woo API 壓力與 rate limit；需可調整並加入退避。
- 如果不開放外網，本機無法直接收 Woo webhook；需評估雲端 relay 成本與延遲。

## 後續任務清單
- [ ] 新增 `packages/woo-client` 並從 `jty-vercel-shop` 匯入客戶端與型別。
- [ ] 在 `jty-notify` 初始化 Electron 專案（CommonJS, 2 空格縮排）。
- [ ] 實作輪詢 + 去重 + 通知動作流程。
- [ ] 增加 `updateOrderStatus` API 端點封裝與錯誤提示。
- [ ] 撰寫 README：安裝、設定環境變數、開機自啟與手動驗收步驟。
