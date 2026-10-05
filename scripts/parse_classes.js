const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'model', 'yamnet_class_map.csv');
const lines = fs.readFileSync(csvPath, 'utf8').replace(/\r/g, '').trim().split('\n').slice(1);

const categoryRules = [
  {
    category: 'Emergency & Safety',
    emoji: '🚨',
    alertLevel: 'critical',
    keywords: [
      'alarm', 'siren', 'smoke detector', 'fire alarm', 'screaming', 'glass', 'shatter',
      'explosion', 'gunshot', 'burglar', 'emergency vehicle', 'car alarm', 'fire engine',
      'police car', 'ambulance'
    ]
  },
  {
    category: 'Baby & Care',
    emoji: '👶',
    alertLevel: 'high',
    keywords: [
      'baby cry', 'infant cry', 'crying', 'sobbing', 'babbling', 'child speech',
      'children shouting', 'whimper', 'wail, moan'
    ]
  },
  {
    category: 'Security & Access',
    emoji: '🚪',
    alertLevel: 'medium',
    keywords: [
      'knock', 'doorbell', 'ding-dong', 'door', 'sliding door', 'cupboard open', 'drawer open',
      'footsteps', 'walk', 'run', 'creak', 'keys', 'slam', 'lock', 'rattle', 'pounding',
      'shuffle', 'footstep'
    ]
  },
  {
    category: 'Pets & Animals',
    emoji: '🐾',
    alertLevel: 'medium',
    keywords: [
      'dog', 'bark', 'howl', 'bow-wow', 'growling', 'cat', 'meow', 'purr', 'hiss',
      'bird', 'chirp', 'squawk', 'animal', 'canidae', 'domestic animals, pets'
    ]
  },
  {
    category: 'Domestic & Kitchen',
    emoji: '🍳',
    alertLevel: 'low',
    keywords: [
      'dishes', 'pots, and pans', 'cutlery', 'silverware', 'water tap', 'faucet',
      'toilet flush', 'microwave', 'blender', 'kettle', 'frying', 'boiling', 'sink',
      'bathtub', 'vacuum cleaner', 'hair dryer', 'clock', 'tick-tock', 'timer',
      'refrigerator', 'dishwasher', 'washing machine', 'appliance', 'liquid', 'pour',
      'drip', 'splash', 'steam'
    ]
  },
  {
    category: 'People & Voice',
    emoji: '🗣️',
    alertLevel: 'info',
    keywords: [
      'speech', 'conversation', 'narration', 'whisper', 'whispering', 'laughter', 'giggle',
      'snicker', 'chuckle', 'belly laugh', 'cough', 'throat clearing', 'throat-clearing',
      'sneeze', 'snoring', 'chatter', 'applause', 'clapping', 'cheering', 'yawn', 'sigh',
      'singing', 'shout', 'yell', 'whoop', 'bellow', 'humming', 'whistling', 'breathing',
      'pant', 'wheeze', 'gargling'
    ]
  },
  {
    category: 'Tools & Impacts',
    emoji: '🔨',
    alertLevel: 'low',
    keywords: [
      'hammer', 'drill', 'sawing', 'power tool', 'thud', 'bang', 'wood', 'metallic',
      'clatter', 'tap', 'click', 'snap'
    ]
  },
  {
    category: 'Music & Media',
    emoji: '🎵',
    alertLevel: 'info',
    keywords: [
      'music', 'musical instrument', 'guitar', 'piano', 'drum', 'synthesizer', 'radio',
      'television', 'song', 'tune', 'melody', 'bass', 'orchestra', 'choir'
    ]
  }
];

const classes = lines.map(line => {
  const match = line.match(/^(\d+),([^,]+),\"?(.*?)\"?$/);
  if (!match) return null;
  const index = parseInt(match[1]);
  const mid = match[2];
  const name = match[3].replace(/\"/g, '');

  let matchedCategory = 'Other Ambient';
  let matchedEmoji = '🔊';
  let alertLevel = 'info';

  const lower = name.toLowerCase();
  for (const rule of categoryRules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      matchedCategory = rule.category;
      matchedEmoji = rule.emoji;
      alertLevel = rule.alertLevel;
      break;
    }
  }

  return {
    index,
    mid,
    name,
    category: matchedCategory,
    emoji: matchedEmoji,
    alertLevel
  };
}).filter(Boolean);

const outputPath = path.join(__dirname, '..', 'model', 'classes.json');
fs.writeFileSync(outputPath, JSON.stringify(classes, null, 2));

console.log(`Processed ${classes.length} classes into ${outputPath}`);
const categoryCounts = {};
classes.forEach(c => {
  categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
});
console.log('Category breakdown:', categoryCounts);
