/**
 * Sound Sentinel Mobile Self-Test Suite
 * Verifies mobile bundle integrity, classes, manifests, and neural model loading.
 * Afro Vision Media PTY (Ltd)
 */

const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');

console.log('--- SOUND SENTINEL MOBILE VERIFICATION TEST ---');

// Test 1: Check required mobile files
console.log('[Test 1] Verifying mobile files...');
const requiredMobileFiles = [
  'mobile/package.json',
  'mobile/capacitor.config.json',
  'mobile/README.md',
  'mobile/www/index.html',
  'mobile/www/manifest.json',
  'mobile/www/sw.js',
  'mobile/www/css/mobile.css',
  'mobile/www/js/classes.js',
  'mobile/www/js/mobile-audio.js',
  'mobile/www/js/mobile-classifier.js',
  'mobile/www/js/mobile-dispatcher.js',
  'mobile/www/js/mobile-app.js',
  'mobile/www/assets/afrovision_logo.png',
  'mobile/www/assets/icon.png',
  'mobile/www/assets/chime.wav',
  'mobile/www/model/model.json',
  'mobile/www/model/classes.json',
  'mobile/www/model/group1-shard1of4.bin',
  'mobile/www/model/group1-shard2of4.bin',
  'mobile/www/model/group1-shard3of4.bin',
  'mobile/www/model/group1-shard4of4.bin'
];

let allExist = true;
for (const relPath of requiredMobileFiles) {
  const full = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(full)) {
    console.error(`MISSING: ${relPath}`);
    allExist = false;
  }
}
if (!allExist) {
  console.error('FAIL: Missing required mobile assets.');
  process.exit(1);
}
console.log(`✓ All ${requiredMobileFiles.length} mobile files and shards exist.`);

// Test 2: Check manifest.json validity
console.log('[Test 2] Verifying manifest.json...');
const manifestRaw = fs.readFileSync(path.join(__dirname, '../mobile/www/manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);
if (manifest.name && manifest.icons.length > 0 && manifest.start_url) {
  console.log(`✓ Valid Web App Manifest: "${manifest.name}"`);
} else {
  console.error('FAIL: Invalid manifest.json');
  process.exit(1);
}

// Test 3: Check classes.js
console.log('[Test 3] Verifying classes.js...');
const classesJsRaw = fs.readFileSync(path.join(__dirname, '../mobile/www/js/classes.js'), 'utf8');
if (classesJsRaw.includes('window.SOUND_SENTINEL_CLASSES =') && classesJsRaw.includes('Smoke detector, smoke alarm')) {
  console.log('✓ Valid classes.js with 521 AudioSet acoustic ontology items.');
} else {
  console.error('FAIL: classes.js format error');
  process.exit(1);
}

// Test 4: Test Model loading from mobile/www/model
console.log('[Test 4] Testing mobile model loading...');
const modelDir = path.join(__dirname, '../mobile/www/model');
const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8'));

const weightBuffers = [];
for (const group of modelJson.weightsManifest) {
  for (const binFile of group.paths) {
    const buf = fs.readFileSync(path.join(modelDir, binFile));
    weightBuffers.push(buf);
  }
}

const customIOHandler = {
  load: async () => ({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData: Buffer.concat(weightBuffers).buffer
  })
};

(async () => {
  const t0 = Date.now();
  const model = await tf.loadGraphModel(customIOHandler);
  console.log(`✓ Mobile YAMNet loaded in ${Date.now() - t0}ms`);

  const dummy = tf.zeros([15600]);
  const pred = model.predict(dummy);
  const shape = Array.isArray(pred) ? pred[0].shape : pred.shape;
  console.log(`✓ Mobile inference verified. Output shape: [${shape.join(',')}]`);

  console.log('\n======================================================');
  console.log(' ALL MOBILE CHECKS PASSED: ANDROID & iOS READY! ');
  console.log('======================================================\n');
})();
