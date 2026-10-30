import { MUSIC_TRACKS } from "@/src/game/sound";

export type MusicPack = { id: string; title: string; cost: number; track: number; mood: string; icon: string };
export const MUSIC_PACKS: MusicPack[] = [
  { id: "forest", title: MUSIC_TRACKS[0], cost: 0, track: 0, mood: "An original cinematic fantasy theme with warm orchestral strings and a heroic melody", icon: "🏰" },
  { id: "carnival", title: MUSIC_TRACKS[1], cost: 0, track: 1, mood: "A bright, bouncy candy melody", icon: "🍬" },
  { id: "starry", title: MUSIC_TRACKS[2], cost: 0, track: 2, mood: "A gentle bedtime music-box loop", icon: "🌙" },
  { id: "firefly", title: MUSIC_TRACKS[3], cost: 400, track: 3, mood: "A calm, twinkling forest journey", icon: "✨" },
  { id: "parade", title: MUSIC_TRACKS[4], cost: 600, track: 4, mood: "A lively original festival parade", icon: "🎊" },
];

export const SOUND_PACKS = [
  { id: "classic", title: "Classic Match Sounds", cost: 0, description: "The original pop, combo and power-up sounds." },
  { id: "sparkle", title: "Festival Sparkle Sounds", cost: 350, description: "A bright chime on each normal match, plus festive event sounds." },
] as const;

export const CUSTOM_MUSIC_UNLOCK_COST = 500;
export const BASE_MUSIC_PACKS = ["forest", "carnival", "starry"];
