// NOVA64 TEMPLATE: lane-runner-corridor
// ============================== CONFIG ==============================
// Chat words that pick this template. Edit them to change when it is used:
// a game word picks the kind of game, a style word picks this look over the others.
const KEYWORDS = {
  game: ['runner', 'endless run', 'lane', 'subway', 'temple run'],
  style: ['torch', 'stone', 'cave', 'cavern', 'crypt', 'tomb', 'mine', 'lava', 'medieval', 'castle', 'forest', 'corridor', 'ice', 'frost', 'crystal', 'fantasy']
};

const THEME = {
  trackStyle: 'corridor', // 'grid' = neon floor and pylons, 'corridor' = torchlit walls
  floor: 0x3a2c22,
  wall: 0x6a5848, // pylons (grid) or side walls (corridor)
  fog: 0x0a0604,
  fogNear: 6,
  fogFar: 48,
  ambient: 0x442f22,
  ambientLevel: 0.55,
  accent: 0xff9a2e, // track lines, pylon lights, torches
  sky: [0x0a0515, 0x2a1408], // gradient skybox top, bottom
  bloom: 0.8,
  ui: {
    title: [255, 210, 60],
    text: [235, 225, 205],
    dim: [150, 135, 115],
    panel: [12, 9, 16],
    border: [110, 85, 55],
  },
};

const TEXT = {
  title: 'CRYPT RUN',
  subtitle: 'FLEE THE COLLAPSING TOMB',
  prompt: 'Press Space to flee',
  over: 'THE CRYPT CLAIMS YOU',
};

// One short slide per screen before play. Strings or { text, art }, art:
// 'castle' | 'city' | 'party' | 'portal'. Use [] to skip the story.
const STORY = [
  { text: 'The king\'s tomb was never meant to be opened.', art: 'castle' },
  { text: 'Now its halls are falling. Run, leap the blades, grab the gold.', art: 'party' },
  { text: 'Something ancient is right behind you.', art: 'portal' },
];

const PLAYER = { name: 'ROWAN', color: 0xffd8a0, trail: 0xff6a20 };

// What appears on the track: barriers block a lane, hurdles must be jumped,
// pickups score, shields absorb one hit.
const HAZARDS = {
  barrier: { name: 'FALLEN STONE', color: 0x5a4a3c, glow: 0xff5522 },
  hurdle: { name: 'BLADE', color: 0xc8c8d0 },
  pickup: { name: 'GOLD', color: 0xffd23c, points: 10 },
  shield: { name: 'WARD', color: 0x9a55ff },
};

const DIFFICULTY = {
  lives: 3,
  startSpeed: 14, // world units per second
  maxSpeed: 30,
  ramp: 0.3, // speed gained per second
  rowGap: 17, // distance between obstacle rows at the start
  minRowGap: 10, // ...and at top speed
  hurdleChance: 0.35,
  shieldChance: 0.06,
};
