require('dotenv').config();
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const AutoLaunch = require('auto-launch');
const Store = require('electron-store');
const { OrderPoller } = require('./poller');
const { showOrderNotification, handleOrderAction, CAN_UPDATE } = require('./notifier');
const { ORDER_SOURCE_URL } = require('./lib/order-source');

const store = new Store({ name: 'settings' });
let mainWindow;
let tray;
let autoLauncher;
let poller;

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

function resolveTrayIcon() {
  if (process.platform !== 'win32') return undefined;
  const candidates = [
    path.join(__dirname, 'Babasse-Old-School-Old-Messenger.ico'),
    path.join(__dirname, 'renderer', 'Babasse-Old-School-Old-Messenger.ico'),
    path.join(__dirname, 'renderer', 'icon.ico'),
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(process.resourcesPath || '', 'renderer', 'icon.ico')
  ];
  return candidates.find((p) => p && fs.existsSync(p));
}

function createTray() {
  const iconPath = resolveTrayIcon();
  if (!iconPath) {
    console.warn('[tray] icon not found, skipping tray creation');
    return;
  }
  try {
    tray = new Tray(iconPath);
  } catch (err) {
    console.warn('[tray] 建立托盤失敗', err);
    return;
  }
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

const ENV_PATH = path.join(__dirname, '.env');

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return null;
  try {
    const parsed = dotenv.parse(fs.readFileSync(ENV_PATH));
    return {
      ORDER_SOURCE_URL: parsed.ORDER_SOURCE_URL,
      ORDER_UPDATE_URL: parsed.ORDER_UPDATE_URL
    };
  } catch (err) {
    console.warn('[dotenv] 讀取 .env 失敗', err);
    return null;
  }
}

async function ensureSourceUrl() {
  if (process.env.ORDER_SOURCE_URL || process.env.CONTENT_URL) return true;

  while (true) {
    const fileCreds = readEnvFile();
    if (fileCreds && fileCreds.ORDER_SOURCE_URL) {
      process.env.ORDER_SOURCE_URL = fileCreds.ORDER_SOURCE_URL;
      if (fileCreds.ORDER_UPDATE_URL) {
        process.env.ORDER_UPDATE_URL = fileCreds.ORDER_UPDATE_URL;
      }
      return true;
    }

    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['重試', '離開'],
      defaultId: 0,
      cancelId: 1,
      title: '設定缺失',
      message: '尚未找到訂單來源網址',
      detail: `請在以下路徑放置 .env，填入 ORDER_SOURCE_URL（必要）與 ORDER_UPDATE_URL（選填）：\n${ENV_PATH}\n放好後按「重試」。`
    });
    if (response !== 0) {
      return false;
    }
  }
}

app.whenReady().then(async () => {
  const ready = await ensureSourceUrl();
  if (!ready) {
    app.quit();
    return;
  }
  await initAutoLaunch();
  createWindow();
  createTray();

  poller = new OrderPoller(
    (order) => {
      showOrderNotification(order, (targetOrder, nextStatus) => {
        handleOrderAction(targetOrder, nextStatus, (msg) => {
          if (mainWindow) mainWindow.webContents.send('toast', msg);
        }).catch(() => {});
      });
      if (mainWindow) {
        mainWindow.webContents.send('order:new', order);
      }
    },
    (status) => {
      if (mainWindow) mainWindow.webContents.send('status:update', status);
    },
    (orders) => {
      if (mainWindow) mainWindow.webContents.send('orders:snapshot', orders);
    }
  );
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

  ipcMain.handle('app:capabilities', async () => ({
    canUpdateOrders: CAN_UPDATE
  }));

  ipcMain.handle('orders:refresh', async () => {
    if (poller) await poller.refresh();
    return true;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
