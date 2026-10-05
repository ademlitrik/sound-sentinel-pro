# Sound Sentinel 🎧

> **AI-Powered Real-time Household Sound Tracking & Acoustic Monitoring Desktop Application**

Sound Sentinel is a desktop application built with **Electron** and **TensorFlow.js (YAMNet)** designed to continuously track, classify, and visualize domestic and environmental acoustic events in your home.

---

## ✨ Key Features

- **🧠 Deep Learning Acoustic Recognition (YAMNet)**
  - Classifies **521 distinct acoustic classes** locally with zero cloud latency.
  - Recognizes alarms (smoke alarms, fire sirens), glass breaking, baby crying, dog barking, knocking, doorbells, footsteps, speech, appliances, and more.
  - Pre-trained neural weights bundled locally (`model/`) for 100% offline operation.

- **📊 Real-time Dual-Mode Visualizer**
  - **Oscilloscope Waveform**: Live analog waveform display with neon glow accents.
  - **Frequency Spectrum (FFT)**: 48-band logarithmic frequency spectrum with peak hold indicators.
  - **Decibel VU Meter**: Real-time dBFS volume meter (-60 dB to 0 dB) with noise gate filtering.

- **🔔 Native Desktop & System Tray Integration**
  - Runs unobtrusively in the background via the Windows System Tray.
  - Native toast alerts for high-priority events (e.g. 🚨 Smoke Alarm, 👶 Baby Cry, 💥 Glass Shatter).
  - Configurable alert debouncing/cooldown to prevent notification spamming.

- **🧪 Acoustic Simulator & Test Lab**
  - Synthesize calibrated acoustic profiles directly in the app (Smoke Alarm, Glass Break, Baby Cry, Door Knock, Dog Bark) to test alerts without making noise.
  - Drag-and-drop audio file testing (`.wav`, `.mp3`, `.ogg`, `.m4a`).

- **📁 Data Logging & Export**
  - Interactive chronological event timeline with confidence ratings and timestamps.
  - One-click export to **CSV** or **JSON** for home automation or historical analysis.
  - Category filtering: choose which sound types to monitor or mute.

---

## 🚀 Quick Start

### 1. Launch the Application
Open your terminal in this directory and run:

```bash
npm start
```

### 2. Start Monitoring
1. Choose your microphone from the top dropdown.
2. Click **Start Monitoring**.
3. Adjust the **Confidence Threshold** slider (default is 35%) and toggle categories according to your needs.

### 3. Test Without Hardware Sounds
Click any of the buttons in the **Acoustic Simulator & Test Lab** (e.g. *Smoke Alarm* or *Baby Cry*) to verify notifications, visualizer, and event logging.

---

## 🛠 Project Structure

```
adem/
├── model/                     # Local YAMNet weights & class map (521 classes)
│   ├── model.json
│   ├── group1-shard[1..4].bin
│   ├── yamnet_class_map.csv
│   └── classes.json
├── src/
│   ├── main.js                # Electron main process (tray, IPC, notifications)
│   ├── preload.js             # ContextBridge IPC security layer
│   ├── assets/                # App icons & audio alert chime
│   │   ├── icon.png
│   │   ├── icon.svg
│   │   └── chime.wav
│   └── renderer/              # Frontend UI & audio pipeline
│       ├── index.html         # Main dashboard layout
│       ├── styles.css         # Modern dark glassmorphism styling
│       ├── audio-engine.js    # Mic capture, 16kHz resampling, sliding window
│       ├── audio-synth.js     # Web Audio API acoustic simulator
│       ├── visualizer.js      # High-performance canvas waveform/FFT engine
│       └── app.js             # Central controller & AI inference loop
├── scripts/
│   ├── test_app.js            # Self-test validation script
│   └── test_electron_launch.js# Window launch validator
└── package.json
```

---

## 🧪 Running Self-Tests

To run the automated validation suite (file verification, class maps, model loading, 16kHz resampler check):

```bash
npm test
```
