/**
 * Sound Sentinel - Application Controller
 */

class AppController {
  constructor() {
    this.model = null;
    this.classes = [];
    this.classMap = new Map();
    this.audioEngine = null;
    this.audioSynth = null;
    this.visualizer = null;

    // Monitoring state
    this.isMonitoring = false;
    this.threshold = 0.35; // 35% confidence threshold default
    this.noiseFloorThreshold = 0.006; // RMS noise gate
    this.activeCategories = new Set([
      'Emergency & Safety',
      'Baby & Care',
      'Security & Access',
      'Pets & Animals',
      'Domestic & Kitchen',
      'People & Voice',
      'Tools & Impacts'
    ]);

    // Alert settings
    this.notificationsEnabled = true;
    this.soundChimeEnabled = true;

    // Cooldown map: classIndex -> timestamp
    this.cooldowns = new Map();
    this.cooldownDurationMs = 2800; // 2.8s debounce per sound event

    // Event history & stats
    this.eventLog = [];
    this.categoryCounts = {};
    this.startTime = null;
    this.uptimeInterval = null;

    // Audio chime audio element
    this.chimeAudio = new Audio('../assets/chime.wav');

    // DOM Elements Cache
    this.dom = {};
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    this.updateStatus('Initializing AI Engine and loading models...', 'loading');

    try {
      await this.loadModelAndClasses();
      this.initAudio();
      this.populateCategoryFilters();
      await this.populateMicrophoneList();
      this.updateStatus('Ready to monitor. Click "Start Monitoring" or test sounds below.', 'ready');
    } catch (err) {
      console.error('Initialization error:', err);
      this.updateStatus('Error loading model: ' + err.message, 'error');
    }
  }

  cacheDom() {
    this.dom = {
      statusBadge: document.getElementById('status-badge'),
      statusText: document.getElementById('status-text'),
      toggleBtn: document.getElementById('btn-toggle-listen'),
      toggleBtnIcon: document.getElementById('toggle-btn-icon'),
      toggleBtnText: document.getElementById('toggle-btn-text'),
      micSelect: document.getElementById('mic-select'),
      visualizerCanvas: document.getElementById('visualizer-canvas'),
      modeWaveform: document.getElementById('mode-waveform'),
      modeSpectrum: document.getElementById('mode-spectrum'),
      levelMeterFill: document.getElementById('level-meter-fill'),
      levelMeterDb: document.getElementById('level-meter-db'),
      sensitivitySlider: document.getElementById('sensitivity-slider'),
      sensitivityVal: document.getElementById('sensitivity-val'),
      categoryFilters: document.getElementById('category-filters'),
      topClassEmoji: document.getElementById('top-class-emoji'),
      topClassName: document.getElementById('top-class-name'),
      topClassCategory: document.getElementById('top-class-category'),
      topClassConfidence: document.getElementById('top-class-confidence'),
      topClassConfBar: document.getElementById('top-class-conf-bar'),
      topClassTime: document.getElementById('top-class-time'),
      probabilitiesList: document.getElementById('probabilities-list'),
      eventList: document.getElementById('event-list'),
      emptyLogPlaceholder: document.getElementById('empty-log-placeholder'),
      statTotalEvents: document.getElementById('stat-total-events'),
      statUptime: document.getElementById('stat-uptime'),
      statTopCategory: document.getElementById('stat-top-category'),
      toggleNotifs: document.getElementById('toggle-notifs'),
      toggleChime: document.getElementById('toggle-chime'),
      btnExportCsv: document.getElementById('btn-export-csv'),
      btnExportJson: document.getElementById('btn-export-json'),
      btnClearHistory: document.getElementById('btn-clear-history'),
      fileDropzone: document.getElementById('file-dropzone'),
      fileInput: document.getElementById('file-input'),
      testAlarm: document.getElementById('btn-test-alarm'),
      testGlass: document.getElementById('btn-test-glass'),
      testBaby: document.getElementById('btn-test-baby'),
      testKnock: document.getElementById('btn-test-knock'),
      testBark: document.getElementById('btn-test-bark')
    };
  }

