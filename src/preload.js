const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadModelFiles: () => ipcRenderer.invoke('load-model-files'),
  loadClasses: () => ipcRenderer.invoke('load-classes'),
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  exportEvents: (options) => ipcRenderer.invoke('export-events', options),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  getPlatform: () => process.platform,
  onTrayAction: (callback) => {
    ipcRenderer.on('tray-action', (_event, action) => callback(action));
  }
});
