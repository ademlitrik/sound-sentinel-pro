# Sound Sentinel Pro 🛡️🔬

> **Enterprise Acoustic Security & Scientific Sound Telemetry Suite**  
> **Developed by Tanyaradzwa Bvute | Afro Vision Media**

Sound Sentinel Pro is a high-precision acoustic intelligence desktop platform engineered for **domestic and facility security surveillance** and **environmental sound telemetry**. It detects, classifies, and logs acoustic anomalies in real time with zero cloud dependency.

---

## 👨‍💻 System Architect & Developer

- **Lead Developer**: **Tanyaradzwa Bvute**
- **Company / Organization**: **Afro Vision Media**
- **Specialization**: Full-stack development, business systems, AI-assisted development, databases, APIs, and digital platforms.
- **System Objective**: Built specifically for **Security Surveillance & Scientific Acoustic Research** — non-invasive acoustic pattern tracking, immediate perimeter anomaly alerts (glass fracture, forced entry, distress vocalization, fire/smoke hazard), and domestic audio telemetry without transmitting audio data to external servers (100% privacy-compliant edge processing).

---

## ✨ Enterprise Features

- **🧠 Edge Neural DSP Engine (YAMNet)**
  - Classifies **521 acoustic categories** directly on-device using local weights.
  - Zero cloud latency, completely offline, zero audio transmission to external servers.
  - Instant classification for:
    - 🚨 **Emergency & Safety**: Smoke detector alarms, fire sirens, glass fracture, screams, burglar alarms
    - 👶 **Baby & Care**: Infant crying, distress wails, babbling, child speech
    - 🚪 **Security & Perimeter**: Door knocking, doorbells, sliding doors, footsteps, creaks, slamming
    - 🐾 **Pets & Animals**: Canine barking, howling, feline meowing, purring, birds
    - 🍳 **Domestic & Kitchen**: Microwave, blender, running water/faucet, dishes, cutlery, toilet flush
    - 🗣️ **People & Voice**: Speech, laughter, sneezing, coughing, snoring, whispers
    - 🔨 **Tools & Impacts**: Hammers, drilling, thuds, metallic clatter

- **📐 Precision Vector Iconography**
  - Clean, modern, scientific SVG iconography replaces informal emojis for an enterprise-grade telemetry dashboard.

- **📊 Dual-Mode Real-Time Spectral Visualizer**
  - **Signal Oscilloscope**: High-FPS continuous analog waveform rendering with neon accents.
  - **FFT Spectrum Analyzer**: 48-band logarithmic frequency spectrum with peak hold indicators.
  - **Decibel VU Meter**: Real-time dBFS volume gauge (-60 dBFS to 0 dBFS) with ambient baseline noise gate filtering.

- **🔔 Windows Security Alerts & Tray Monitoring**
  - Background surveillance mode via Windows System Tray.
  - Native toast alerts with urgency prioritization (Critical, High, Medium).
  - Smart alert debouncing and cooldown algorithms to avoid alert spamming.

- **🧪 Acoustic Calibration & Diagnostics Lab**
  - Synthetic harmonic generators (ISO T3 smoke alarms, resonant glass fractures, infant cry FM modulations, percussive knocks, canine barks) for immediate diagnostic verification.
  - Raw audio file ingestion (`.wav`, `.mp3`, `.ogg`, `.m4a`).

- **📁 Security Telemetry Audit Logging**
  - Searchable, chronological incident log with event IDs and confidence ratings.
  - Export to **CSV Reports** or structured **JSON Telemetry** for security audits.

---

## 📦 Windows Installation Package

The standalone production Windows installer executable is located in:

```
dist/Sound-Sentinel-Pro-Setup-1.0.0.exe
```

### Installation Steps:
1. Double-click `Sound-Sentinel-Pro-Setup-1.0.0.exe`.
2. Choose your destination directory (defaults to `Program Files`).
3. The wizard automatically generates a **Desktop Shortcut** and **Start Menu** entry under `Afro Vision Media`.
4. Launch **Sound Sentinel Pro** from your desktop or Start Menu.

---

## 🚀 Running in Development Mode

```bash
# Launch application in Electron
npm start

# Run verification test suite
npm test

# Rebuild Windows Installer (.exe)
npm run dist
```
