// NOVA64 TEMPLATE: fp-dungeon-wizardry
// ============================== CONFIG ==============================
// Chat words that pick this template. Edit them to change when it is used:
// a game word picks the kind of game, a style word picks this look over the others.
const KEYWORDS = {
  game: ['dungeon', 'crawler', 'rpg', 'wizardry', 'labyrinth', 'maze'],
  style: ['stone', 'torch', 'cave', 'cavern', 'crypt', 'tomb', 'mine', 'lava', 'medieval', 'castle', 'forest', 'corridor', 'ice', 'frost', 'crystal', 'fantasy']
};

const THEME = {
  wallStyle: 'stone', // 'stone' = torchlit stone, 'grid' = neon edge strips
  wall: 0x6a5848,
  floor: 0x2e241c,
  ceiling: 0x1a120c,
  fog: 0x050308,
  fogNear: 2,
  fogFar: 13,
  ambient: 0x442f22,
  ambientLevel: 0.55,
  lantern: 0xffb066, // light the party carries
  accent: 0xff9a2e, // torches (stone) or wall strips (grid)
  exit: 0x9a55ff,
  ui: {
    title: [255, 210, 60],
    text: [235, 225, 205],
    dim: [150, 135, 115],
    panel: [12, 9, 16],
    border: [110, 85, 55],
  },
};

const TEXT = {
  title: 'WIZARDRY 64',
  subtitle: 'PROVING GROUNDS OF THE DEEP',
  prompt: 'Press Space to begin your quest',
  victory: 'THE PARTY ESCAPES!',
  defeat: 'YOUR PARTY HAS FALLEN',
  sealed: 'The portal is sealed. Defeat the guardian.',
};

// One short paragraph per screen before play. Use [] to skip the story.
const STORY = [
  'Beneath the castle lies a maze of stone, built by a mad overlord.',
  'Four adventurers descend with one lantern and a little courage.',
  'Slay the guardian, then step through the violet portal to escape.',
];

// Party members (1 to 4). mp 0 = no spells.
const PARTY = [
  { name: 'ALDRIC', hp: 32, mp: 0, atk: 7, color: [255, 120, 110] },
  { name: 'ELARA', hp: 20, mp: 12, atk: 4, color: [120, 170, 255] },
  { name: 'TORVIN', hp: 26, mp: 6, atk: 5, color: [255, 200, 90] },
  { name: 'SHADE', hp: 22, mp: 0, atk: 6, color: [120, 230, 160] },
];

// shape: 'beast' | 'spirit' | 'knight'
const ENEMIES = [
  { name: 'GIANT RAT', hp: 12, atk: 3, color: 0x8a6a50, glow: 0xff3322, shape: 'beast' },
  { name: 'WISP', hp: 10, atk: 4, color: 0x66ccff, glow: 0x66ccff, shape: 'spirit' },
  { name: 'SKELETON', hp: 18, atk: 5, color: 0xd8d0c0, glow: 0xff5522, shape: 'knight' },
];
const BOSS = { name: 'IRON GUARDIAN', hp: 60, atk: 7, color: 0x556070, glow: 0xff2244, shape: 'knight', boss: true };

// The engine generates a solvable maze: cols x rows rooms (3-9 x 3-7), a seed
// (change it for a new layout), loops 0-0.4 (more = fewer dead ends), torches
// 4-8 (lights) and chests 1-3 (heal). The exit is the farthest point; the
// boss guards the corridor before it.
const LAYOUT = { cols: 7, rows: 5, seed: 1987, loops: 0.15, torches: 6, chests: 2 };

const ENCOUNTER_CHANCE = 0.14; // per step on plain floor, after a short grace
const SPELL_COST = 4;
