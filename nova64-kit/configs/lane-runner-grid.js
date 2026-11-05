// NOVA64 TEMPLATE: lane-runner-grid
// ============================== CONFIG ==============================
// Chat words that pick this template. Edit them to change when it is used:
// a game word picks the kind of game, a style word picks this look over the others.
const KEYWORDS = {
  game: ['runner', 'endless run', 'lane', 'subway', 'temple run'],
  style: ['neon', 'cyber', 'synth', 'grid', 'digital', 'hacker', 'tron', 'data', 'electric', 'vapor', 'laser', 'sci-fi', 'scifi', 'space', 'holo']
};

const THEME = {
  trackStyle: 'grid', // 'grid' = neon floor and pylons, 'corridor' = torchlit walls
  floor: 0x060b1e,
  wall: 0x0c1430, // pylons (grid) or side walls (corridor)
  fog: 0x02040e,
  fogNear: 8,
  fogFar: 60,
  ambient: 0x1a2650,
  ambientLevel: 0.6,
  accent: 0x22e6ff, // track lines, pylon lights, torches
  sky: [0x050a1e, 0x1a0830], // gradient skybox top, bottom
  bloom: 0.5,
  ui: {
    title: [34, 230, 255],
    text: [215, 240, 255],
    dim: [110, 140, 180],
    panel: [5, 10, 30],
    border: [255, 63, 164],
  },
};

const TEXT = {
  title: 'SHARDGRID RUN',
  subtitle: 'OUTRUN THE FIREWALL',
  prompt: 'Press Space to run',
  over: 'CONNECTION LOST',
};

// One short slide per screen before play. Strings or { text, art }, art:
// 'castle' | 'city' | 'party' | 'portal'. Use [] to skip the story.
const STORY = [
  { text: 'The Shardgrid is collapsing. Its data shards scatter down the lanes.', art: 'city' },
  { text: 'KAI rides the last open uplink. Switch lanes, jump the gates.', art: 'party' },
  { text: 'Grab every shard you can. The firewall never stops coming.', art: 'portal' },
];

const PLAYER = { name: 'KAI', color: 0x22e6ff, trail: 0xff3fa4 };

// What appears on the track: barriers block a lane, hurdles must be jumped,
// pickups score, shields absorb one hit.
const HAZARDS = {
  barrier: { name: 'FIREWALL', color: 0x3a1030, glow: 0xff3fa4 },
  hurdle: { name: 'GATE', color: 0xffd23c },
  pickup: { name: 'SHARD', color: 0x22e6ff, points: 10 },
  shield: { name: 'SHIELD', color: 0x7dff9a },
};

const DIFFICULTY = {
  lives: 3,
  startSpeed: 16, // world units per second
  maxSpeed: 34,
  ramp: 0.35, // speed gained per second
  rowGap: 16, // distance between obstacle rows at the start
  minRowGap: 9, // ...and at top speed
  hurdleChance: 0.3,
  shieldChance: 0.06,
};
