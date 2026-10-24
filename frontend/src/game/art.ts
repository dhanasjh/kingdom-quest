// AI-generated (Nano Banana) art, bundled. All characters are ORIGINAL designs.
export const CHAPTER_BG = [
  require("../../assets/images/game/bg_01.jpg"),
  require("../../assets/images/game/bg_02.jpg"),
  require("../../assets/images/game/bg_03.jpg"),
  require("../../assets/images/game/bg_04.jpg"),
  require("../../assets/images/game/bg_05.jpg"),
  require("../../assets/images/game/bg_06.jpg"),
  require("../../assets/images/game/bg_07.jpg"),
  require("../../assets/images/game/bg_08.jpg"),
  require("../../assets/images/game/bg_09.jpg"),
  require("../../assets/images/game/bg_10.jpg"),
  require("../../assets/images/game/bg_11.jpg"),
  require("../../assets/images/game/bg_12.jpg"),
  require("../../assets/images/game/bg_13.jpg"),
  require("../../assets/images/game/bg_14.jpg"),
  require("../../assets/images/game/bg_15.jpg"),
  require("../../assets/images/game/bg_16.jpg"),
];

// 6 color groups × 3 characters (group-major). Index = group * 3 + variant.
export const CHARACTER_POOL = [
  require("../../assets/images/game/char_boy.png"),
  require("../../assets/images/game/char_ninja.png"),
  require("../../assets/images/game/char_pigtails.png"),
  require("../../assets/images/game/char_strong.png"),
  require("../../assets/images/game/char_monk.png"),
  require("../../assets/images/game/char_lion.png"),
  require("../../assets/images/game/char_cat.png"),
  require("../../assets/images/game/char_hero.png"),
  require("../../assets/images/game/char_duck.png"),
  require("../../assets/images/game/char_mouse.png"),
  require("../../assets/images/game/char_squad.png"),
  require("../../assets/images/game/char_frog.png"),
  require("../../assets/images/game/char_princess.png"),
  require("../../assets/images/game/char_fairy.png"),
  require("../../assets/images/game/char_bunny.png"),
  require("../../assets/images/game/char_dragon.png"),
  require("../../assets/images/game/char_shadow.png"),
  require("../../assets/images/game/char_panda.png"),
];

export const DEFAULT_ROSTER = [0, 3, 6, 9, 12, 15];
export const artFor = (color: number, roster?: number[]) => CHARACTER_POOL[(roster ?? DEFAULT_ROSTER)[color] ?? 0];

export const CHARACTER_NAMES = [
  "Cheeky Chintu", "Ninja Ravi", "Pinky Pigtails", "Mighty Bholu", "Little Monk Tenzin", "Leo the Cub",
  "Whiskers", "Captain Zip", "Dash the Duck", "Squeaky", "Scout Arjun", "Prince Ribbit",
  "Princess Asha", "Fairy Twinkle", "Bunny Bloom", "Ember the Dragon", "Shadow Kiro", "Bao the Panda",
];
// Base 6 heroes are free; one new hero unlocks every 15 levels cleared.
export const HERO_UNLOCK_EVERY = 15;
export const heroUnlockLevel = (idx: number) =>
  DEFAULT_ROSTER.includes(idx) ? 0 : (CHARACTER_POOL.map((_, i) => i).filter((i) => !DEFAULT_ROSTER.includes(i)).indexOf(idx) + 1) * HERO_UNLOCK_EVERY;