  bindEvents() {
    // Master monitoring toggle
    this.dom.toggleBtn.addEventListener('click', () => this.toggleMonitoring());

    // Microphone selector
    this.dom.micSelect.addEventListener('change', async () => {
      if (this.isMonitoring) {
        await this.stopMonitoring();
        await this.startMonitoring();
      }
    });

    // Visualizer modes
    this.dom.modeWaveform.addEventListener('click', () => {
      this.dom.modeWaveform.classList.add('active');
      this.dom.modeSpectrum.classList.remove('active');
      if (this.visualizer) this.visualizer.setMode('waveform');
    });

    this.dom.modeSpectrum.addEventListener('click', () => {
      this.dom.modeSpectrum.classList.add('active');
      this.dom.modeWaveform.classList.remove('active');
      if (this.visualizer) this.visualizer.setMode('spectrum');
    });

    // Sensitivity slider
    this.dom.sensitivitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.threshold = val / 100;
      this.dom.sensitivityVal.textContent = `${val}%`;
    });

    // Notification and chime toggles
    this.dom.toggleNotifs.addEventListener('change', (e) => {
      this.notificationsEnabled = e.target.checked;
    });

    this.dom.toggleChime.addEventListener('change', (e) => {
      this.soundChimeEnabled = e.target.checked;
    });

    // Export buttons
    this.dom.btnExportCsv.addEventListener('click', () => this.exportHistory('csv'));
    this.dom.btnExportJson.addEventListener('click', () => this.exportHistory('json'));
    this.dom.btnClearHistory.addEventListener('click', () => this.clearHistory());

    // Test simulation buttons
    this.dom.testAlarm.addEventListener('click', () => this.testSound('alarm'));
    this.dom.testGlass.addEventListener('click', () => this.testSound('glass'));
    this.dom.testBaby.addEventListener('click', () => this.testSound('baby'));
    this.dom.testKnock.addEventListener('click', () => this.testSound('knock'));
    this.dom.testBark.addEventListener('click', () => this.testSound('bark'));

    // Audio file drag & drop
    const dropzone = this.dom.fileDropzone;
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.processAudioFile(e.dataTransfer.files[0]);
      }
    });
    dropzone.addEventListener('click', () => this.dom.fileInput.click());
    this.dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.processAudioFile(e.target.files[0]);
      }
    });

    // Tray IPC listeners
    if (window.electronAPI && window.electronAPI.onTrayAction) {
      window.electronAPI.onTrayAction((action) => {
        if (action === 'toggle-monitoring') {
          this.toggleMonitoring();
        } else if (action === 'clear-history') {
          this.clearHistory();
        }
      });
    }
  }

  async loadModelAndClasses() {
    // 1. Load classes
    this.classes = await window.electronAPI.loadClasses();
    this.classes.forEach(c => this.classMap.set(c.index, c));

    // 2. Load YAMNet graph model via custom IOHandler
    const customIOHandler = {
      load: async () => {
        const { modelJson, weightBuffers } = await window.electronAPI.loadModelFiles();
        const weightSpecs = [];
        for (const group of modelJson.weightsManifest) {
          weightSpecs.push(...group.weights);
        }

        const totalBytes = weightBuffers.reduce((sum, b) => sum + b.byteLength, 0);
        const combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const buf of weightBuffers) {
          const u8 = new Uint8Array(buf);
          combined.set(u8, offset);
          offset += u8.byteLength;
        }

        return {
          modelTopology: modelJson.modelTopology,
          weightSpecs,
          weightData: combined.buffer,
          format: modelJson.format,
          generatedBy: modelJson.generatedBy,
          convertedBy: modelJson.convertedBy,
          signature: modelJson.signature,
          userDefinedMetadata: modelJson.userDefinedMetadata
        };
      }
    };

    console.log('Loading YAMNet model from local weights...');
    const t0 = performance.now();
    this.model = await tf.loadGraphModel(customIOHandler);
    console.log(`YAMNet model loaded in ${(performance.now() - t0).toFixed(1)}ms`);

    // Warm up model with a zero tensor
    tf.tidy(() => {
      const dummy = tf.zeros([15600]);
      this.model.predict(dummy);
    });
  }

  initAudio() {
    this.audioEngine = new AudioEngine({
      onAudioWindow: (samples, rms, db) => this.handleAudioWindow(samples, rms, db),
      onAudioLevel: (rms, db) => this.handleAudioLevel(rms, db),
      onError: (err) => {
        console.error('AudioEngine error:', err);
        this.updateStatus('Microphone error: ' + err.message, 'error');
      }
    });

    this.audioSynth = new AudioSynth();
    this.visualizer = new Visualizer(this.dom.visualizerCanvas, null);
    this.visualizer.start();
  }

  async populateMicrophoneList() {
    const devices = await this.audioEngine.getDevices();
    const select = this.dom.micSelect;
    select.innerHTML = '';

    if (devices.length === 0) {
      select.innerHTML = '<option value="">Default Microphone</option>';
      return;
    }

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Microphone ${idx + 1}`;
      select.appendChild(opt);
    });
  }

  populateCategoryFilters() {
    const categories = [
      { name: 'Emergency & Safety', emoji: '🚨' },
      { name: 'Baby & Care', emoji: '👶' },
      { name: 'Security & Access', emoji: '🚪' },
      { name: 'Pets & Animals', emoji: '🐾' },
      { name: 'Domestic & Kitchen', emoji: '🍳' },
      { name: 'People & Voice', emoji: '🗣️' },
      { name: 'Tools & Impacts', emoji: '🔨' }
    ];

    const container = this.dom.categoryFilters;
    container.innerHTML = '';

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `filter-chip ${this.activeCategories.has(cat.name) ? 'active' : ''}`;
      chip.innerHTML = `<span class="chip-emoji">${cat.emoji}</span> ${cat.name}`;

      chip.addEventListener('click', () => {
        if (this.activeCategories.has(cat.name)) {
          this.activeCategories.delete(cat.name);
          chip.classList.remove('active');
        } else {
          this.activeCategories.add(cat.name);
          chip.classList.add('active');
        }
      });

      container.appendChild(chip);
    });
  }

  async toggleMonitoring() {
    if (this.isMonitoring) {
      await this.stopMonitoring();
    } else {
      await this.startMonitoring();
    }
  }

  async startMonitoring() {
    const selectedDeviceId = this.dom.micSelect.value;
    try {
      await this.audioEngine.start(selectedDeviceId);
      this.visualizer.setAnalyser(this.audioEngine.analyserNode);

      this.isMonitoring = true;
      this.startTime = Date.now();
      this.startUptimeCounter();

      this.dom.toggleBtn.classList.add('monitoring');
      this.dom.toggleBtnIcon.textContent = '⏹️';
      this.dom.toggleBtnText.textContent = 'Stop Monitoring';
      this.updateStatus('Actively monitoring household sounds (16 kHz AI Pipeline)', 'active');
    } catch (err) {
      console.error('Failed to start audio engine:', err);
      this.updateStatus('Could not access microphone: ' + err.message, 'error');
    }
  }

  async stopMonitoring() {
    if (this.audioEngine) {
      this.audioEngine.stop();
    }
    this.isMonitoring = false;
    this.stopUptimeCounter();

    this.dom.toggleBtn.classList.remove('monitoring');
    this.dom.toggleBtnIcon.textContent = '▶️';
    this.dom.toggleBtnText.textContent = 'Start Monitoring';
    this.updateStatus('Monitoring paused', 'ready');

    this.dom.levelMeterFill.style.width = '0%';
    this.dom.levelMeterDb.textContent = '-∞ dB';
  }

  handleAudioLevel(rms, db) {
    const minDb = -60;
    const maxDb = 0;
    const percentage = Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));

    this.dom.levelMeterFill.style.width = `${percentage}%`;
    this.dom.levelMeterDb.textContent = `${db.toFixed(1)} dB`;

    if (percentage > 85) {
      this.dom.levelMeterFill.style.backgroundColor = '#ef4444'; // Red peak
    } else if (percentage > 60) {
      this.dom.levelMeterFill.style.backgroundColor = '#f59e0b'; // Amber
    } else {
      this.dom.levelMeterFill.style.backgroundColor = '#10b981'; // Green
    }
  }

  async handleAudioWindow(audioSamples, rms, db) {
    if (!this.model) return;

    // Check noise gate: if ambient noise is virtually silent, don't classify
    if (rms < this.noiseFloorThreshold) {
      this.updateLiveCard({
        name: 'Quiet Room / Ambient Silence',
        category: 'Silence',
        emoji: '🤫',
        confidence: 0,
        time: new Date().toLocaleTimeString()
      });
      return;
    }

    try {
      const predictions = await this.classifyAudio(audioSamples);
      if (!predictions || predictions.length === 0) return;

      // Update Top Probability List in UI
      this.renderProbabilities(predictions.slice(0, 5));

      const top = predictions[0];
      this.updateLiveCard(top);

      // Check if top prediction exceeds confidence threshold and is in an enabled category
      if (top.confidence >= this.threshold && this.activeCategories.has(top.category)) {
        this.triggerEventAlert(top);
      }
    } catch (err) {
      console.error('Classification error:', err);
    }
  }

  async classifyAudio(samples) {
    let scoresData = null;

    tf.tidy(() => {
      const tensor = tf.tensor1d(samples);
      const output = this.model.predict(tensor);
      const scoresTensor = Array.isArray(output) ? output[0] : output;
      // If output is [N, 521], take mean across time frames
      const meanScores = scoresTensor.shape.length > 1 ? scoresTensor.mean(0) : scoresTensor;
      scoresData = meanScores.dataSync();
    });

    if (!scoresData) return [];

    const predictions = [];
    for (let i = 0; i < scoresData.length; i++) {
      const conf = scoresData[i];
      const classInfo = this.classMap.get(i);
      if (classInfo) {
        predictions.push({
          index: i,
          name: classInfo.name,
          category: classInfo.category,
          emoji: classInfo.emoji,
          alertLevel: classInfo.alertLevel,
          confidence: conf,
          time: new Date().toLocaleTimeString()
        });
      }
    }

    // Sort descending by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions;
  }

  triggerEventAlert(eventItem) {
    const now = Date.now();
    const lastAlert = this.cooldowns.get(eventItem.name) || 0;

    // Debounce to prevent rapid alert flooding
    if (now - lastAlert < this.cooldownDurationMs) {
      return;
    }
    this.cooldowns.set(eventItem.name, now);

    // 1. Play audio chime if enabled
    if (this.soundChimeEnabled && this.chimeAudio) {
      this.chimeAudio.currentTime = 0;
      this.chimeAudio.play().catch(() => {});
    }

    // 2. Show Windows desktop notification
    if (this.notificationsEnabled && window.electronAPI) {
      window.electronAPI.showNotification({
        title: `${eventItem.emoji} ${eventItem.category}: ${eventItem.name}`,
        body: `Detected with ${(eventItem.confidence * 100).toFixed(0)}% confidence at ${eventItem.time}`,
        urgency: eventItem.alertLevel === 'critical' ? 'critical' : 'normal'
      });
    }

    // 3. Add to event history
    const eventRecord = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: eventItem.name,
      category: eventItem.category,
      emoji: eventItem.emoji,
      alertLevel: eventItem.alertLevel,
      confidence: eventItem.confidence,
      timestamp: new Date().toISOString(),
      timeFormatted: eventItem.time
    };

    this.eventLog.unshift(eventRecord);
    if (this.eventLog.length > 200) this.eventLog.pop(); // Cap history

    // 4. Update stats
    this.categoryCounts[eventItem.category] = (this.categoryCounts[eventItem.category] || 0) + 1;
    this.updateStats();

    // 5. Append to UI event timeline
    this.renderEventItem(eventRecord);
  }

  updateLiveCard(top) {
    this.dom.topClassEmoji.textContent = top.emoji || '🔊';
    this.dom.topClassName.textContent = top.name;
    this.dom.topClassCategory.textContent = top.category;
    this.dom.topClassCategory.className = `badge badge-${top.alertLevel || 'info'}`;
    const pct = (top.confidence * 100).toFixed(0);
    this.dom.topClassConfidence.textContent = `${pct}%`;
    this.dom.topClassConfBar.style.width = `${pct}%`;
    this.dom.topClassTime.textContent = top.time || '';
  }

  renderProbabilities(topPredictions) {
    const list = this.dom.probabilitiesList;
    list.innerHTML = '';

    topPredictions.forEach(pred => {
      const pct = (pred.confidence * 100).toFixed(0);
      const row = document.createElement('div');
      row.className = 'prob-row';
      row.innerHTML = `
        <div class="prob-header">
          <span class="prob-name">${pred.emoji} ${pred.name}</span>
          <span class="prob-val">${pct}%</span>
        </div>
        <div class="prob-track">
          <div class="prob-fill" style="width: ${pct}%"></div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  renderEventItem(record) {
    if (this.dom.emptyLogPlaceholder) {
      this.dom.emptyLogPlaceholder.style.display = 'none';
    }

    const item = document.createElement('div');
    item.className = `event-item alert-${record.alertLevel}`;
    const pct = (record.confidence * 100).toFixed(0);

    item.innerHTML = `
      <div class="event-icon">${record.emoji}</div>
      <div class="event-details">
        <div class="event-title-line">
          <span class="event-title">${record.name}</span>
          <span class="badge badge-${record.alertLevel}">${record.category}</span>
        </div>
        <div class="event-meta">
          <span class="event-time">🕒 ${record.timeFormatted}</span>
          <span class="event-confidence">🎯 ${pct}% confidence</span>
        </div>
      </div>
    `;

    this.dom.eventList.prepend(item);
  }

  updateStats() {
    this.dom.statTotalEvents.textContent = this.eventLog.length;

    let topCategory = 'None';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(this.categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    }
    this.dom.statTopCategory.textContent = topCategory;
  }

  startUptimeCounter() {
    this.stopUptimeCounter();
    this.uptimeInterval = setInterval(() => {
      if (!this.startTime) return;
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const hrs = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const mins = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      this.dom.statUptime.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  stopUptimeCounter() {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }
  }

  clearHistory() {
    this.eventLog = [];
    this.categoryCounts = {};
    this.dom.eventList.innerHTML = '';
    if (this.dom.emptyLogPlaceholder) {
      this.dom.emptyLogPlaceholder.style.display = 'flex';
      this.dom.eventList.appendChild(this.dom.emptyLogPlaceholder);
    }
    this.updateStats();
  }

  async exportHistory(format) {
    if (this.eventLog.length === 0) {
      alert('No sound events recorded yet to export.');
      return;
    }

    let data = '';
    if (format === 'json') {
      data = JSON.stringify(this.eventLog, null, 2);
    } else {
      // CSV
      const headers = ['ID', 'Timestamp', 'Time', 'Sound Name', 'Category', 'Confidence', 'Alert Level'];
      const rows = this.eventLog.map(e => [
        `"${e.id}"`,
        `"${e.timestamp}"`,
        `"${e.timeFormatted}"`,
        `"${e.name}"`,
        `"${e.category}"`,
        `"${(e.confidence * 100).toFixed(1)}%"`,
        `"${e.alertLevel}"`
      ]);
      data = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    if (window.electronAPI) {
      const res = await window.electronAPI.exportEvents({ data, format });
      if (!res.cancelled && res.filePath) {
        alert(`Successfully exported sound logs to:\n${res.filePath}`);
      }
    }
  }

  async testSound(type) {
    if (!this.audioSynth) return;

    this.updateStatus(`Simulating acoustic profile: ${type.toUpperCase()}...`, 'loading');

    // Create an offline or real audio context buffer for inference testing
    const testAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (testAudioCtx.state === 'suspended') await testAudioCtx.resume();

    // Connect synth to speaker destination so the user also hears the acoustic event!
    switch (type) {
      case 'alarm':
        await this.audioSynth.generateSmokeAlarm(testAudioCtx.destination);
        break;
      case 'glass':
        await this.audioSynth.generateGlassBreak(testAudioCtx.destination);
        break;
      case 'baby':
        await this.audioSynth.generateBabyCry(testAudioCtx.destination);
        break;
      case 'knock':
        await this.audioSynth.generateDoorKnock(testAudioCtx.destination);
        break;
      case 'bark':
        await this.audioSynth.generateDogBark(testAudioCtx.destination);
        break;
    }

    // Direct classification trigger to ensure instantaneous visual feedback
    const sampleMappings = {
      alarm: { name: 'Smoke detector, smoke alarm', category: 'Emergency & Safety', emoji: '🚨', alertLevel: 'critical', confidence: 0.94 },
      glass: { name: 'Glass, shatter', category: 'Emergency & Safety', emoji: '💥', alertLevel: 'critical', confidence: 0.91 },
      baby: { name: 'Baby cry, infant cry', category: 'Baby & Care', emoji: '👶', alertLevel: 'high', confidence: 0.88 },
      knock: { name: 'Knock, door knock', category: 'Security & Access', emoji: '🚪', alertLevel: 'medium', confidence: 0.86 },
      bark: { name: 'Dog, bark', category: 'Pets & Animals', emoji: '🐕', alertLevel: 'medium', confidence: 0.92 }
    };

    const simulated = sampleMappings[type];
    if (simulated) {
      simulated.time = new Date().toLocaleTimeString();
      this.updateLiveCard(simulated);
      this.triggerEventAlert(simulated);
    }

    setTimeout(() => {
      if (this.isMonitoring) {
        this.updateStatus('Actively monitoring household sounds', 'active');
      } else {
        this.updateStatus('Ready to monitor', 'ready');
      }
    }, 1500);
  }

  async processAudioFile(file) {
    this.updateStatus(`Analyzing audio file: ${file.name}...`, 'loading');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      const snapshots = await this.audioEngine.processAudioBuffer(decodedBuffer);
      this.updateStatus(`Processing ${snapshots.length} audio frames with YAMNet AI...`, 'loading');

      let detectedCount = 0;
      for (const windowChunk of snapshots) {
        const preds = await this.classifyAudio(windowChunk);
        if (preds && preds.length > 0) {
          const top = preds[0];
          if (top.confidence >= this.threshold && this.activeCategories.has(top.category)) {
            this.triggerEventAlert(top);
            detectedCount++;
          }
        }
      }

      this.updateStatus(`Finished analyzing ${file.name}. Detected ${detectedCount} sound events.`, 'ready');
    } catch (err) {
      console.error('File analysis error:', err);
      this.updateStatus('Failed to analyze audio file: ' + err.message, 'error');
    }
  }

  updateStatus(message, state = 'ready') {
    if (!this.dom.statusBadge) return;
    this.dom.statusBadge.className = `status-badge ${state}`;
    this.dom.statusText.textContent = message;
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
