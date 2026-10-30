import type { SfxName } from "@/src/game/sound";

export type FestivalId =
  | "diwali" | "holi" | "pongal" | "eid" | "navratri" | "christmas"
  | "new_year" | "lunar_new_year" | "halloween" | "easter" | "onam"
  | "raksha_bandhan" | "ganesh_chaturthi" | "valentines" | "ramadan"
  | "thanksgiving" | "makar_sankranti";
export type FestivalEffectType = "spin" | "burst" | "glow" | "sparkle" | "confetti" | "rhythm" | "wave";
export type FestivalPack = {
  id: FestivalId;
  title: string;
  cost: number;
  tiles: [string, string, string, string, string, string];
  effects: [FestivalEffectType, FestivalEffectType, FestivalEffectType, FestivalEffectType, FestivalEffectType, FestivalEffectType];
  special: string;
  celebration: string;
};
export type FestivalMatch = { color: number; emoji: string; effect: FestivalEffectType; sound: SfxName; label: string; count: number };

// Festival cosmetics stay on the device and are unlocked with earned game coins.
// Effects are per tile color, so a match only triggers the animation tied to that symbol.
export const FESTIVAL_PACKS: FestivalPack[] = [
  { id: "diwali", title: "Diwali Lights", cost: 600, tiles: ["🧨", "🌀", "🪔", "🎇", "🎆", "✨"], effects: ["burst", "spin", "glow", "burst", "burst", "sparkle"], special: "🌀", celebration: "🎆" },
  { id: "holi", title: "Holi Colors", cost: 500, tiles: ["🎨", "💧", "🌈", "🪷", "🥁", "✨"], effects: ["confetti", "wave", "sparkle", "glow", "rhythm", "sparkle"], special: "🌈", celebration: "🎉" },
  { id: "pongal", title: "Pongal Harvest", cost: 450, tiles: ["🪴", "🌾", "🍚", "🪷", "☀️", "🥥"], effects: ["glow", "wave", "confetti", "sparkle", "glow", "confetti"], special: "☀️", celebration: "🎊" },
  { id: "eid", title: "Eid Moonlight", cost: 500, tiles: ["🌙", "⭐", "🕌", "🪔", "🎁", "✨"], effects: ["glow", "sparkle", "wave", "glow", "confetti", "sparkle"], special: "🌙", celebration: "🌟" },
  { id: "navratri", title: "Navratri Garba", cost: 500, tiles: ["💃", "🥁", "🪷", "🔱", "✨", "🎶"], effects: ["rhythm", "rhythm", "sparkle", "burst", "sparkle", "rhythm"], special: "🥁", celebration: "🎉" },
  { id: "christmas", title: "Winter Holidays", cost: 500, tiles: ["🎄", "🎁", "⭐", "❄️", "🍬", "🔔"], effects: ["glow", "confetti", "sparkle", "wave", "confetti", "rhythm"], special: "⭐", celebration: "🎆" },
  { id: "new_year", title: "New Year Sparkle", cost: 500, tiles: ["🎆", "🥂", "🕛", "✨", "🎉", "🎊"], effects: ["burst", "sparkle", "glow", "sparkle", "confetti", "confetti"], special: "🕛", celebration: "🎆" },
  { id: "lunar_new_year", title: "Lunar New Year", cost: 550, tiles: ["🐉", "🏮", "🧧", "🍊", "✨", "🎇"], effects: ["wave", "glow", "confetti", "sparkle", "sparkle", "burst"], special: "🐉", celebration: "🧨" },
  { id: "halloween", title: "Spooky Treats", cost: 500, tiles: ["🎃", "👻", "🦇", "🍬", "🕸️", "🧙"], effects: ["glow", "wave", "burst", "confetti", "wave", "sparkle"], special: "🎃", celebration: "✨" },
  { id: "easter", title: "Easter Garden", cost: 450, tiles: ["🐣", "🥚", "🐰", "🌷", "🧺", "🌼"], effects: ["sparkle", "glow", "wave", "confetti", "confetti", "sparkle"], special: "🥚", celebration: "🌸" },
  { id: "onam", title: "Onam Pookalam", cost: 500, tiles: ["🌼", "🪷", "🌾", "🛶", "🥥", "🎊"], effects: ["sparkle", "glow", "wave", "wave", "confetti", "confetti"], special: "🛶", celebration: "🌼" },
  { id: "raksha_bandhan", title: "Raksha Bandhan", cost: 450, tiles: ["🧵", "🎁", "💛", "🌸", "🍬", "✨"], effects: ["wave", "confetti", "glow", "sparkle", "confetti", "sparkle"], special: "🎁", celebration: "💛" },
  { id: "ganesh_chaturthi", title: "Ganesh Chaturthi", cost: 500, tiles: ["🐘", "🌺", "🥥", "🪔", "🍬", "🌼"], effects: ["wave", "sparkle", "confetti", "glow", "confetti", "sparkle"], special: "🐘", celebration: "🌺" },
  { id: "valentines", title: "Valentine's Garden", cost: 450, tiles: ["💝", "🌹", "💌", "💖", "🍫", "✨"], effects: ["glow", "sparkle", "confetti", "sparkle", "confetti", "sparkle"], special: "💝", celebration: "💖" },
  { id: "ramadan", title: "Ramadan Nights", cost: 500, tiles: ["🌙", "⭐", "🕌", "🥣", "🪔", "✨"], effects: ["glow", "sparkle", "wave", "confetti", "glow", "sparkle"], special: "🌙", celebration: "🌟" },
  { id: "thanksgiving", title: "Harvest Feast", cost: 450, tiles: ["🍂", "🦃", "🌽", "🥧", "🍁", "✨"], effects: ["wave", "confetti", "confetti", "glow", "wave", "sparkle"], special: "🍂", celebration: "🍁" },
  { id: "makar_sankranti", title: "Kite Festival", cost: 450, tiles: ["🪁", "☀️", "🌾", "🍬", "🎨", "✨"], effects: ["wave", "glow", "confetti", "confetti", "sparkle", "sparkle"], special: "🪁", celebration: "🎊" },
];

const effectSound: Record<FestivalEffectType, SfxName> = {
  spin: "festivalSpin", burst: "festivalFirework", glow: "festivalLamp", sparkle: "festivalChime",
  confetti: "festivalChime", rhythm: "festivalChime", wave: "festivalSpin",
};
const effectLabel: Record<FestivalEffectType, string> = {
  spin: "Festival spin!", burst: "Fireworks!", glow: "Magic glow!", sparkle: "Sparkle match!",
  confetti: "Festival cheer!", rhythm: "Festival rhythm!", wave: "Royal wave!",
};

export function festivalMatch(pack: FestivalPack | undefined, counts: number[]): FestivalMatch | null {
  if (!pack) return null;
  let bestColor = -1;
  let count = 2;
  counts.forEach((n, color) => {
    if (n >= 3 && n > count) { bestColor = color; count = n; }
  });
  if (bestColor < 0) return null;
  const effect = pack.effects[bestColor];
  return { color: bestColor, emoji: pack.tiles[bestColor], effect, sound: effectSound[effect], label: effectLabel[effect], count };
}

export const festivalPack = (id?: string | null) => FESTIVAL_PACKS.find((p) => p.id === id);

// Diwali celebration dates for 2026 (local device calendar). Pack remains available year-round.
export function diwaliEventActive(date = new Date()) {
  if (process.env.EXPO_PUBLIC_DIWALI_PREVIEW === "true") return true;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return key >= "2026-11-06" && key <= "2026-11-10";
}
