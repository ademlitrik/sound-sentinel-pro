const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const iconPath = path.join(__dirname, 'assets', 'icon.png');
const modelDir = path.join(__dirname, '..', 'model');

function createWindow() {
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

  mainWindow = new BrowserWindow({
    width: 1260,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    title: 'Sound Sentinel Pro - Acoustic Security & Scientific Intelligence | Afro Vision Media',
    icon: icon,
    backgroundColor: '#06090f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Keep neural DSP audio processing active when minimized
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'Sound Sentinel Pro Running in Background',
          body: 'Acoustic surveillance and scientific monitoring remain active in your system tray.',
          icon: iconPath
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;
  if (!icon) return;

  tray = new Tray(icon);
  tray.setToolTip('Sound Sentinel Pro - Afro Vision Media (Tanyaradzwa Bvute)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Sound Sentinel Console',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Arm / Disarm Acoustic Sensor',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-action', 'toggle-monitoring');
        }
      }
    },
    {
      label: 'Flush Incident History',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-action', 'clear-history');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'System Info: Tanyaradzwa Bvute (Afro Vision Media)',
      enabled: false
    },
    {
      label: 'Quit Sound Sentinel',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// IPC Handlers
ipcMain.handle('load-model-files', async () => {
  const modelJsonPath = path.join(modelDir, 'model.json');
  if (!fs.existsSync(modelJsonPath)) {
    throw new Error('model.json not found in ' + modelDir);
  }
  const modelJsonRaw = fs.readFileSync(modelJsonPath, 'utf8');
  const modelJson = JSON.parse(modelJsonRaw);

  const manifest = modelJson.weightsManifest;
  const weightBuffers = [];
  for (const group of manifest) {
    for (const binFile of group.paths) {
      const binPath = path.join(modelDir, binFile);
      if (!fs.existsSync(binPath)) {
        throw new Error('Weight shard missing: ' + binFile);
      }
      const buf = fs.readFileSync(binPath);
      weightBuffers.push(buf);
    }
  }

  return { modelJson, weightBuffers };
});

ipcMain.handle('load-classes', async () => {
  const classesPath = path.join(modelDir, 'classes.json');
  if (!fs.existsSync(classesPath)) {
    throw new Error('classes.json not found in ' + modelDir);
  }
  const raw = fs.readFileSync(classesPath, 'utf8');
  return JSON.parse(raw);
});

ipcMain.handle('show-notification', async (_event, options) => {
  if (!Notification.isSupported()) return false;
  const notif = new Notification({
    title: options.title || '[SECURITY ALERT] Acoustic Anomaly Detected',
    body: options.body || 'Sound event classified above threshold',
    icon: iconPath,
    urgency: options.urgency || 'normal'
  });
  notif.show();
  notif.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  return true;
});

ipcMain.handle('minimize-to-tray', async () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  return true;
});

ipcMain.handle('export-events', async (_event, { data, format = 'csv' }) => {
  if (!mainWindow) return { cancelled: true };
  const dateStr = new Date().toISOString().slice(0, 10);
  const ext = format === 'json' ? 'json' : 'csv';

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Acoustic Security Telemetry Log',
    defaultPath: `Sound-Sentinel-Telemetry-${dateStr}.${ext}`,
    filters: [
      { name: format === 'json' ? 'JSON Telemetry File' : 'CSV Report File', extensions: [ext] }
    ]
  });

  if (canceled || !filePath) return { cancelled: true };

  fs.writeFileSync(filePath, data, 'utf8');
  return { cancelled: false, filePath };
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
