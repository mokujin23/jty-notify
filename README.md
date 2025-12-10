# Win11 Woo 訂單通知工具

桌面 Electron 應用，輪詢 WooCommerce 訂單並在 Windows 11 發送通知，支援直接將訂單狀態改為 **completed** / **cancelled**。

## 安裝
1. **第一次啟動前準備憑證**
   - Windows：將 `.env.example` 複製為 `.env`，填入 `WOOCOMMERCE_URL`、`WOOCOMMERCE_CONSUMER_KEY`、`WOOCOMMERCE_CONSUMER_SECRET` 後放在專案根目錄。啟動時會自動讀取、寫入 Windows Credential Manager，並刪除 `.env`。
   - 若已經存在系統環境變數或已寫入 Credential Manager，則可跳過放置 `.env`。
2. 安裝依賴：`npm install`
3. 啟動：`npm start`
4. Windows 會自動將應用加入「開機自動啟動」（透過 AutoLaunch）。如需關閉，可手動移除工作排程或在程式碼中停用。

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




## 移轉到新 Win11 的完整步驟

  - 取得程式碼
      - 最簡單：把整個專案資料夾（含 windows-setup.bat、index.js 等）壓縮後拷到新機並解壓到任意目錄。
      - 或在新機 git clone <repo-url>。
  - 準備 WooCommerce 憑證
      - 依  .env.example 建一份  .env 放在專案根目錄，填入 WOOCOMMERCE_URL、WOOCOMMERCE_CONSUMER_KEY、
        WOOCOMMERCE_CONSUMER_SECRET（可含 POLL_INTERVAL_MS）。
      - 首次啟動會自動讀取 .env → 寫入 Windows Credential Manager → 刪除 .env，之後不必再放檔案。
  - 執行安裝與啟動
      - 在專案根目錄雙擊或 PowerShell 執行 windows-setup.bat。腳本會：
          1. 檢查/安裝 Node.js LTS（透過 winget）；
          2. 跑 npm install；
          3. 執行 npm start 啟動 Electron。
      - 若未裝 winget 或公司策略阻擋，先手動安裝 Node.js LTS (https://nodejs.org)，再在專案目錄跑 npm install、
        npm start。
  - 啟動流程提示
      - 若缺少憑證，程式會跳出對話框，指示在專案根放入 .env，按「重試」後會自動導入並刪除該檔。
      - 導入後的憑證存於 Credential Manager，後續啟動不需 .env。
  - 通知/權限
      - 確認 Windows「設定 → 系統 → 通知」已開啟，關閉「專注助理」以便收到訂單 Toast。
      - 若用公司網路需代理，先在系統或 npm 設定代理再跑 npm install。
  - 驗證
      - 首次啟動後應看到系統托盤圖示與主視窗；終端無錯誤即可。
      - 如需重設憑證，可在 Credential Manager 刪除 jty-notify / woocommerce 項目，再放入新的 .env 重新啟動。
