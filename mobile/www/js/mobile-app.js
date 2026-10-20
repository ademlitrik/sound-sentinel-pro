/**
 * Sound Sentinel Mobile - Main Controller
 * Developed by Tanyaradzwa Bvute | Afro Vision Media PTY (Ltd)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const app = new SoundSentinelMobileApp();
  await app.init();
});

class SoundSentinelMobileApp {
  constructor() {
    this.currentMode = 'sensor'; // 'sensor' or 'companion'
    this.isArmed = false;
    this.wakeLock = null;

    this.audioEngine = null;
    this.classifier = null;
    this.dispatcher = null;

    this.nodeName = localStorage.getItem('ss_node_name') || 'Mobile-Node-01';
    this.threshold = parseFloat(localStorage.getItem('ss_threshold') || '0.35');
    this.noiseFloor = 0.005; // RMS threshold

    this.events = [];
    this.activeCategories = new Set([
      'Emergency & Safety',
      'Baby & Care',
      'Security & Access',
      'Pets & Animals',
      'Domestic & Kitchen',
      'People & Voice',
      'Tools & Impacts'
    ]);

    // DOM Caches
    this.dom = {};
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    this.initSettingsValues();
    this.updateStatus('Initializing Edge Neural DSP...', 'loading');

    this.dispatcher = new MobileDispatcher();
    this.classifier = new MobileClassifier();

    try {
      await this.classifier.init((msg) => {
        this.updateStatus(msg, 'loading');
      });
      this.updateStatus('Edge AI Ready • Tap "Arm Sensor" to start', 'ready');
      this.initAudioEngine();
    } catch (err) {
      console.error('Initialization error:', err);
      this.updateStatus('Init Error: ' + err.message, 'error');
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((e) => console.log('SW registration:', e));
    }
  }

  cacheDom() {
    this.dom = {
      // Header
      statusPill: document.getElementById('status-pill'),
      statusText: document.getElementById('status-text'),
      btnSettings: document.getElementById('btn-settings'),
      // Tabs
      tabSensor: document.getElementById('tab-sensor'),
      tabCompanion: document.getElementById('tab-companion'),
      viewSensor: document.getElementById('view-sensor'),
      viewCompanion: document.getElementById('view-companion'),
      // Sensor Mode
      nodeNameDisplay: document.getElementById('node-name-display'),
      dbValue: document.getElementById('db-value'),
      dbMeterBar: document.getElementById('db-meter-bar'),
      btnArm: document.getElementById('btn-arm'),
      armText: document.getElementById('arm-text'),
      topClassIcon: document.getElementById('top-class-icon'),
      topClassName: document.getElementById('top-class-name'),
      topClassCategory: document.getElementById('top-class-category'),
      topClassScore: document.getElementById('top-class-score'),
      // Timeline & events
      eventList: document.getElementById('event-list'),
      emptyState: document.getElementById('empty-state'),
      eventCountBadge: document.getElementById('event-count-badge'),
      btnClearEvents: document.getElementById('btn-clear-events'),
      btnExportCsv: document.getElementById('btn-export-csv'),
      // Companion Mode
      panicBtn: document.getElementById('panic-btn'),
      quickWhatsappBtn: document.getElementById('quick-whatsapp-btn'),
      // Settings Modal
      modalSettings: document.getElementById('modal-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      inputNodeName: document.getElementById('input-node-name'),
      inputWebhook: document.getElementById('input-webhook'),
      inputTgToken: document.getElementById('input-tg-token'),
      inputTgChat: document.getElementById('input-tg-chat'),
      inputWhatsapp: document.getElementById('input-whatsapp'),
      sliderSens: document.getElementById('slider-sens'),
      valSens: document.getElementById('val-sens'),
      toggleSound: document.getElementById('toggle-sound'),
      toggleVibrate: document.getElementById('toggle-vibrate'),
      btnSaveSettings: document.getElementById('btn-save-settings')
    };
  }

  bindEvents() {
    // Mode Switcher Tabs
    this.dom.tabSensor.addEventListener('click', () => this.switchMode('sensor'));
    this.dom.tabCompanion.addEventListener('click', () => this.switchMode('companion'));

    // Arm Sensor Button
    this.dom.btnArm.addEventListener('click', () => this.toggleArm());

    // Settings Modal
    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.modalSettings.classList.add('active');
    });
    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.modalSettings.classList.remove('active');
    });
    this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());

    this.dom.sliderSens.addEventListener('input', (e) => {
      this.dom.valSens.textContent = `${e.target.value}%`;
    });

    // Clear and Export Events
    this.dom.btnClearEvents.addEventListener('click', () => this.clearEvents());
    this.dom.btnExportCsv.addEventListener('click', () => this.exportCsv());

    // Panic Button in Companion Mode
    this.dom.panicBtn.addEventListener('click', () => this.triggerPanicAlarm());

    // Quick WhatsApp dispatch
    this.dom.quickWhatsappBtn.addEventListener('click', () => {
      const waNumber = localStorage.getItem('ss_whatsapp_number') || '2782516591';
      const cleanNumber = waNumber.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanNumber}?text=EMERGENCY%20ALERT:%20Sound%20Sentinel%20Security%20Assistance%20Requested!`;
      window.open(url, '_blank');
    });
  }

  initSettingsValues() {
    this.dom.inputNodeName.value = this.nodeName;
    this.dom.nodeNameDisplay.textContent = this.nodeName;
    this.dom.inputWebhook.value = localStorage.getItem('ss_webhook_url') || '';
    this.dom.inputTgToken.value = localStorage.getItem('ss_telegram_token') || '';
    this.dom.inputTgChat.value = localStorage.getItem('ss_telegram_chat_id') || '';
    this.dom.inputWhatsapp.value = localStorage.getItem('ss_whatsapp_number') || '';
    this.dom.sliderSens.value = Math.round(this.threshold * 100);
    this.dom.valSens.textContent = `${Math.round(this.threshold * 100)}%`;
    this.dom.toggleSound.checked = localStorage.getItem('ss_sound_alerts') !== 'false';
    this.dom.toggleVibrate.checked = localStorage.getItem('ss_haptics_enabled') !== 'false';
  }

  saveSettings() {
    this.nodeName = this.dom.inputNodeName.value.trim() || 'Mobile-Node-01';
    localStorage.setItem('ss_node_name', this.nodeName);
    this.dom.nodeNameDisplay.textContent = this.nodeName;

    const sensVal = parseInt(this.dom.sliderSens.value, 10);
    this.threshold = sensVal / 100;
    localStorage.setItem('ss_threshold', this.threshold.toString());

    this.dispatcher.saveConfig({
      webhookUrl: this.dom.inputWebhook.value,
      telegramToken: this.dom.inputTgToken.value,
      telegramChatId: this.dom.inputTgChat.value,
      whatsappNumber: this.dom.inputWhatsapp.value,
      soundAlertsEnabled: this.dom.toggleSound.checked,
      hapticsEnabled: this.dom.toggleVibrate.checked
    });

    this.dom.modalSettings.classList.remove('active');
  }

  switchMode(mode) {
    this.currentMode = mode;
    if (mode === 'sensor') {
      this.dom.tabSensor.classList.add('active');
      this.dom.tabCompanion.classList.remove('active');
      this.dom.viewSensor.classList.add('active');
      this.dom.viewCompanion.classList.remove('active');
    } else {
      this.dom.tabCompanion.classList.add('active');
      this.dom.tabSensor.classList.remove('active');
      this.dom.viewCompanion.classList.add('active');
      this.dom.viewSensor.classList.remove('active');
    }
  }

  initAudioEngine() {
    this.audioEngine = new MobileAudioEngine({
      onAudioLevel: (rms, db) => {
        if (!this.isArmed) return;
        const clampedDb = Math.max(-60, Math.min(0, Math.round(db)));
        this.dom.dbValue.textContent = `${clampedDb} dB`;
        const percent = Math.min(100, Math.max(0, ((clampedDb + 60) / 60) * 100));
        this.dom.dbMeterBar.style.width = `${percent}%`;
      },
      onAudioWindow: async (samples, rms, db) => {
        if (!this.isArmed) return;
        // Battery saving noise gate: if room is silent, skip neural inference
        if (rms < this.noiseFloor) return;

        try {
          const results = this.classifier.classify(samples, this.threshold, this.activeCategories);
          if (results && results.length > 0) {
            this.handleDetection(results[0]);
          }
        } catch (e) {
          console.error('Inference error:', e);
        }
      },
      onError: (err) => {
        console.error('Audio engine error:', err);
        this.updateStatus('Mic Error: ' + err.message, 'error');
        this.disarm();
      }
    });
  }

  async toggleArm() {
    if (this.isArmed) {
      await this.disarm();
    } else {
      await this.arm();
    }
  }

  async arm() {
    try {
      this.updateStatus('Requesting Microphone Access...', 'loading');
      await this.audioEngine.start();
      this.isArmed = true;

      // Acquire Screen Wake Lock to prevent phone sleeping while monitoring
      this.acquireWakeLock();

      this.dom.btnArm.classList.add('armed');
      this.dom.armText.textContent = 'DISARM SENSOR';
      this.updateStatus(`ARMED • Listening on ${this.nodeName}`, 'armed');
    } catch (err) {
      this.updateStatus('Microphone Denied / Error', 'error');
      alert('Microphone permission required for sound monitoring. Please allow microphone access in your browser or app settings.');
    }
  }

  async disarm() {
    this.isArmed = false;
    if (this.audioEngine) {
      this.audioEngine.stop();
    }
    this.releaseWakeLock();

    this.dom.btnArm.classList.remove('armed');
    this.dom.armText.textContent = 'ARM SENSOR POD';
    this.dom.dbValue.textContent = '-60 dB';
    this.dom.dbMeterBar.style.width = '0%';
    this.updateStatus('Sensor Disarmed • Standby', 'ready');
  }

  async acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock not granted:', err);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  getCategorySvg(category, alertLevel) {
    if (alertLevel === 'critical' || category === 'Emergency & Safety') {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }
    if (category === 'Security & Access') {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    }
    if (category === 'Baby & Care') {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
    }
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e88504" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4"/></svg>`;
  }

  handleDetection(item) {
    // Update Top Spotlight Card
    if (this.dom.topClassIcon) {
      this.dom.topClassIcon.innerHTML = this.getCategorySvg(item.category, item.alertLevel);
    }
    this.dom.topClassName.textContent = item.name;
    this.dom.topClassCategory.textContent = item.category;
    this.dom.topClassScore.textContent = `${(item.confidence * 100).toFixed(0)}% Match`;

    // Add to event timeline
    const eventRecord = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      time: new Date(),
      item: item,
      node: this.nodeName
    };

    this.events.unshift(eventRecord);
    if (this.events.length > 100) this.events.pop();

    this.renderEvents();

    // Trigger Cloud Webhook, WhatsApp, Telegram, Haptic & Siren
    this.dispatcher.dispatch(item, this.nodeName);
  }

  renderEvents() {
    if (this.events.length === 0) {
      this.dom.emptyState.style.display = 'block';
      this.dom.eventList.innerHTML = '';
      this.dom.eventCountBadge.textContent = '0';
      return;
    }

    this.dom.emptyState.style.display = 'none';
    this.dom.eventCountBadge.textContent = this.events.length;

    this.dom.eventList.innerHTML = this.events
      .slice(0, 30)
      .map((ev) => {
        const timeStr = ev.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const waUrl = this.dispatcher.getWhatsAppShareUrl(ev.item, ev.node);
        const alertClass = ev.item.alertLevel === 'critical' ? 'critical' : ev.item.alertLevel === 'high' ? 'high' : 'normal';
        const iconSvg = this.getCategorySvg(ev.item.category, ev.item.alertLevel);

        return `
        <div class="event-card ${alertClass}">
          <div class="event-left">
            <span class="event-emoji" style="display:flex; align-items:center; justify-content:center;">${iconSvg}</span>
            <div class="event-details">
              <div class="event-name">${ev.item.name}</div>
              <div class="event-meta">${timeStr} &bull; ${ev.item.category}</div>
            </div>
          </div>
          <div class="event-right">
            <span class="event-score">${(ev.item.confidence * 100).toFixed(0)}%</span>
            <a href="${waUrl}" target="_blank" class="event-wa-btn" title="Send WhatsApp Alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            </a>
          </div>
        </div>
      `;
      })
      .join('');
  }

  clearEvents() {
    this.events = [];
    this.renderEvents();
  }

  exportCsv() {
    if (this.events.length === 0) {
      alert('No events to export.');
      return;
    }
    const headers = ['Timestamp', 'Node ID', 'Event Name', 'Category', 'Confidence Score', 'Alert Level'];
    const rows = this.events.map((e) => [
      `"${e.time.toISOString()}"`,
      `"${e.node}"`,
      `"${e.item.name}"`,
      `"${e.item.category}"`,
      `"${(e.item.confidence * 100).toFixed(1)}%"`,
      `"${e.item.alertLevel}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sound-Sentinel-Events-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  triggerPanicAlarm() {
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 800]);
    }
    const fakeAlert = {
      name: 'MANUAL PANIC SIREN ACTIVATED',
      category: 'Emergency & Safety',
      emoji: '🚨',
      alertLevel: 'critical',
      confidence: 1.0
    };
    this.handleDetection(fakeAlert);
    alert('PANIC ALARM TRIGGERED! Emergency alert dispatched to cloud webhook and WhatsApp.');
  }

  updateStatus(text, state = 'ready') {
    if (!this.dom.statusText) return;
    this.dom.statusText.textContent = text;
    this.dom.statusPill.className = `status-pill ${state}`;
  }
}
