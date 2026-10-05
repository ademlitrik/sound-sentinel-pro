/**
 * AudioEngine handles microphone capture, resampling to 16,000 Hz,
 * sliding audio window management for YAMNet, and RMS/dB level calculation.
 */
class AudioEngine {
  constructor(options = {}) {
    this.targetSampleRate = 16000;
    this.windowSize = 15600; // 0.975 seconds at 16kHz (YAMNet native input)
    this.stepSize = 6400;    // 0.4 seconds step (approx 60% overlap)
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.processorNode = null;
    this.isListening = false;

    // Circular/sliding buffer for 16kHz samples
    this.audioBuffer = new Float32Array(this.windowSize);
    this.samplesCollectedSinceStep = 0;

    // Callbacks
    this.onAudioWindow = options.onAudioWindow || (() => {});
    this.onAudioLevel = options.onAudioLevel || (() => {});
    this.onError = options.onError || console.error;
  }

  async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch (err) {
      this.onError(err);
      return [];
    }
  }

  async start(deviceId = null) {
    if (this.isListening) return;

    try {
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create AnalyserNode for live visualizer
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.sourceNode.connect(this.analyserNode);

      // Create ScriptProcessorNode for raw audio streaming
      // 4096 buffer size at 44.1/48kHz gives chunks ~85-92ms
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isListening) return;

        const inputChannelData = event.inputBuffer.getChannelData(0);
        this.processIncomingChunk(inputChannelData, event.inputBuffer.sampleRate);
      };

      this.sourceNode.connect(this.processorNode);
      // Connect to dummy destination so onaudioprocess fires continuously
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
      this.processorNode.onaudioprocess = null;
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
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffer.fill(0);
    this.samplesCollectedSinceStep = 0;
  }

  processIncomingChunk(inputData, inputSampleRate) {
    // 1. Calculate RMS and dBFS
    let sumSquares = 0;
    for (let i = 0; i < inputData.length; i++) {
      sumSquares += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sumSquares / inputData.length);
    const db = Math.max(-90, Math.min(0, 20 * Math.log10(rms + 1e-5)));
    this.onAudioLevel(rms, db);

    // 2. Downsample chunk to 16,000 Hz
    const resampledChunk = this.resample(inputData, inputSampleRate, this.targetSampleRate);

    // 3. Push into circular buffer
    for (let i = 0; i < resampledChunk.length; i++) {
      // Shift left by 1
      this.audioBuffer.copyWithin(0, 1);
      this.audioBuffer[this.windowSize - 1] = resampledChunk[i];
    }

    this.samplesCollectedSinceStep += resampledChunk.length;

    // 4. If step size reached, trigger inference callback with window clone
    if (this.samplesCollectedSinceStep >= this.stepSize) {
      this.samplesCollectedSinceStep = 0;
      // Copy window
      const windowSnapshot = new Float32Array(this.audioBuffer);
      this.onAudioWindow(windowSnapshot, rms, db);
    }
  }

  /**
   * Resamples PCM Float32Array from inputRate to outputRate using linear interpolation
   */
  resample(buffer, inputRate, outputRate) {
    if (inputRate === outputRate) return buffer;
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(buffer.length - 1, Math.ceil(srcIndex));
      const frac = srcIndex - indexFloor;
      result[i] = buffer[indexFloor] * (1 - frac) + buffer[indexCeil] * frac;
    }
    return result;
  }

  /**
   * Feeds external audio (e.g. uploaded file or synthesized test sound) directly into pipeline
   */
  async processAudioBuffer(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const resampled = this.resample(channelData, audioBuffer.sampleRate, this.targetSampleRate);

    // Process in windowSize steps
    const step = 8000; // 0.5s step for file processing
    const snapshots = [];

    for (let start = 0; start + this.windowSize <= resampled.length; start += step) {
      const chunk = resampled.subarray(start, start + this.windowSize);
      snapshots.push(new Float32Array(chunk));
    }

    if (snapshots.length === 0 && resampled.length > 0) {
      // Pad to windowSize if shorter
      const padded = new Float32Array(this.windowSize);
      padded.set(resampled.subarray(0, Math.min(resampled.length, this.windowSize)));
      snapshots.push(padded);
    }

    return snapshots;
  }
}

if (typeof module !== 'undefined') {
  module.exports = AudioEngine;
}
