/**
 * Sound Sentinel Mobile - Acoustic Neural Classifier
 * Edge AI inference using TensorFlow.js & Google YAMNet (521 classes)
 * Afro Vision Media PTY (Ltd)
 */

class MobileClassifier {
  constructor() {
    this.model = null;
    this.classes = [];
    this.classMap = new Map();
    this.isLoaded = false;
    this.isWarmedUp = false;
  }

  async init(progressCallback = () => {}) {
    progressCallback('Loading AudioSet Acoustic Ontology...');
    if (window.SOUND_SENTINEL_CLASSES && window.SOUND_SENTINEL_CLASSES.length > 0) {
      this.classes = window.SOUND_SENTINEL_CLASSES;
    } else {
      const resp = await fetch('./model/classes.json');
      this.classes = await resp.json();
    }

    this.classes.forEach((c) => this.classMap.set(c.index, c));
    console.log(`[Classifier] Loaded ${this.classes.length} acoustic ontology classes.`);

    progressCallback('Loading On-Device YAMNet Weights...');
    const t0 = performance.now();

    // Load GraphModel directly from local app model package
    this.model = await tf.loadGraphModel('./model/model.json');
    console.log(`[Classifier] Neural DSP model loaded in ${(performance.now() - t0).toFixed(1)}ms`);

    progressCallback('Warming up Neural Network...');
    // Warm up model with a zero tensor so first inference is instantaneous
    tf.tidy(() => {
      const dummy = tf.zeros([15600]);
      this.model.predict(dummy);
    });

    this.isLoaded = true;
    this.isWarmedUp = true;
    progressCallback('Edge Neural Engine Online.');
  }

  /**
   * Run inference on a 15,600-sample window Float32Array (0.975s at 16kHz)
   */
  classify(audioSamples, minThreshold = 0.35, allowedCategories = null) {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model is not initialized.');
    }

    return tf.tidy(() => {
      const inputTensor = tf.tensor1d(audioSamples);
      const prediction = this.model.predict(inputTensor);

      // Extract scores: shape [numFrames, 521] or [521]
      let scores;
      if (Array.isArray(prediction)) {
        scores = prediction[0];
      } else {
        scores = prediction;
      }

      // If output has multiple frames, take mean over time dimension
      if (scores.shape.length > 1) {
        scores = scores.mean(0);
      }

      const scoreValues = scores.dataSync();
      const detected = [];

      for (let i = 0; i < scoreValues.length; i++) {
        const score = scoreValues[i];
        if (score >= minThreshold) {
          const classInfo = this.classMap.get(i);
          if (classInfo) {
            if (!allowedCategories || allowedCategories.has(classInfo.category)) {
              detected.push({
                index: i,
                name: classInfo.name,
                category: classInfo.category,
                emoji: classInfo.emoji || '🔊',
                alertLevel: classInfo.alertLevel || 'info',
                confidence: score
              });
            }
          }
        }
      }

      // Sort descending by confidence
      detected.sort((a, b) => b.confidence - a.confidence);
      return detected;
    });
  }
}

window.MobileClassifier = MobileClassifier;
