/**
 * Visualizer renders live oscilloscope waveforms and frequency spectrums
 * onto an HTML5 Canvas with neon glow and smooth transitions.
 */
class Visualizer {
  constructor(canvas, analyserNode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = analyserNode;
    this.mode = 'waveform'; // 'waveform' | 'spectrum'
    this.animationId = null;

    this.timeData = new Uint8Array(1024);
    this.freqData = new Uint8Array(512);

    this.peakValues = new Float32Array(64).fill(0);
    this.peakDecay = 0.95;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setAnalyser(analyserNode) {
    this.analyser = analyserNode;
    if (this.analyser) {
      this.timeData = new Uint8Array(this.analyser.fftSize);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  setMode(mode) {
    if (mode === 'waveform' || mode === 'spectrum') {
      this.mode = mode;
    }
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  start() {
    if (this.animationId) return;

    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  draw() {
    const { ctx, width, height } = this;
    if (!ctx || !width || !height) return;

    // Background dark clear
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!this.analyser) {
      // Idle animated pulse line
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    if (this.mode === 'waveform') {
      this.drawWaveform();
    } else {
      this.drawSpectrum();
    }
  }

  drawWaveform() {
    const { ctx, width, height, analyser, timeData } = this;
    analyser.getByteTimeDomainData(timeData);

    // Center reference line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform path
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0; // 0..2
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Fill under curve with gradient
    ctx.lineTo(width, height / 2);
    ctx.lineTo(0, height / 2);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.05)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.12)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  drawSpectrum() {
    const { ctx, width, height, analyser, freqData } = this;
    analyser.getByteFrequencyData(freqData);

    const barCount = 48;
    const barWidth = (width / barCount) - 3;
    const step = Math.floor(freqData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += freqData[i * step + j];
      }
      const val = sum / step;
      const barHeight = (val / 255) * (height - 20);

      // Peak hold animation
      if (barHeight > this.peakValues[i]) {
        this.peakValues[i] = barHeight;
      } else {
        this.peakValues[i] *= this.peakDecay;
      }

      const x = i * (barWidth + 3) + 2;
      const y = height - barHeight;

      // Color gradient based on frequency index (low = blue, mid = cyan, high = purple)
      const grad = ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, '#3b82f6');
      grad.addColorStop(0.6, '#38bdf8');
      grad.addColorStop(1, '#c084fc');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
      ctx.shadowBlur = 8;

      // Rounded top bar
      ctx.fillRect(x, y, barWidth, barHeight);

      // Peak indicator dot/line
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fillRect(x, height - this.peakValues[i] - 2, barWidth, 2);
    }

    ctx.shadowBlur = 0;
  }
}

if (typeof module !== 'undefined') {
  module.exports = Visualizer;
}
