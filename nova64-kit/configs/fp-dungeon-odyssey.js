// NOVA64 TEMPLATE: fp-dungeon-odyssey
// ============================== CONFIG ==============================
// Chat words that pick this template. Edit them to change when it is used:
// a game word picks the kind of game, a style word picks this look over the others.
const KEYWORDS = {
  game: ['dungeon', 'crawler', 'rpg', 'wizardry', 'labyrinth', 'maze'],
  style: ['neon', 'cyber', 'synth', 'grid', 'digital', 'hacker', 'tron', 'data', 'electric', 'vapor', 'laser', 'sci-fi', 'scifi', 'space', 'holo']
};

const THEME = {
  wallStyle: 'grid', // 'stone' = torchlit stone, 'grid' = neon edge strips
  wall: 0x0c1430,
  floor: 0x060b1e,
  ceiling: 0x040716,
  fog: 0x02040e,
  fogNear: 2,
  fogFar: 12,
  ambient: 0x0a1030,
  ambientLevel: 0.3,
  lantern: 0x8fa8ff, // light the hero carries
  lanternLevel: 0.9,
  stripGlow: 0.7, // neon strip brightness: keep low so walls stay dark
  bloom: 0.2, // neon strips sit next to the camera; strong bloom smears them over the frame
  accent: 0x22e6ff, // torches (stone) or wall strips (grid)
  exit: 0xff3fa4,
  ui: {
    title: [34, 230, 255],
    text: [215, 240, 255],
    dim: [110, 140, 180],
    panel: [5, 10, 30],
    border: [255, 63, 164],
  },
};

const TEXT = {
  title: 'SHARDGRID',
  subtitle: 'ECHOES OF THE ACCESS TERMINAL',
  prompt: '> shardgrid --enter delta-7',
  victory: 'UPLINK RESTORED',
  defeat: 'SIGNAL LOST',
  sealed: 'ACCESS DENIED. Purge the corrupted admin first.',
};

// One short paragraph per screen before play. Use [] to skip the story.
const STORY = [
  'The Shardgrid was a city of light. Then the Codestone went dark.',
  'You are KAI, the last courier with a valid access key.',
  'Purge the corrupted admin and reach the magenta uplink.',
];

// Party members (1 to 4). mp 0 = no spells.
const PARTY = [{ name: 'KAI', hp: 48, mp: 20, atk: 8, color: [34, 230, 255] }];

// shape: 'beast' | 'spirit' | 'knight'
const ENEMIES = [
  { name: 'GLITCH DRONE', hp: 14, atk: 4, color: 0x3a5a8f, glow: 0x22e6ff, shape: 'spirit' },
  { name: 'DATA LEECH', hp: 16, atk: 5, color: 0x6a3a9a, glow: 0xff3fa4, shape: 'beast' },
  { name: 'FIREWALL SENTRY', hp: 22, atk: 6, color: 0x8a7040, glow: 0xffd23c, shape: 'knight' },
];
const BOSS = { name: 'CORRUPTED ADMIN', hp: 70, atk: 8, color: 0x5a2a7a, glow: 0xff3fa4, shape: 'knight', boss: true };

// The engine generates a solvable maze: cols x rows rooms (3-9 x 3-7), a seed
// (change it for a new layout), loops 0-0.4 (more = fewer dead ends), torches
// 4-8 (lights) and chests 1-3 (heal). The exit is the farthest point; the
// boss guards the corridor before it.
const LAYOUT = { cols: 7, rows: 5, seed: 2077, loops: 0.25, torches: 6, chests: 2 };

const ENCOUNTER_CHANCE = 0.14; // per step on plain floor, after a short grace
const SPELL_COST = 4;
