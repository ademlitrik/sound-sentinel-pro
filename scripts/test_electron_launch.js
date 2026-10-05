const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Verify electron startup and page loading
app.whenReady().then(async () => {
  console.log('Electron app ready. Creating test window...');
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Attach IPC mock if needed
  const modelDir = path.join(__dirname, '..', 'model');
  ipcMain.handle('load-model-files', async () => {
    const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8'));
    const weightBuffers = modelJson.weightsManifest.flatMap(g => g.paths).map(p => fs.readFileSync(path.join(modelDir, p)));
    return { modelJson, weightBuffers };
  });

  ipcMain.handle('load-classes', async () => {
    return JSON.parse(fs.readFileSync(path.join(modelDir, 'classes.json'), 'utf8'));
  });

  win.webContents.on('did-finish-load', () => {
    console.log('✓ HTML & assets loaded successfully in Electron Chromium window!');
    setTimeout(() => {
      console.log('✓ Electron launch check passed.');
      app.quit();
    }, 1200);
  });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('❌ Failed to load page:', code, desc);
    process.exit(1);
  });

  win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
});
