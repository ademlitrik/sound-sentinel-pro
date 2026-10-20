# Sound Sentinel Pro

**Enterprise Acoustic Security & Scientific Sound Telemetry Suite**  
Developed by **Tanyaradzwa Bvute** â€” Lead Systems Architect, **Afro Vision Media PTY (Ltd)**

---

Sound Sentinel Pro transforms any computing device into an enterprise-grade acoustic radar. Leveraging Google's YAMNet neural network architecture, it detects, classifies, and dispatches alerts for 521 acoustic categories entirely on-device â€” with zero cloud exposure, zero subscription fees, and complete POPIA & GDPR compliance.

---

## Platform Downloads

All binaries are compiled and published automatically via **GitHub Actions CI/CD pipelines** and distributed through **GitHub Releases**.

### Desktop Platforms

| Platform | Download | Architecture | Size |
|---|---|---|---|
| **Windows 10/11** | [Sound-Sentinel-Pro-Setup-1.0.0.exe](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound-Sentinel-Pro-Setup-1.0.0.exe) | x64 NSIS Installer | 162 MB |
| **Windows 10/11** | [Sound.Sentinel.Pro.1.0.0.exe](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound.Sentinel.Pro.1.0.0.exe) | x64 Portable | 162 MB |
| **macOS 11+** | [Sound-Sentinel-Pro-1.0.0-mac.dmg](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound-Sentinel-Pro-1.0.0-mac.dmg) | Intel + Apple Silicon | 197 MB |
| **macOS 11+** | [Sound-Sentinel-Pro-1.0.0-mac.zip](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound-Sentinel-Pro-1.0.0-mac.zip) | Portable Archive | 197 MB |
| **Linux / IoT** | [Sound-Sentinel-Pro-1.0.0-linux-x86_64.AppImage](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound-Sentinel-Pro-1.0.0-linux-x86_64.AppImage) | Universal AppImage | 196 MB |
| **Linux / Debian** | [Sound-Sentinel-Pro-1.0.0-linux-amd64.deb](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound-Sentinel-Pro-1.0.0-linux-amd64.deb) | Debian Package | 146 MB |

> The Linux `.deb` and `.AppImage` packages also run on Raspberry Pi (ARM) and single-board computers for embedded IoT sensor deployments.

### Mobile & Edge

