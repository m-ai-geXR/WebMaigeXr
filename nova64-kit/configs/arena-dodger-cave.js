// NOVA64 TEMPLATE: arena-dodger-cave
// ============================== CONFIG ==============================
const THEME = {
  arenaStyle: 'cave', // 'cave' = crystal cavern, 'neon' = glowing ring grid
  floor: 0x1a1428,
  wall: 0x3a2c50, // stalagmites (cave) or pylons (neon)
  fog: 0x05030a,
  fogNear: 14,
  fogFar: 40,
  ambient: 0x2a2040,
  ambientLevel: 0.6,
  accent: 0xc040ff, // arena rim, crystals, floor lines
  sky: [0x05030a, 0x140a24],
  bloom: 0.7,
  ui: {
    title: [255, 120, 230],
    text: [235, 225, 250],
    dim: [150, 130, 175],
    panel: [12, 8, 22],
    border: [160, 90, 230],
  },
};

const TEXT = {
  title: 'CRYSTAL CAVE',
  subtitle: 'GATHER THE GLOW, FLEE THE DARK',
  prompt: 'Press Space to descend',
  over: 'THE CAVE GOES DARK',
};

// Strings or { text, art }, art: 'castle' | 'city' | 'party' | 'portal'. [] skips.
const STORY = [
  { text: 'Deep below the mountain, the crystals still remember the sun.', art: 'castle' },
  { text: 'A lone drone slips in to gather their light before it fades.', art: 'party' },
  { text: 'But the cave has guardians, and they wake when the light moves.', art: 'portal' },
];

const PLAYER = { name: 'GLIMMER', color: 0x44e8ff, speed: 7 };

const GEM = { name: 'CRYSTAL', color: 0xff3fd0, points: 10, onScreen: 3 };

// behavior: 'chaser' (homes in), 'orbiter' (circles the arena), 'dasher' (charges then lunges)
const ENEMIES = [
  { name: 'BAT', behavior: 'orbiter', color: 0x8855aa, glow: 0xff5577, speed: 3.5, size: 0.45 },
  { name: 'SHADE', behavior: 'chaser', color: 0x402060, glow: 0x9a66ff, speed: 2.6, size: 0.5 },
  { name: 'GOLEM SHARD', behavior: 'dasher', color: 0x6a5a80, glow: 0xffaa33, speed: 12, size: 0.55 },
];

const DIFFICULTY = {
  lives: 3,
  waveTime: 12, // seconds between waves
  firstWave: 2, // enemies in wave 1
  perWave: 1, // extra enemies each wave
  maxEnemies: 12,
  dashCooldown: 1.4,
};
