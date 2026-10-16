const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'marketing', 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const modelDir = path.join(__dirname, '..', 'model');

ipcMain.handle('load-model-files', async () => {
  const modelJsonPath = path.join(modelDir, 'model.json');
  const modelJsonRaw = fs.readFileSync(modelJsonPath, 'utf8');
  const modelJson = JSON.parse(modelJsonRaw);

  const manifest = modelJson.weightsManifest;
  const weightBuffers = [];
  for (const group of manifest) {
    for (const binFile of group.paths) {
      const binPath = path.join(modelDir, binFile);
      const buf = fs.readFileSync(binPath);
      weightBuffers.push(buf);
    }
  }

  return { modelJson, weightBuffers };
});

ipcMain.handle('load-classes', async () => {
  const classesPath = path.join(modelDir, 'classes.json');
  const raw = fs.readFileSync(classesPath, 'utf8');
  return JSON.parse(raw);
});

ipcMain.handle('show-notification', async () => true);
ipcMain.handle('minimize-to-tray', async () => true);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 940,
    show: false,
    frame: true,
    backgroundColor: '#06090f',
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
  await sleep(2500);

  // Setup rich state for Screenshot 1: Live Oscilloscope Waveform & Critical Alert
  await win.webContents.executeJavaScript(`
    (() => {
      // Stop the idle visualizer animation loop so our custom drawing stays frozen
      if (window.soundSentinelApp && window.soundSentinelApp.visualizer) {
        window.soundSentinelApp.visualizer.stop();
      }

      // Set status badge to armed
      const badge = document.getElementById('status-badge');
      if (badge) {
        badge.className = 'status-badge armed';
        document.getElementById('status-text').textContent = 'Sensor Armed - Real-Time Neural Surveillance';
      }

      const toggleBtn = document.getElementById('btn-toggle-listen');
      if (toggleBtn) {
        toggleBtn.classList.remove('btn-primary', 'btn-pulse');
        toggleBtn.classList.add('btn-danger');
        document.getElementById('toggle-btn-text').textContent = 'Disarm Sensor';
      }

      // Stats
      const statEvents = document.getElementById('stat-events');
      const statUptime = document.getElementById('stat-uptime');
      const statCluster = document.getElementById('stat-cluster');
      if (statEvents) statEvents.textContent = '6';
      if (statUptime) statUptime.textContent = '01:42:18';
      if (statCluster) statCluster.textContent = 'Perimeter / Life Safety';

      // Spotlight Card
      const nameEl = document.getElementById('top-class-name');
      const catEl = document.getElementById('top-class-category');
      const timeEl = document.getElementById('top-class-time');
      const barFill = document.querySelector('.confidence-fill');
      const confVal = document.getElementById('top-confidence-val');

      if (nameEl) nameEl.textContent = 'Smoke detector, smoke alarm (ISO T3)';
      if (catEl) {
        catEl.className = 'badge badge-critical';
        catEl.textContent = 'CRITICAL HAZARD';
      }
      if (timeEl) timeEl.textContent = 'Detection Timestamp: ' + new Date().toLocaleTimeString();
      if (barFill) {
        barFill.style.width = '98.5%';
        barFill.className = 'confidence-fill critical';
      }
      if (confVal) confVal.textContent = '98.5%';

      // Probabilities list
      const probList = document.getElementById('top-classes-list');
      if (probList) {
        probList.innerHTML = \`
          <div class="prob-row">
            <span class="prob-name">1. Smoke detector, smoke alarm</span>
            <div class="prob-bar-track"><div class="prob-bar-fill critical" style="width: 98.5%"></div></div>
            <span class="prob-val">98.5%</span>
          </div>
          <div class="prob-row">
            <span class="prob-name">2. Fire alarm siren</span>
            <div class="prob-bar-track"><div class="prob-bar-fill high" style="width: 82.0%"></div></div>
            <span class="prob-val">82.0%</span>
          </div>
          <div class="prob-row">
            <span class="prob-name">3. Buzzer / Electronic Beep</span>
            <div class="prob-bar-track"><div class="prob-bar-fill medium" style="width: 58.4%"></div></div>
            <span class="prob-val">58.4%</span>
          </div>
          <div class="prob-row">
            <span class="prob-name">4. Glass fracture / shatter</span>
            <div class="prob-bar-track"><div class="prob-bar-fill" style="width: 24.1%"></div></div>
            <span class="prob-val">24.1%</span>
          </div>
          <div class="prob-row">
            <span class="prob-name">5. Scream / High Distress Vocal</span>
            <div class="prob-bar-track"><div class="prob-bar-fill" style="width: 14.8%"></div></div>
            <span class="prob-val">14.8%</span>
          </div>
        \`;
      }

      // Incident event list
      const eventList = document.getElementById('event-list');
      if (eventList) {
        eventList.innerHTML = \`
          <div class="event-item critical">
            <div class="event-icon-col">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ff1744" stroke-width="2.5" fill="none"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="event-content">
              <div class="event-header-line">
                <span class="event-title">Smoke detector, smoke alarm</span>
                <span class="event-confidence">98.5%</span>
              </div>
              <div class="event-sub-line">
                <span class="event-badge badge-critical">CRITICAL</span>
                <span class="event-time">10:14:22 AM</span>
                <span class="event-id">EVT-9042</span>
              </div>
            </div>
          </div>

          <div class="event-item high">
            <div class="event-icon-col">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ff9100" stroke-width="2.5" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="event-content">
              <div class="event-header-line">
                <span class="event-title">Glass fracture / shatter</span>
                <span class="event-confidence">92.4%</span>
              </div>
              <div class="event-sub-line">
                <span class="event-badge badge-high">HIGH</span>
                <span class="event-time">10:11:05 AM</span>
                <span class="event-id">EVT-9041</span>
              </div>
            </div>
          </div>

          <div class="event-item medium">
            <div class="event-icon-col">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ffea00" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            <div class="event-content">
              <div class="event-header-line">
                <span class="event-title">Infant / Baby Crying</span>
                <span class="event-confidence">89.1%</span>
              </div>
              <div class="event-sub-line">
                <span class="event-badge badge-medium">MEDIUM</span>
                <span class="event-time">10:08:44 AM</span>
                <span class="event-id">EVT-9040</span>
              </div>
            </div>
          </div>

          <div class="event-item normal">
            <div class="event-icon-col">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#00e5ff" stroke-width="2" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div class="event-content">
              <div class="event-header-line">
                <span class="event-title">Door knock / tap</span>
                <span class="event-confidence">84.2%</span>
              </div>
              <div class="event-sub-line">
                <span class="event-badge badge-info">NORMAL</span>
                <span class="event-time">09:58:30 AM</span>
                <span class="event-id">EVT-9039</span>
              </div>
            </div>
          </div>
        \`;
      }

      // Draw active glowing neon Oscilloscope waveform on canvas
      const canvas = document.getElementById('visualizer-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        const w = rect.width;
        const h = rect.height;

        ctx.fillStyle = '#06090f';
        ctx.fillRect(0, 0, w, h);

        // Technical Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Center line
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

        // Neon Waveform
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const envelope = Math.sin((x / w) * Math.PI);
          const y = (h / 2) + 
            Math.sin(x * 0.045) * (h * 0.35) * envelope + 
            Math.sin(x * 0.14) * (h * 0.12) * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Decibel meter
      const meterFill = document.getElementById('level-meter-fill');
      const meterDb = document.getElementById('level-meter-db');
      if (meterFill) {
        meterFill.style.width = '74%';
        meterFill.style.background = 'linear-gradient(90deg, #00e5ff, #00e676 60%, #ffea00 80%, #ff1744 100%)';
      }
      if (meterDb) meterDb.textContent = '-14.6 dBFS (Signal Active)';
    })();
  `);

  await sleep(700);

  // Capture Screenshot 1: 01_main_telemetry_dashboard.png
  console.log('Capturing Screenshot 1: 01_main_telemetry_dashboard.png...');
  const img1 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '01_main_telemetry_dashboard.png'), img1.toPNG());

  // Capture Screenshot 2: Developer Credentials Modal
  console.log('Capturing Screenshot 2: 02_developer_credentials_modal.png...');
  await win.webContents.executeJavaScript(`
    (() => {
      const modal = document.getElementById('about-modal');
      if (modal) modal.style.display = 'flex';
    })();
  `);
  await sleep(600);
  const img2 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '02_developer_credentials_modal.png'), img2.toPNG());

  // Capture Screenshot 3: FFT Spectrogram Mode
  console.log('Capturing Screenshot 3: 03_fft_spectrogram_mode.png...');
  await win.webContents.executeJavaScript(`
    (() => {
      const modal = document.getElementById('about-modal');
      if (modal) modal.style.display = 'none';

      // Switch to FFT Spectrum
      document.getElementById('mode-waveform').classList.remove('active');
      document.getElementById('mode-spectrum').classList.add('active');

      const canvas = document.getElementById('visualizer-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        const w = rect.width;
        const h = rect.height;

        ctx.fillStyle = '#06090f';
        ctx.fillRect(0, 0, w, h);

        const numBars = 48;
        const barWidth = (w / numBars) - 2;

        for (let i = 0; i < numBars; i++) {
          let factor = 0.15 + Math.sin(i * 0.16) * 0.2;
          if (i >= 22 && i <= 32) {
            factor = 0.92 - Math.abs(27 - i) * 0.08;
          }
          factor = Math.max(0.08, Math.min(0.96, factor));

          const barHeight = factor * (h - 14);
          const x = i * (barWidth + 2);
          const y = h - barHeight;

          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, '#00e5ff');
          grad.addColorStop(0.5, '#3b82f6');
          grad.addColorStop(1, '#00e676');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Peak dot
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(0, y - 3), barWidth, 2);
        }
      }
    })();
  `);
  await sleep(600);
  const img3 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '03_fft_spectrogram_mode.png'), img3.toPNG());

  console.log('All 3 UI screenshots captured in high resolution!');
  app.quit();
});
