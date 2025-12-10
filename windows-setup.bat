@echo off
setlocal
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [INFO] 檢查 .env...
if not exist ".env" (
  echo [WARN] 未找到 .env，請依 README.md 填入 WOOCOMMERCE_URL / WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET 後再執行。
)

echo [INFO] 檢查 Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [INFO] 嘗試以 winget 安裝 Node.js LTS，可能需系統管理員權限並確認安裝提示。
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  if %errorlevel% neq 0 (
    echo [ERROR] winget 安裝 Node.js 失敗，請手動安裝 https://nodejs.org/ 後重新執行本腳本。
    pause
    exit /b 1
  )
)

echo [INFO] 安裝 npm 依賴...
npm install
if %errorlevel% neq 0 (
  echo [ERROR] npm install 失敗，請檢查網路或代理設定後重試。
  pause
  exit /b 1
)

echo [INFO] 啟動應用程式...
npm start

endlocal
