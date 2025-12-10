const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wooNotify', {
  onNewOrder: (cb) => ipcRenderer.on('order:new', (_event, order) => cb(order)),
  onToast: (cb) => ipcRenderer.on('toast', (_event, msg) => cb(msg)),
  updateOrder: (orderId, status) => ipcRenderer.invoke('order:update', orderId, status),
  getAutoLaunch: () => ipcRenderer.invoke('autolaunch:get'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled)
});