| Platform | Download | Notes |
|---|---|---|
| **Android** | [Sound-Sentinel-Pro-Mobile.apk](https://github.com/ademlitrik/sound-sentinel-pro/releases/download/v1.0.1/Sound-Sentinel-Pro-Mobile.apk) | Android 8+ (Capacitor 6) |
| **iOS** | Build from source via Xcode | Requires Apple Developer Account |
| **PWA** | Host `mobile/www/` on any HTTPS server | Installable on iPhone and Android via browser |

---

## Installation

### Windows

1. Download `Sound-Sentinel-Pro-Setup-1.0.0.exe`
2. Run the installer â€” it will guide you through setup
3. A Desktop shortcut and Start Menu entry are created automatically under **Afro Vision Media**
4. Launch Sound Sentinel Pro from your Desktop or Start Menu

### macOS

1. Download `Sound-Sentinel-Pro-1.0.0-mac.dmg`
2. Open the `.dmg` and drag the app to your `/Applications` folder
3. On first launch, right-click the app and choose **Open** (bypasses Gatekeeper for unsigned builds)

### Linux

```bash
# AppImage (Ubuntu, Fedora, any distro)
chmod +x Sound-Sentinel-Pro-1.0.0-linux-x86_64.AppImage
./Sound-Sentinel-Pro-1.0.0-linux-x86_64.AppImage

# Debian / Ubuntu / Raspberry Pi OS
sudo dpkg -i Sound-Sentinel-Pro-1.0.0-linux-amd64.deb
sound-sentinel-pro
```

### Android

1. Download `Sound-Sentinel-Pro-Mobile.apk`
2. On your Android device, go to **Settings > Security > Unknown Sources** and allow installation
3. Transfer the APK to your device and open it to install
4. Grant microphone permission on first launch

---

## Features

### Edge Neural DSP â€” YAMNet On-Device Inference

- Classifies **521 acoustic categories** locally using TFLite weights â€” no cloud round-trip
- Sub-15ms inference latency on commodity hardware
- Pre-trained on Google's AudioSet taxonomy

**Key acoustic categories monitored:**

| Category | Examples |
|---|---|
| Emergency / Safety | Smoke detector, fire siren, glass fracture, alarm bells |
| Security / Perimeter | Door knocking, footsteps, sliding doors, impact sounds |
| Pediatric / Clinical | Infant crying, distress wails, coughing, sneezing |
| Environmental | Machinery anomalies, liquid leaks, HVAC alerts |
| Voice / Speech | Shouting, whispering, laughter, crowd sounds |

### Real-Time Spectral Visualizer

- **Signal Oscilloscope** â€” continuous analog waveform rendering at high FPS
- **48-Band FFT Spectrogram** â€” logarithmic frequency spectrum with peak-hold indicators
- **VU Meter** â€” real-time dBFS volume gauge (-60 dBFS to 0 dBFS) with ambient noise gate

### Alert Dispatch System

- Native OS toast notifications (Windows, macOS, Linux)
- System tray background surveillance mode
- WhatsApp Business API webhook integration
- Telegram bot dispatcher
- Custom cloud webhook (HTTP POST JSON payload â€” 1 KB telemetry only, zero raw audio)
- Smart debouncing with configurable cooldown intervals

### Forensic Audit Logging

- Searchable chronological incident log with Event IDs and confidence ratings
- Export to **CSV** or structured **JSON** telemetry reports for security audits and regulatory compliance

### Privacy Architecture

- Raw microphone audio **never leaves physical device memory**
- No streaming, no recording, no cloud processing
- Only 1 KB structured JSON alert packets are dispatched on events
- Compliant with **POPIA** (Protection of Personal Information Act) and **GDPR** by design

---

## Enterprise Use Cases

### Security Service Providers

Deploy as distributed sensor pods across a facility. Each node runs autonomously on commodity hardware (standard laptop, Raspberry Pi, or mini-PC). No recurring cloud infrastructure cost.

See: [SECURITY_COMPANY_SENSOR_PODS.md](./SECURITY_COMPANY_SENSOR_PODS.md)

### Hospital Labs & Clinical Environments

Monitor patient rooms, laboratories, and equipment bays for acoustic anomalies without transmitting protected health information (PHI) to external servers.

See: [HOSPITAL_LABS_AND_SCIENTIFIC_RESEARCH.md](./HOSPITAL_LABS_AND_SCIENTIFIC_RESEARCH.md)

### IoT & Embedded Edge Nodes

Run the headless edge daemon on Raspberry Pi, NVIDIA Jetson Nano, or any single-board computer with a USB microphone. The `.deb` package installs as a `systemd` service for always-on surveillance.

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/ademlitrik/sound-sentinel-pro.git
cd sound-sentinel-pro
npm install
```

### Run in Development Mode

```bash
npm start
```

### Run Test Suite

```bash
npm test
```

### Build Desktop Distributions

```bash
# All platforms (requires running on macOS for DMG, Windows for NSIS)
npm run dist

# Or trigger GitHub Actions by pushing a v* tag:
git tag v1.0.1
git push origin v1.0.1
```

### Build Android APK

```bash
cd mobile
npm install
npx cap sync android
npx cap build android
```

Or push a `v*` tag â€” the `build-android.yml` GitHub Actions workflow will automatically compile and publish the APK to the release.

### Mobile PWA

The `mobile/www/` directory is a fully self-contained offline PWA. Host it on any HTTPS server:

```bash
# Serve locally for testing
cd mobile/www
npx serve .

# Deploy to GitHub Pages, Netlify, or your own server
# Then users can "Add to Home Screen" on iPhone Safari or Android Chrome
```

---

## Project Structure

```
sound-sentinel-pro/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main.js                    # Electron main process
â”‚   â”œâ”€â”€ preload.js                 # IPC bridge
â”‚   â””â”€â”€ renderer/
â”‚       â””â”€â”€ app.js                 # Desktop renderer (YAMNet + UI)
â”œâ”€â”€ mobile/
â”‚   â”œâ”€â”€ www/
â”‚   â”‚   â”œâ”€â”€ index.html             # Mobile PWA (Sensor Pod + Pocket Monitor)
â”‚   â”‚   â”œâ”€â”€ css/mobile.css         # Enterprise mobile stylesheet
â”‚   â”‚   â”œâ”€â”€ js/
â”‚   â”‚   â”‚   â”œâ”€â”€ mobile-audio.js    # 16kHz audio engine
â”‚   â”‚   â”‚   â”œâ”€â”€ mobile-classifier.js  # TFLite YAMNet inference
â”‚   â”‚   â”‚   â”œâ”€â”€ mobile-dispatcher.js  # Alert dispatch (WhatsApp/Telegram/Webhook)
â”‚   â”‚   â”‚   â”œâ”€â”€ mobile-app.js      # Main mobile controller
â”‚   â”‚   â”‚   â””â”€â”€ classes.js         # 521 AudioSet class labels
â”‚   â”‚   â”œâ”€â”€ model/                 # YAMNet model shards (TFLite)
â”‚   â”‚   â”œâ”€â”€ sw.js                  # Service Worker (full offline)
â”‚   â”‚   â””â”€â”€ manifest.json          # PWA manifest
â”‚   â”œâ”€â”€ capacitor.config.json
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ embedded_edge_daemon.js    # Headless Raspberry Pi / Linux sensor node
â”‚   â”œâ”€â”€ test_app.js                # Desktop test suite
â”‚   â””â”€â”€ test_mobile_app.js         # Mobile test suite
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â”œâ”€â”€ build-all-platforms.yml   # Windows + macOS + Linux CI/CD
â”‚       â””â”€â”€ build-android.yml         # Android APK CI/CD
â”œâ”€â”€ model/                         # YAMNet model weights (desktop)
â”œâ”€â”€ afrovisionmedia-sound-sentinel-page.html  # WordPress embed
â”œâ”€â”€ SECURITY_COMPANY_SENSOR_PODS.md
â”œâ”€â”€ HOSPITAL_LABS_AND_SCIENTIFIC_RESEARCH.md
â”œâ”€â”€ ROADMAP_MOBILE_CLOUD.md
â””â”€â”€ MARKETING_AND_DISTRIBUTION.md
```

---

## CI/CD Pipeline

GitHub Actions automatically builds and publishes all platform binaries when a `v*` tag is pushed:

| Runner | Output |
|---|---|
| `macos-latest` | `Sound-Sentinel-Pro-1.0.0-mac.dmg` + `.zip` |
| `windows-latest` | `Sound-Sentinel-Pro-Setup-1.0.0.exe` + portable `.exe` |
| `ubuntu-latest` | `Sound-Sentinel-Pro-1.0.0-linux-x86_64.AppImage` + `.deb` |
| `ubuntu-latest` | `Sound-Sentinel-Pro-Mobile.apk` (Android) |

All releases are published to the **GitHub Releases** page and linked from the website embed.

---

## Website Embed

The file `afrovisionmedia-sound-sentinel-page.html` is a self-contained WordPress Custom HTML block ready to paste at `afrovisionmedia.co.za/sound-sentinel`.

Features:
- Enterprise dark-navy hero section with animated FFT spectrogram
- Full platform download matrix with official platform vector SVGs
- Comparative architecture table vs. Ring / Google Nest
- Mobile-responsive across all screen sizes
- Zero external JavaScript dependencies
- 100% SVG vector iconography â€” no emojis

---

## License

Proprietary â€” All Rights Reserved  
**Afro Vision Media PTY (Ltd)** | Tanyaradzwa Bvute  
Contact: [afrovisionmedia.co.za](https://afrovisionmedia.co.za)
