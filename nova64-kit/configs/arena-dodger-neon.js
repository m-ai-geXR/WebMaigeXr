// NOVA64 TEMPLATE: arena-dodger-neon
// ============================== CONFIG ==============================
const THEME = {
  arenaStyle: 'neon', // 'cave' = crystal cavern, 'neon' = glowing ring grid
  floor: 0x060b1e,
  wall: 0x0c1430, // stalagmites (cave) or pylons (neon)
  fog: 0x02040e,
  fogNear: 14,
  fogFar: 40,
  ambient: 0x1a2650,
  ambientLevel: 0.6,
  accent: 0x22e6ff, // arena rim, crystals, floor lines
  sky: [0x050a1e, 0x1a0830],
  bloom: 0.6,
  ui: {
    title: [34, 230, 255],
    text: [215, 240, 255],
    dim: [110, 140, 180],
    panel: [5, 10, 30],
    border: [255, 63, 164],
  },
};

const TEXT = {
  title: 'NEON ORBIT',
  subtitle: 'HOLD THE RING',
  prompt: 'Press Space to launch',
  over: 'ORBIT DECAYED',
};

// Strings or { text, art }, art: 'castle' | 'city' | 'party' | 'portal'. [] skips.
const STORY = [
  { text: 'At the edge of the grid spins the last energy ring.', art: 'city' },
  { text: 'One pilot holds it, gathering cores to keep the lights on.', art: 'party' },
  { text: 'The swarm has found the signal. They are coming in waves.', art: 'portal' },
];

const PLAYER = { name: 'ORBIT-7', color: 0x22e6ff, speed: 7.5 };

const GEM = { name: 'CORE', color: 0xffd23c, points: 10, onScreen: 3 };

// behavior: 'chaser' (homes in), 'orbiter' (circles the arena), 'dasher' (charges then lunges)
const ENEMIES = [
  { name: 'DRIFTER', behavior: 'orbiter', color: 0x3a2a6a, glow: 0xff3fa4, speed: 4, size: 0.45 },
  { name: 'SEEKER', behavior: 'chaser', color: 0x5a1a40, glow: 0xff5577, speed: 2.8, size: 0.5 },
  { name: 'LANCER', behavior: 'dasher', color: 0x4a4a1a, glow: 0xffd23c, speed: 13, size: 0.5 },
];

const DIFFICULTY = {
  lives: 3,
  waveTime: 11, // seconds between waves
  firstWave: 2, // enemies in wave 1
  perWave: 1, // extra enemies each wave
  maxEnemies: 12,
  dashCooldown: 1.3,
};
