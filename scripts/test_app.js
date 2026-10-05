const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');

async function runTests() {
  console.log('--- SOUND SENTINEL SELF-TEST ---');

  // Test 1: Check files exist
  const requiredFiles = [
    'package.json',
    'src/main.js',
    'src/preload.js',
    'src/renderer/index.html',
    'src/renderer/styles.css',
    'src/renderer/app.js',
    'src/renderer/audio-engine.js',
    'src/renderer/audio-synth.js',
    'src/renderer/visualizer.js',
    'src/assets/icon.png',
    'src/assets/icon.svg',
    'src/assets/chime.wav',
    'model/model.json',
    'model/classes.json',
    'model/group1-shard1of4.bin',
    'model/group1-shard2of4.bin',
    'model/group1-shard3of4.bin',
    'model/group1-shard4of4.bin'
  ];

  console.log('[Test 1] Verifying all required application files...');
  for (const f of requiredFiles) {
    const fullPath = path.resolve(f);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing required file: ${f}`);
    }
  }
  console.log('✓ All 17 core files exist.');

  // Test 2: Check classes.json
  console.log('[Test 2] Verifying classes.json...');
  const classes = JSON.parse(fs.readFileSync(path.resolve('model/classes.json'), 'utf8'));
  if (classes.length !== 521) {
    throw new Error(`Expected 521 classes, found ${classes.length}`);
  }
  const alarmClass = classes.find(c => c.name.toLowerCase().includes('smoke detector') || c.name.toLowerCase().includes('smoke alarm'));
  if (!alarmClass) throw new Error('Smoke detector class not found in classes.json');
  console.log(`✓ 521 classes loaded successfully. Alarm class found: [${alarmClass.index}] ${alarmClass.name}`);

  // Test 3: Load YAMNet Model with local IOHandler
  console.log('[Test 3] Loading YAMNet model graph from local weights...');
  const modelDir = path.resolve('model');
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8'));

  const weightBuffers = [];
  for (const group of modelJson.weightsManifest) {
    for (const bin of group.paths) {
      weightBuffers.push(fs.readFileSync(path.join(modelDir, bin)));
    }
  }
  const totalLen = weightBuffers.reduce((sum, b) => sum + b.length, 0);
  const merged = Buffer.concat(weightBuffers, totalLen);
  const ab = merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength);

  const customIOHandler = {
    load: async () => ({
      modelTopology: modelJson.modelTopology,
      weightSpecs: modelJson.weightsManifest.flatMap(m => m.weights),
      weightData: ab,
      format: modelJson.format,
      generatedBy: modelJson.generatedBy,
      convertedBy: modelJson.convertedBy,
      signature: modelJson.signature,
      userDefinedMetadata: modelJson.userDefinedMetadata
    })
  };

  const t0 = Date.now();
  const model = await tf.loadGraphModel(customIOHandler);
  console.log(`✓ Model loaded in ${Date.now() - t0}ms`);

  // Test 4: Run inference
  console.log('[Test 4] Running test inference (15,600 audio samples)...');
  const dummyAudio = tf.zeros([15600]);
  const output = model.predict(dummyAudio);
  const scoresTensor = Array.isArray(output) ? output[0] : output;
  const scores = await scoresTensor.data();
  console.log(`✓ Inference executed successfully! Output shape: [${scoresTensor.shape}], Scores count: ${scores.length}`);

  // Test 5: Verify downsampling logic
  console.log('[Test 5] Testing 48kHz -> 16kHz resampler logic...');
  const AudioEngine = require('../src/renderer/audio-engine.js');
  const engine = new AudioEngine();
  const test48k = new Float32Array(4800); // 0.1s at 48kHz
  for (let i = 0; i < test48k.length; i++) test48k[i] = Math.sin(2 * Math.PI * 440 * (i / 48000));
  const resampled16k = engine.resample(test48k, 48000, 16000);
  console.log(`✓ Resampled 48,000 samples/sec -> 16,000 samples/sec (4800 samples -> ${resampled16k.length} samples)`);
  if (resampled16k.length !== 1600) {
    throw new Error(`Expected 1600 resampled samples, got ${resampled16k.length}`);
  }

  console.log('\n=======================================');
  console.log(' ALL TESTS PASSED! APPLICATION IS READY');
  console.log('=======================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
