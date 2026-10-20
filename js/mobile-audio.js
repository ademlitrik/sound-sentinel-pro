/**
 * Sound Sentinel Mobile - Audio Engine
 * High-performance mobile microphone streaming, 16kHz resampling,
 * and sliding window extraction for YAMNet inference.
 * Afro Vision Media PTY (Ltd)
 */

class MobileAudioEngine {
  constructor(options = {}) {
    this.targetSampleRate = 16000;
    this.windowSize = 15600; // 0.975 seconds at 16kHz
    this.stepSize = 6400;    // 0.4 seconds step (~60% overlap)
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.processorNode = null;
    this.isListening = false;

    // Buffer for 16kHz samples
    this.audioBuffer = new Float32Array(this.windowSize);
    this.samplesCollectedSinceStep = 0;

    // Callbacks
    this.onAudioWindow = options.onAudioWindow || (() => {});
    this.onAudioLevel = options.onAudioLevel || (() => {});
    this.onError = options.onError || console.error;
  }

  async start() {
    if (this.isListening) return;

    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Analyser for real-time mobile visualizer
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.sourceNode.connect(this.analyserNode);

      // ScriptProcessor for continuous raw audio frames
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isListening) return;
        const inputData = event.inputBuffer.getChannelData(0);
        this.processIncomingChunk(inputData, event.inputBuffer.sampleRate);
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isListening = true;
    } catch (err) {
      this.onError(err);
      throw err;
    }
  }

  stop() {
    this.isListening = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffer.fill(0);
    this.samplesCollectedSinceStep = 0;
  }

  processIncomingChunk(inputData, sourceSampleRate) {
    // 1. Resample down to 16,000 Hz using linear interpolation
    const resampled = this.resampleTo16k(inputData, sourceSampleRate);

    // 2. Compute RMS & decibel telemetry
    let sumSq = 0;
    for (let i = 0; i < inputData.length; i++) {
      sumSq += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sumSq / inputData.length);
    const db = rms > 0.000001 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms))) : -60;

    this.onAudioLevel(rms, db);

    // 3. Feed samples into circular sliding window buffer
    for (let i = 0; i < resampled.length; i++) {
      this.audioBuffer.copyWithin(0, 1);
      this.audioBuffer[this.windowSize - 1] = resampled[i];
      this.samplesCollectedSinceStep++;

      if (this.samplesCollectedSinceStep >= this.stepSize) {
        this.samplesCollectedSinceStep = 0;
        // Deliver window snapshot for YAMNet inference
        const windowCopy = new Float32Array(this.audioBuffer);
        this.onAudioWindow(windowCopy, rms, db);
      }
    }
  }

  resampleTo16k(audioData, sourceSampleRate) {
    if (sourceSampleRate === this.targetSampleRate) {
      return audioData;
    }
    const ratio = sourceSampleRate / this.targetSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio;
      const index = Math.floor(srcIdx);
      const frac = srcIdx - index;
      const s0 = audioData[index] || 0;
      const s1 = audioData[index + 1] || s0;
      result[i] = s0 + frac * (s1 - s0);
    }
    return result;
  }

  getFrequencyData(targetArray) {
    if (this.analyserNode && this.isListening) {
      this.analyserNode.getByteFrequencyData(targetArray);
    }
  }
}

window.MobileAudioEngine = MobileAudioEngine;
