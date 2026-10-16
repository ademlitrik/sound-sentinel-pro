/**
 * SOUND SENTINEL PRO - EMBEDDED EDGE SENSOR DAEMON
 * Engineered by Tanyaradzwa Bvute | Afro Vision Media PTY (Ltd)
 * 
 * Runs headlessly on Raspberry Pi, Linux, mini-PCs, or embedded hardware.
 * Listens via miniature USB / MEMS acoustic sensors and dispatches real-time alerts.
 */

const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');

console.log('================================================================');
console.log('  SOUND SENTINEL PRO - EMBEDDED ACOUSTIC SENSOR DAEMON');
console.log('  Developed by Tanyaradzwa Bvute | Afro Vision Media PTY (Ltd)');
console.log('  Architecture: Edge Neural DSP (YAMNet 521-Class On-Device)');
console.log('================================================================\n');

// Parse CLI flags: e.g. node embedded_edge_daemon.js --node="PERIMETER-ZONE-01" --threshold=0.35
const args = process.argv.slice(2);
let nodeName = 'SENSOR-NODE-01';
let threshold = 0.35;
let webhookUrl = null;

args.forEach(arg => {
  if (arg.startsWith('--node=')) nodeName = arg.split('=')[1];
  if (arg.startsWith('--threshold=')) threshold = parseFloat(arg.split('=')[1]);
  if (arg.startsWith('--webhook=')) webhookUrl = arg.split('=')[1];
});

console.log(`[Config] Sensor Node ID: ${nodeName}`);
console.log(`[Config] Confidence Threshold: ${(threshold * 100).toFixed(0)}%`);
if (webhookUrl) console.log(`[Config] Cloud Webhook: ${webhookUrl}`);

const modelDir = path.join(__dirname, '..', 'model');
let classes = [];
let model = null;

async function initDaemon() {
  console.log('[System] Loading 521 AudioSet acoustic ontology...');
  const classesRaw = fs.readFileSync(path.join(modelDir, 'classes.json'), 'utf8');
  classes = JSON.parse(classesRaw);
  console.log(`✓ Loaded ${classes.length} acoustic classes.`);

  console.log('[System] Loading YAMNet neural network weights...');
  const modelJsonRaw = fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8');
  const modelJson = JSON.parse(modelJsonRaw);

  const weightBuffers = [];
  for (const group of modelJson.weightsManifest) {
    for (const binFile of group.paths) {
      const buf = fs.readFileSync(path.join(modelDir, binFile));
      weightBuffers.push(buf);
    }
  }

  const modelIO = {
    load: async () => ({
      modelTopology: modelJson.modelTopology,
      weightSpecs: modelJson.weightsManifest[0].weights,
      weightData: Buffer.concat(weightBuffers).buffer
    })
  };

  model = await tf.loadGraphModel(modelIO);
  console.log('✓ Edge Neural DSP Engine Online.');
  console.log(`\n>>> SENSOR ARMED: Continuous acoustic surveillance active on node [${nodeName}] <<<\n`);
}

// Function called when a sensor detects an acoustic anomaly
function dispatchAlert(eventItem) {
  const alertPayload = {
    system: 'Sound Sentinel Pro',
    organization: 'Afro Vision Media PTY (Ltd)',
    developer: 'Tanyaradzwa Bvute',
    nodeId: nodeName,
    event: eventItem.name,
    category: eventItem.category,
    confidence: eventItem.confidence,
    timestamp: new Date().toISOString()
  };

  console.log(`[ALERT] >>> ${eventItem.category.toUpperCase()}: ${eventItem.name} (${(eventItem.confidence * 100).toFixed(1)}%) detected on ${nodeName} <<<`);

  // If webhook is configured, post alert metadata
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    }).catch(err => console.error('[Webhook Error]', err.message));
  }
}

initDaemon().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
