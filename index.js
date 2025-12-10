require('dotenv').config();
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const keytar = require('keytar');
const AutoLaunch = require('auto-launch');
const Store = require('electron-store');
const { OrderPoller } = require('./poller');
const { showOrderNotification, handleOrderAction } = require('./notifier');

const store = new Store({ name: 'settings' });
let mainWindow;
let tray;
let autoLauncher;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js')
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function createTray() {
  tray = new Tray(process.platform === 'win32'
    ? path.join(__dirname, 'renderer', 'icon.ico')
    : undefined);
  const contextMenu = Menu.buildFromTemplate([
    { label: '開啟窗口', click: () => mainWindow && mainWindow.show() },
    { label: '退出', click: () => app.quit() }
  ]);
  tray.setToolTip('Woo 訂單通知');
  tray.setContextMenu(contextMenu);
}

function ensureAutoLaunchInstance() {
  if (process.platform !== 'win32') return null;
  if (!autoLauncher) {
    autoLauncher = new AutoLaunch({
      name: 'jty-notify',
      path: process.execPath,
      isHidden: true
    });
  }
  return autoLauncher;
}

async function setAutoLaunch(enabled) {
  if (process.platform !== 'win32') {
    store.set('autoLaunch', enabled);
    return enabled;
  }
  const launcher = ensureAutoLaunchInstance();
  try {
    if (enabled) {
      await launcher.enable();
    } else {
      await launcher.disable();
    }
    store.set('autoLaunch', enabled);
    return enabled;
  } catch (err) {
    console.warn('[autolaunch] 設定失敗', err);
    throw err;
  }
}

async function initAutoLaunch() {
  const desired = store.get('autoLaunch', true);
  await setAutoLaunch(desired);
  return desired;
}

const CRED_SERVICE = 'jty-notify';
const CRED_ACCOUNT = 'woocommerce';
const ENV_PATH = path.join(__dirname, '.env');

function extractCreds(source) {
  const url = source.WOOCOMMERCE_URL;
  const consumerKey = source.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = source.WOOCOMMERCE_CONSUMER_SECRET;
  if (url && consumerKey && consumerSecret) {
    return { url, consumerKey, consumerSecret };
  }
  return null;
}

async function loadFromKeytar() {
  if (process.platform !== 'win32') return null;
  try {
    const data = await keytar.getPassword(CRED_SERVICE, CRED_ACCOUNT);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('[keytar] 讀取失敗', err);
    return null;
  }
}

async function saveToKeytar(creds) {
  if (process.platform !== 'win32') return;
  try {
    await keytar.setPassword(CRED_SERVICE, CRED_ACCOUNT, JSON.stringify(creds));
  } catch (err) {
    console.warn('[keytar] 寫入失敗', err);
  }
}

function applyCreds(creds) {
  process.env.WOOCOMMERCE_URL = creds.url;
  process.env.WOOCOMMERCE_CONSUMER_KEY = creds.consumerKey;
  process.env.WOOCOMMERCE_CONSUMER_SECRET = creds.consumerSecret;
}

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return null;
  try {
    const parsed = dotenv.parse(fs.readFileSync(ENV_PATH));
    return extractCreds({
      WOOCOMMERCE_URL: parsed.WOOCOMMERCE_URL,
      WOOCOMMERCE_CONSUMER_KEY: parsed.WOOCOMMERCE_CONSUMER_KEY,
      WOOCOMMERCE_CONSUMER_SECRET: parsed.WOOCOMMERCE_CONSUMER_SECRET
    });
  } catch (err) {
    console.warn('[dotenv] 讀取 .env 失敗', err);
    return null;
  }
}

async function ensureCredentials() {
  const envCreds = extractCreds(process.env);
  if (envCreds) return true;

  const stored = await loadFromKeytar();
  if (stored) {
    applyCreds(stored);
    return true;
  }

  while (true) {
    const fileCreds = readEnvFile();
    if (fileCreds) {
      applyCreds(fileCreds);
      await saveToKeytar(fileCreds);
      try {
        fs.unlinkSync(ENV_PATH);
      } catch (err) {
        console.warn('[cleanup] 移除 .env 失敗', err);
      }
      return true;
    }

    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['重試', '離開'],
      defaultId: 0,
      cancelId: 1,
      title: '設定缺失',
      message: '尚未找到 WooCommerce 憑證',
      detail: `請在以下路徑放置 .env，填入 WOOCOMMERCE_URL / WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET：\n${ENV_PATH}\n放好後按「重試」。`
    });
    if (response !== 0) {
      return false;
    }
  }
}

app.whenReady().then(async () => {
  const ready = await ensureCredentials();
  if (!ready) {
    app.quit();
    return;
  }
  await initAutoLaunch();
  createWindow();
  createTray();

  const poller = new OrderPoller((order) => {
    showOrderNotification(order, (targetOrder, nextStatus) => {
      handleOrderAction(targetOrder, nextStatus, (msg) => {
        if (mainWindow) mainWindow.webContents.send('toast', msg);
      }).catch(() => {});
    });
    if (mainWindow) {
      mainWindow.webContents.send('order:new', order);
    }
  });
  poller.start();

  ipcMain.handle('order:update', async (_event, orderId, status) => {
    return handleOrderAction({ id: orderId }, status, (msg) => {
      if (mainWindow) mainWindow.webContents.send('toast', msg);
    });
  });

  ipcMain.handle('autolaunch:get', async () => {
    if (process.platform !== 'win32') return false;
    const launcher = ensureAutoLaunchInstance();
    try {
      const isEnabled = await launcher.isEnabled();
      store.set('autoLaunch', isEnabled);
      return isEnabled;
    } catch (err) {
      return store.get('autoLaunch', false);
    }
  });

  ipcMain.handle('autolaunch:set', async (_event, enabled) => {
    await setAutoLaunch(Boolean(enabled));
    return enabled;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
