const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'src', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// SVG icon for application and tray
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Outer rounded shield/tile -->
  <rect x="16" y="16" width="224" height="224" rx="56" fill="#0f172a" stroke="#334155" stroke-width="4"/>
  
  <!-- Concentric radar audio rings -->
  <circle cx="128" cy="128" r="90" fill="none" stroke="url(#grad)" stroke-width="3" opacity="0.3" stroke-dasharray="8 6"/>
  <circle cx="128" cy="128" r="68" fill="none" stroke="url(#grad)" stroke-width="3" opacity="0.6"/>
  <circle cx="128" cy="128" r="46" fill="none" stroke="url(#grad)" stroke-width="3" opacity="0.8"/>
  <circle cx="128" cy="128" r="26" fill="url(#grad)"/>
  
  <!-- Sound wave acoustic bars -->
  <line x1="88" y1="128" x2="88" y2="128" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
  <line x1="108" y1="108" x2="108" y2="148" stroke="#60a5fa" stroke-width="8" stroke-linecap="round"/>
  <line x1="128" y1="92" x2="128" y2="164" stroke="#ffffff" stroke-width="8" stroke-linecap="round" filter="url(#glow)"/>
  <line x1="148" y1="108" x2="148" y2="148" stroke="#a78bfa" stroke-width="8" stroke-linecap="round"/>
  <line x1="168" y1="128" x2="168" y2="128" stroke="#c084fc" stroke-width="8" stroke-linecap="round"/>
  
  <!-- Home roof apex accent -->
  <path d="M76 68 L128 32 L180 68" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgIcon.trim());
console.log('Saved icon.svg');

// Generate a clean 16-bit PCM WAV notification chime buffer (gentle 2-tone chime: 880Hz -> 1320Hz)
function createWavChime() {
  const sampleRate = 44100;
  const duration = 0.5; // seconds
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + totalSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + totalSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(totalSamples * 2, 40);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Tone 1: 880Hz (0 to 0.2s), Tone 2: 1320Hz (0.2s to 0.5s)
    let freq = t < 0.2 ? 880 : 1320;
    let env = Math.exp(-t * 6); // smooth decay envelope
    let sample = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
    let intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  return buffer;
}

const wavBuffer = createWavChime();
fs.writeFileSync(path.join(assetsDir, 'chime.wav'), wavBuffer);
console.log('Saved chime.wav (size:', wavBuffer.length, 'bytes)');
