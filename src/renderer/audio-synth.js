/**
 * AudioSynth generates synthetic household sound events using the Web Audio API.
 * This enables instant testing and demonstration without external sound files.
 */
class AudioSynth {
  constructor(audioContext = null) {
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  }

  getAudioContext() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Generates a 3100 Hz ISO T3 Smoke Detector Alarm (3 beeps, pause)
   */
  async generateSmokeAlarm(destination = null) {
    const ctx = this.getAudioContext();
    const dest = destination || ctx.destination;
    const now = ctx.currentTime + 0.05;
    const beepDuration = 0.5;
    const beepInterval = 0.5;

    for (let i = 0; i < 3; i++) {
      const startTime = now + i * (beepDuration + beepInterval);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(3100, startTime);

      // Sharp envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.setValueAtTime(0.4, startTime + beepDuration - 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + beepDuration);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + beepDuration);
    }
  }

  /**
   * Generates Glass Shatter sound (sharp high-frequency noise burst + multiple resonant shards)
   */
  async generateGlassBreak(destination = null) {
    const ctx = this.getAudioContext();
    const dest = destination || ctx.destination;
    const now = ctx.currentTime + 0.05;
    const duration = 1.2;

    // 1. High frequency white noise burst
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Highpass filter for brittle glass crack
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(3500, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    whiteNoise.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(dest);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);

    // 2. High-pitched crystalline resonant shards
    const shardFreqs = [4200, 5800, 7400, 8900];
    shardFreqs.forEach((freq, idx) => {
      const shardStart = now + idx * 0.08 + Math.random() * 0.04;
      const osc = ctx.createOscillator();
      const shardGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, shardStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, shardStart + 0.3);

      shardGain.gain.setValueAtTime(0.3, shardStart);
      shardGain.gain.exponentialRampToValueAtTime(0.0001, shardStart + 0.35);

      osc.connect(shardGain);
      shardGain.connect(dest);

      osc.start(shardStart);
      osc.stop(shardStart + 0.4);
    });
  }

  /**
   * Generates Baby Cry sound (wavering harmonic pitch glide around 450-550 Hz)
   */
  async generateBabyCry(destination = null) {
    const ctx = this.getAudioContext();
    const dest = destination || ctx.destination;
    const now = ctx.currentTime + 0.05;

    // 2 crying wails
    for (let cry = 0; cry < 2; cry++) {
      const startTime = now + cry * 0.85;
      const duration = 0.7;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch sweep with vibrato
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, startTime);
      osc.frequency.exponentialRampToValueAtTime(560, startTime + 0.25);
      osc.frequency.exponentialRampToValueAtTime(420, startTime + duration);

      // Low pass filter to simulate infant vocal tract
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);
      filter.Q.setValueAtTime(4, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }
  }

  /**
   * Generates Door Knocking sound (3 resonant wooden thuds)
   */
  async generateDoorKnock(destination = null) {
    const ctx = this.getAudioContext();
    const dest = destination || ctx.destination;
    const now = ctx.currentTime + 0.05;

    const knockTimes = [0, 0.22, 0.44];

    knockTimes.forEach(t => {
      const knockTime = now + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      // Pitch drop simulates hollow wood resonance
      osc.frequency.setValueAtTime(280, knockTime);
      osc.frequency.exponentialRampToValueAtTime(80, knockTime + 0.09);

      gain.gain.setValueAtTime(0.7, knockTime);
      gain.gain.exponentialRampToValueAtTime(0.001, knockTime + 0.12);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(knockTime);
      osc.stop(knockTime + 0.14);
    });
  }

  /**
   * Generates Dog Bark sound (two quick resonant vocal bursts)
   */
  async generateDogBark(destination = null) {
    const ctx = this.getAudioContext();
    const dest = destination || ctx.destination;
    const now = ctx.currentTime + 0.05;

    const barks = [0, 0.35];

    barks.forEach(t => {
      const barkTime = now + t;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, barkTime);
      osc.frequency.exponentialRampToValueAtTime(180, barkTime + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, barkTime);
      filter.Q.setValueAtTime(3, barkTime);

      gain.gain.setValueAtTime(0.5, barkTime);
      gain.gain.exponentialRampToValueAtTime(0.001, barkTime + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(barkTime);
      osc.stop(barkTime + 0.22);
    });
  }
}

if (typeof module !== 'undefined') {
  module.exports = AudioSynth;
}
