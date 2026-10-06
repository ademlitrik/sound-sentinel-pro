/**
 * Sound Sentinel - Enterprise Acoustic Intelligence Controller
 * Developed by Tanyaradzwa Bvute | Afro Vision Media
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
    this.renderStaticIcons();
    this.bindEvents();
    this.updateStatus('Initializing Edge Neural DSP Model...', 'loading');

    try {
      await this.loadModelAndClasses();
      this.initAudio();
      this.populateCategoryFilters();
      await this.populateMicrophoneList();
      this.updateStatus('Acoustic Neural Engine Ready. Arm sensor or calibrate below.', 'ready');
    } catch (err) {
      console.error('Initialization error:', err);
      this.updateStatus('Neural DSP Initialization Failed: ' + err.message, 'error');
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
      topClassIconWrap: document.getElementById('top-class-icon-wrap'),
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
      testBark: document.getElementById('btn-test-bark'),
      // About modal
      btnOpenAbout: document.getElementById('btn-open-about'),
      btnCloseAbout: document.getElementById('btn-close-about'),
      btnModalDone: document.getElementById('btn-modal-done'),
      aboutModal: document.getElementById('about-modal')
    };
  }

  renderStaticIcons() {
    if (typeof Icons === 'undefined') return;

    // Header icons
    const micContainer = document.getElementById('mic-icon-container');
    if (micContainer) micContainer.innerHTML = Icons.mic;

    this.dom.toggleBtnIcon.innerHTML = Icons.play;

    const infoContainer = document.getElementById('info-icon-container');
    if (infoContainer) infoContainer.innerHTML = Icons.info;

    // Top spotlight default icon
    this.dom.topClassIconWrap.innerHTML = Icons.waveform;

    // Calibration lab icons
    const alarmIcon = document.getElementById('test-icon-alarm');
    if (alarmIcon) alarmIcon.innerHTML = Icons.alarmSound;

    const glassIcon = document.getElementById('test-icon-glass');
    if (glassIcon) glassIcon.innerHTML = Icons.glassSound;

    const babyIcon = document.getElementById('test-icon-baby');
    if (babyIcon) babyIcon.innerHTML = Icons.baby;

    const knockIcon = document.getElementById('test-icon-knock');
    if (knockIcon) knockIcon.innerHTML = Icons.knockSound;

    const barkIcon = document.getElementById('test-icon-bark');
    if (barkIcon) barkIcon.innerHTML = Icons.pet;

    // Dropzone icon
    const dropzoneIcon = document.getElementById('dropzone-icon-container');
    if (dropzoneIcon) dropzoneIcon.innerHTML = Icons.upload;

    // Action button icons
    const csvIcon = document.getElementById('export-csv-icon');
    if (csvIcon) csvIcon.innerHTML = Icons.download;

    const jsonIcon = document.getElementById('export-json-icon');
    if (jsonIcon) jsonIcon.innerHTML = Icons.download;

    const clearIcon = document.getElementById('clear-icon');
    if (clearIcon) clearIcon.innerHTML = Icons.trash;

    // Empty log placeholder icon
    const emptyIcon = document.getElementById('empty-icon-container');
    if (emptyIcon) emptyIcon.innerHTML = Icons.waveform;
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

    // About modal handlers
    this.dom.btnOpenAbout.addEventListener('click', () => {
      this.dom.aboutModal.style.display = 'flex';
    });
    this.dom.btnCloseAbout.addEventListener('click', () => {
      this.dom.aboutModal.style.display = 'none';
    });
    this.dom.btnModalDone.addEventListener('click', () => {
      this.dom.aboutModal.style.display = 'none';
    });
    this.dom.aboutModal.addEventListener('click', (e) => {
      if (e.target === this.dom.aboutModal) {
        this.dom.aboutModal.style.display = 'none';
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
    this.classes = await window.electronAPI.loadClasses();
    this.classes.forEach(c => this.classMap.set(c.index, c));

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
        this.updateStatus('Acoustic sensor error: ' + err.message, 'error');
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
      select.innerHTML = '<option value="">Default Acoustic Sensor</option>';
      return;
    }

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Acoustic Input ${idx + 1}`;
      select.appendChild(opt);
    });
  }

  populateCategoryFilters() {
    const categories = [
      { name: 'Emergency & Safety', iconKey: 'emergency' },
      { name: 'Baby & Care', iconKey: 'baby' },
      { name: 'Security & Access', iconKey: 'security' },
      { name: 'Pets & Animals', iconKey: 'pet' },
      { name: 'Domestic & Kitchen', iconKey: 'domestic' },
      { name: 'People & Voice', iconKey: 'voice' },
      { name: 'Tools & Impacts', iconKey: 'tools' }
    ];

    const container = this.dom.categoryFilters;
    container.innerHTML = '';

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `filter-chip ${this.activeCategories.has(cat.name) ? 'active' : ''}`;
      const iconSvg = Icons[cat.iconKey] || Icons.ambient;
      chip.innerHTML = `<span class="chip-icon">${iconSvg}</span> <span class="chip-text">${cat.name}</span>`;

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
      this.dom.toggleBtnIcon.innerHTML = Icons.stop;
      this.dom.toggleBtnText.textContent = 'Disarm Sensor';
      this.updateStatus('Acoustic Surveillance Active (16 kHz Neural Stream)', 'active');
    } catch (err) {
      console.error('Failed to start audio engine:', err);
      this.updateStatus('Hardware Sensor Access Error: ' + err.message, 'error');
    }
  }

  async stopMonitoring() {
    if (this.audioEngine) {
      this.audioEngine.stop();
    }
    this.isMonitoring = false;
    this.stopUptimeCounter();

    this.dom.toggleBtn.classList.remove('monitoring');
    this.dom.toggleBtnIcon.innerHTML = Icons.play;
    this.dom.toggleBtnText.textContent = 'Arm Sensor';
    this.updateStatus('Surveillance Disarmed', 'ready');

    this.dom.levelMeterFill.style.width = '0%';
    this.dom.levelMeterDb.textContent = '-∞ dBFS';
  }

  handleAudioLevel(rms, db) {
    const minDb = -60;
    const maxDb = 0;
    const percentage = Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));

    this.dom.levelMeterFill.style.width = `${percentage}%`;
    this.dom.levelMeterDb.textContent = `${db.toFixed(1)} dBFS`;

    if (percentage > 85) {
      this.dom.levelMeterFill.style.backgroundColor = '#ff1744'; // Red peak
    } else if (percentage > 60) {
      this.dom.levelMeterFill.style.backgroundColor = '#ffab00'; // Amber
    } else {
      this.dom.levelMeterFill.style.backgroundColor = '#00e676'; // Green
    }
  }

  async handleAudioWindow(audioSamples, rms, db) {
    if (!this.model) return;

    // Check noise gate: if ambient noise is below floor threshold, record as ambient baseline
    if (rms < this.noiseFloorThreshold) {
      this.updateLiveCard({
        name: 'Ambient Baseline / Silence',
        category: 'Silence',
        iconSvg: Icons.silence,
        confidence: 0,
        time: new Date().toLocaleTimeString()
      });
      return;
    }

    try {
      const predictions = await this.classifyAudio(audioSamples);
      if (!predictions || predictions.length === 0) return;

      this.renderProbabilities(predictions.slice(0, 5));

      const top = predictions[0];
      this.updateLiveCard(top);

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
          iconSvg: getCategoryIcon(classInfo.category),
          alertLevel: classInfo.alertLevel,
          confidence: conf,
          time: new Date().toLocaleTimeString()
        });
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions;
  }

  triggerEventAlert(eventItem) {
    const now = Date.now();
    const lastAlert = this.cooldowns.get(eventItem.name) || 0;

    if (now - lastAlert < this.cooldownDurationMs) {
      return;
    }
    this.cooldowns.set(eventItem.name, now);

    // Audio confirmation chime
    if (this.soundChimeEnabled && this.chimeAudio) {
      this.chimeAudio.currentTime = 0;
      this.chimeAudio.play().catch(() => {});
    }

    // Windows desktop notification
    if (this.notificationsEnabled && window.electronAPI) {
      window.electronAPI.showNotification({
        title: `[SECURITY ALERT] ${eventItem.category}: ${eventItem.name}`,
        body: `Acoustic telemetry verified with ${(eventItem.confidence * 100).toFixed(0)}% confidence at ${eventItem.time}`,
        urgency: eventItem.alertLevel === 'critical' ? 'critical' : 'normal'
      });
    }

    const eventRecord = {
      id: 'SEC-' + Date.now().toString().slice(-6),
      name: eventItem.name,
      category: eventItem.category,
      iconSvg: eventItem.iconSvg || getCategoryIcon(eventItem.category),
      alertLevel: eventItem.alertLevel,
      confidence: eventItem.confidence,
      timestamp: new Date().toISOString(),
      timeFormatted: eventItem.time
    };

    this.eventLog.unshift(eventRecord);
    if (this.eventLog.length > 250) this.eventLog.pop();

    this.categoryCounts[eventItem.category] = (this.categoryCounts[eventItem.category] || 0) + 1;
    this.updateStats();

    this.renderEventItem(eventRecord);
  }

  updateLiveCard(top) {
    this.dom.topClassIconWrap.innerHTML = top.iconSvg || getCategoryIcon(top.category);
    this.dom.topClassName.textContent = top.name;
    this.dom.topClassCategory.textContent = top.category;
    this.dom.topClassCategory.className = `badge badge-${top.alertLevel || 'info'}`;
    const pct = (top.confidence * 100).toFixed(1);
    this.dom.topClassConfidence.textContent = `${pct}%`;
    this.dom.topClassConfBar.style.width = `${pct}%`;
    this.dom.topClassTime.textContent = top.time || '';
  }

  renderProbabilities(topPredictions) {
    const list = this.dom.probabilitiesList;
    list.innerHTML = '';

    topPredictions.forEach(pred => {
      const pct = (pred.confidence * 100).toFixed(1);
      const row = document.createElement('div');
      row.className = 'prob-row';
      row.innerHTML = `
        <div class="prob-header">
          <span class="prob-name"><span class="prob-dot"></span> ${pred.name}</span>
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
      <div class="event-icon">${record.iconSvg || Icons.activity}</div>
      <div class="event-details">
        <div class="event-title-line">
          <span class="event-title">${record.name}</span>
          <span class="badge badge-${record.alertLevel}">${record.category}</span>
        </div>
        <div class="event-meta">
          <span class="event-meta-item">${Icons.clock} ${record.timeFormatted}</span>
          <span class="event-meta-item">${Icons.target} ${pct}% confidence</span>
          <span class="event-id">${record.id}</span>
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
      alert('No acoustic events recorded yet to export.');
      return;
    }

    let data = '';
    if (format === 'json') {
      const exportPayload = {
        metadata: {
          system: 'Sound Sentinel Pro',
          developer: 'Tanyaradzwa Bvute',
          organization: 'Afro Vision Media',
          purpose: 'Security Surveillance & Scientific Acoustic Telemetry',
          exportedAt: new Date().toISOString()
        },
        events: this.eventLog
      };
      data = JSON.stringify(exportPayload, null, 2);
    } else {
      const headers = ['Event_ID', 'Timestamp_ISO', 'Time_Local', 'Sound_Class', 'Category', 'Confidence_Metric', 'Alert_Level'];
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
        alert(`Acoustic telemetry report exported successfully to:\n${res.filePath}`);
      }
    }
  }

  async testSound(type) {
    if (!this.audioSynth) return;

    this.updateStatus(`Transmitting Diagnostic Profile: ${type.toUpperCase()}...`, 'loading');

    const testAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (testAudioCtx.state === 'suspended') await testAudioCtx.resume();

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

    const sampleMappings = {
      alarm: { name: 'Smoke detector, smoke alarm', category: 'Emergency & Safety', iconSvg: Icons.emergency, alertLevel: 'critical', confidence: 0.94 },
      glass: { name: 'Glass fracture, shatter', category: 'Emergency & Safety', iconSvg: Icons.emergency, alertLevel: 'critical', confidence: 0.91 },
      baby: { name: 'Infant cry, distress wail', category: 'Baby & Care', iconSvg: Icons.baby, alertLevel: 'high', confidence: 0.88 },
      knock: { name: 'Percussive door knock', category: 'Security & Access', iconSvg: Icons.security, alertLevel: 'medium', confidence: 0.86 },
      bark: { name: 'Canine acoustic bark', category: 'Pets & Animals', iconSvg: Icons.pet, alertLevel: 'medium', confidence: 0.92 }
    };

    const simulated = sampleMappings[type];
    if (simulated) {
      simulated.time = new Date().toLocaleTimeString();
      this.updateLiveCard(simulated);
      this.triggerEventAlert(simulated);
    }

    setTimeout(() => {
      if (this.isMonitoring) {
        this.updateStatus('Acoustic Surveillance Active (16 kHz Neural Stream)', 'active');
      } else {
        this.updateStatus('Acoustic Neural Engine Ready', 'ready');
      }
    }, 1500);
  }

  async processAudioFile(file) {
    this.updateStatus(`Analyzing scientific sample: ${file.name}...`, 'loading');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      const snapshots = await this.audioEngine.processAudioBuffer(decodedBuffer);
      this.updateStatus(`Processing ${snapshots.length} acoustic frames through YAMNet Neural DSP...`, 'loading');

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

      this.updateStatus(`Analysis complete for ${file.name}. Verified ${detectedCount} acoustic incidents.`, 'ready');
    } catch (err) {
      console.error('File analysis error:', err);
      this.updateStatus('Scientific audio analysis failed: ' + err.message, 'error');
    }
  }

  updateStatus(message, state = 'ready') {
    if (!this.dom.statusBadge) return;
    this.dom.statusBadge.className = `status-badge ${state}`;
    this.dom.statusText.textContent = message;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
