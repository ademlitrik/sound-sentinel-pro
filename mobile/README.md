# Sound Sentinel Pro — Mobile Architecture & Deployment Guide
> **Enterprise Mobile Acoustic Intelligence (Android & iOS)**  
> **Brand & Organization**: **Afro Vision Media PTY (Ltd)**  
> **Lead Architect**: **Tanyaradzwa Bvute**  
> **Package ID**: `com.afrovisionmedia.soundsentinel`

---

## 📱 Executive Overview

Sound Sentinel Pro Mobile extends the **100% on-device edge acoustic intelligence** of the desktop system to **Android** and **iOS** mobile devices.

### 🌟 Dual Operating Modes:
1. **Mode A: Sensor Pod Node (Listening Station)**
   - Turns any spare smartphone or tablet into a 24/7 dedicated acoustic sensor pod.
   - Utilizes device microphone + Web Audio DSP (resampling to 16,000 Hz) + on-device **YAMNet (521 classes)** neural network.
   - **Battery Saver Noise Gate**: Only executes neural inference when ambient sound exceeds baseline noise levels.
   - **Wake Lock Protection**: Uses the Screen Wake Lock API to prevent the phone from suspending during audio surveillance.
   - **Multi-Channel Dispatcher**: Transmits 1 KB encrypted JSON alert packets over local Wi-Fi / LTE to Cloud Webhooks, WhatsApp, or Telegram.

2. **Mode B: Pocket Companion Monitor**
   - Carried in the pocket of homeowners, security officers, or hospital nurses.
   - Receives instant incident alerts, provides one-tap SOS Panic Siren, and allows direct WhatsApp/phone contact with emergency dispatchers.

---

## 🚀 Deployment Options

### Option 1: Instant PWA (Zero App Store Wait, Works on Android & iOS Today)
Because Sound Sentinel Mobile is built as a Progressive Web App with an offline Service Worker (`sw.js`) and Web Manifest (`manifest.json`):
1. Host the `mobile/www` folder on your server (e.g., `https://sentinel.afrovisionmedia.co.za` or `afrovisionmedia.co.za/mobile`).
2. **On iPhone (iOS Safari)**: Tap the **Share** button -> Tap **"Add to Home Screen"**. The app installs natively with full-screen experience and offline caching.
3. **On Android (Google Chrome)**: Tap the menu -> Tap **"Install App"** or tap the prompt banner at the bottom.

### Option 2: Native Android (.apk) Build via Capacitor
To generate a native standalone Android APK:
```bash
cd mobile
npm install
npx cap add android
npx cap sync android
```
Then build the release APK using Gradle:
```bash
cd android
./gradlew assembleRelease
# The compiled APK is located in:
# android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Option 3: Native Apple iOS (.ipa) Build via Capacitor
To generate the native Xcode project for iPhone and iPad:
```bash
cd mobile
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```
*Note: Xcode and macOS are required to sign and archive for the Apple App Store or TestFlight.*

---

## ⚙️ Cloud Alert Configuration

In the Mobile App settings (⚙️ icon):
1. **Sensor Node ID**: Assign friendly names like `Living Room Phone`, `Front Porch Pod`, `NICU Infant Crib 1`.
2. **Cloud Webhook**: Enter your webhook endpoint (Make, Zapier, Home Assistant, or custom server).
3. **WhatsApp Recipient**: Enter your WhatsApp number in international format (e.g. `2782516591`).
4. **Telegram Bot Token & Chat ID**: Enter bot credentials for instant Telegram emergency group alerts.
5. **Sensitivity**: Set between 15% (tolerant) to 85% (high sensitivity).

---
© 2026 **Afro Vision Media PTY (Ltd)**. All rights reserved.
Engineering Lead: **Tanyaradzwa Bvute**.
