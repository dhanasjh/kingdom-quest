import { parseTiles } from "./engine";

export type ObjectiveType = "color" | "ice" | "crate" | "lock" | "vine" | "score";
export type Objective = { type: ObjectiveType; color?: number; count: number };
export type LevelDef = { id: number; moves: number; colors: number; objectives: Objective[]; layout: string[]; hard?: boolean; roster?: number[] };

// Characters shuffle every level: one of 3 characters per color group.
export function rosterFor(id: number): number[] {
  if (id <= 3) return [0, 3, 6, 9, 12, 15];
  return [0, 1, 2, 3, 4, 5].map((g) => g * 3 + (Math.abs(Math.imul(id * 2654435761 + g * 97, 1597334677) >>> 7) % 3));
}

const P = "........";
type RawObj = { type: ObjectiveType; color?: number; count?: number };
const raw: { moves: number; colors: number; objectives: RawObj[]; layout: string[] }[] = [
  { moves: 20, colors: 5, objectives: [{ type: "color", color: 0, count: 15 }], layout: [P, P, P, P, P, P, P, P] },
  { moves: 20, colors: 5, objectives: [{ type: "color", color: 1, count: 18 }, { type: "color", color: 2, count: 18 }], layout: [P, P, P, P, P, P, P, P] },
  { moves: 18, colors: 5, objectives: [{ type: "ice" }], layout: [P, P, P, "..IIII..", "..IIII..", P, P, P] },
  { moves: 20, colors: 5, objectives: [{ type: "color", color: 3, count: 25 }], layout: [P, P, P, P, P, P, P, P] },
  { moves: 20, colors: 5, objectives: [{ type: "crate" }], layout: [P, P, P, P, P, "C......C", "CC....CC", "C......C"] },
  { moves: 22, colors: 5, objectives: [{ type: "ice" }], layout: [P, ".IIIIII.", P, P, P, P, ".IIIIII.", "..IIII.."] },
  { moves: 20, colors: 6, objectives: [{ type: "color", color: 4, count: 20 }, { type: "color", color: 0, count: 20 }], layout: [P, P, P, P, P, P, P, P] },
  { moves: 22, colors: 5, objectives: [{ type: "lock" }], layout: [P, P, "L......L", "..L..L..", "..L..L..", "L......L", P, P] },
  { moves: 24, colors: 5, objectives: [{ type: "crate" }, { type: "ice" }], layout: [P, P, "...II...", "..IIII..", P, "CC....CC", "CC....CC", "C......C"] },
  { moves: 25, colors: 6, objectives: [{ type: "vine" }], layout: [P, P, P, "VV....VV", "VV....VV", "..VVVV..", P, P] },
  { moves: 22, colors: 5, objectives: [{ type: "ice" }], layout: [P, "IJ....JI", "IJ....JI", "..JJJJ..", "..IIII..", "IJ....JI", P, P] },
  { moves: 24, colors: 6, objectives: [{ type: "crate" }], layout: [P, P, P, "...DD...", "..DCCD..", "..DCCD..", "...DD...", P] },
  { moves: 22, colors: 5, objectives: [{ type: "lock" }, { type: "vine" }], layout: [P, "L......L", ".L....L.", "..VVVV..", "..VVVV..", ".L....L.", P, P] },
  { moves: 25, colors: 6, objectives: [{ type: "color", color: 2, count: 30 }, { type: "ice" }], layout: [P, P, "II....II", "II....II", P, P, ".IIIIII.", P] },
  { moves: 26, colors: 5, objectives: [{ type: "crate" }], layout: [P, P, P, "C.C..C.C", ".C.CC.C.", "C.C..C.C", ".CC..CC.", P] },
  { moves: 24, colors: 6, objectives: [{ type: "ice" }], layout: [P, ".JJJJJJ.", ".I....I.", ".I....I.", ".I....I.", ".I....I.", ".JJJJJJ.", P] },
  { moves: 26, colors: 6, objectives: [{ type: "vine" }, { type: "crate" }], layout: [P, P, "VVV..VVV", "V......V", "V......V", "VVV..VVV", "C.C..C.C", "...CC..."] },
  { moves: 25, colors: 5, objectives: [{ type: "lock" }, { type: "ice" }], layout: [P, "LL....LL", "L.IIII.L", "..I..I..", "..I..I..", "L.IIII.L", "LL....LL", P] },
  { moves: 28, colors: 6, objectives: [{ type: "crate" }, { type: "vine" }], layout: [P, P, "VV....VV", "V.DDDD.V", "V.DDDD.V", "VV....VV", "..DDDD..", P] },
  { moves: 30, colors: 6, objectives: [{ type: "ice" }, { type: "crate" }, { type: "lock" }], layout: [P, "LIIIIIIL", ".I....I.", ".I.CC.I.", ".I.CC.I.", "LIIIIIIL", "CC.LL.CC", "C......C"] },
  // ---------- Chapter 2: Royal Garden ----------
  { moves: 24, colors: 6, objectives: [{ type: "ice" }, { type: "crate" }], layout: [P, "JJ....JJ", "J......J", P, P, "C......C", "DC....CD", "DDC..CDD"] },
  { moves: 24, colors: 6, objectives: [{ type: "lock" }, { type: "vine" }], layout: [P, "VLVLVLVL", P, P, P, P, "LVLVLVLV", P] },
  { moves: 22, colors: 6, objectives: [{ type: "color", color: 3, count: 30 }, { type: "crate" }], layout: [P, P, P, "..CDDC..", "..CDDC..", P, P, P] },
  { moves: 26, colors: 6, objectives: [{ type: "ice" }], layout: ["JJJJJJJJ", P, "J.J..J.J", P, P, "J.J..J.J", P, "JJJJJJJJ"] },
  { moves: 25, colors: 6, objectives: [{ type: "vine" }], layout: [P, "VVVVVVVV", P, "V.VVVV.V", P, "VVVVVVVV", P, P] },
  { moves: 26, colors: 6, objectives: [{ type: "crate" }], layout: [P, P, "DDDDDDDD", P, P, "DDDDDDDD", P, P] },
  { moves: 24, colors: 6, objectives: [{ type: "lock" }, { type: "ice" }], layout: ["LJJLLJJL", P, P, "..LJJL..", P, P, P, P] },
  { moves: 28, colors: 6, objectives: [{ type: "color", color: 0, count: 25 }, { type: "color", color: 4, count: 25 }, { type: "vine" }], layout: [P, P, "..VVVV..", P, P, "..VVVV..", P, P] },
  { moves: 26, colors: 6, objectives: [{ type: "crate" }, { type: "vine" }, { type: "ice" }], layout: [P, "II....II", "VV.CC.VV", "...DD...", P, "VV.CC.VV", "II....II", P] },
  { moves: 30, colors: 6, objectives: [{ type: "ice" }], layout: [P, P, "JJJJJJJJ", "JIIIIIIJ", "JIIIIIIJ", "JJJJJJJJ", P, P] },
  { moves: 26, colors: 6, objectives: [{ type: "lock" }], layout: ["L.L.L.L.", P, P, "LL....LL", P, P, P, ".L.L.L.L"] },
  { moves: 27, colors: 6, objectives: [{ type: "crate" }, { type: "lock" }], layout: [P, "D.L..L.D", "D......D", P, P, "D......D", "D.L..L.D", P] },
  { moves: 26, colors: 6, objectives: [{ type: "ice" }, { type: "vine" }], layout: ["J.VJJV.J", P, P, "JJ....JJ", P, P, "J.VJJV.J", P] },
  { moves: 28, colors: 6, objectives: [{ type: "color", color: 2, count: 35 }, { type: "color", color: 5, count: 35 }], layout: [P, P, "C.C.C.C.", P, P, ".C.C.C.C", P, P] },
  { moves: 28, colors: 6, objectives: [{ type: "vine" }, { type: "lock" }], layout: ["VVVVVVVV", P, "L......L", "L......L", P, P, P, "VVVVVVVV"] },
  { moves: 28, colors: 6, objectives: [{ type: "crate" }], layout: ["DDD..DDD", P, P, "D..DD..D", P, P, P, P] },
  { moves: 28, colors: 6, objectives: [{ type: "ice" }, { type: "crate" }], layout: [P, "JJJJJJJJ", P, "CDC..CDC", P, "JJJJJJJJ", P, P] },
  { moves: 28, colors: 6, objectives: [{ type: "lock" }, { type: "ice" }], layout: ["L..LL..L", "IJIJIJIJ", P, P, P, P, "JIJIJIJI", "L..LL..L"] },
  { moves: 30, colors: 6, objectives: [{ type: "crate" }, { type: "vine" }, { type: "lock" }], layout: [P, "VCVCVCVC", P, P, P, P, "LDLDLDLD", P] },
  { moves: 32, colors: 6, objectives: [{ type: "ice" }, { type: "crate" }, { type: "vine" }], layout: ["JJJJJJJJ", "V.D..D.V", P, "..DCCD..", P, "V.D..D.V", P, "JJJJJJJJ"] },
  // ---------- Chapter 3: Fairytale Castle ----------
  { moves: 28, colors: 6, objectives: [{ type: "ice" }, { type: "lock" }], layout: ["JLJJJJLJ", P, "J......J", "J......J", P, P, "JLJJJJLJ", P] },
  { moves: 28, colors: 6, objectives: [{ type: "crate" }], layout: [P, "DDD..DDD", "D......D", P, P, "D......D", "DDD..DDD", P] },
  { moves: 30, colors: 6, objectives: [{ type: "vine" }, { type: "ice" }], layout: [P, "VJVJVJVJ", P, "JJ....JJ", "JJ....JJ", P, "JVJVJVJV", P] },
  { moves: 28, colors: 6, objectives: [{ type: "color", color: 1, count: 40 }, { type: "crate" }], layout: [P, P, "CC.CC.CC", P, P, "CC.CC.CC", P, P] },
  { moves: 30, colors: 6, objectives: [{ type: "lock" }, { type: "vine" }, { type: "crate" }], layout: ["L......L", "VV.DD.VV", P, P, P, P, "VV.DD.VV", "L......L"] },
  { moves: 32, colors: 6, objectives: [{ type: "ice" }], layout: ["JJJJJJJJ", "JJJJJJJJ", P, "JJJJJJJJ", "JJJJJJJJ", P, "JJJJJJJJ", "JJJJJJJJ"] },
  { moves: 30, colors: 6, objectives: [{ type: "crate" }, { type: "lock" }], layout: ["DLDLDLDL", P, P, P, P, P, P, "LDLDLDLD"] },
  { moves: 30, colors: 6, objectives: [{ type: "vine" }], layout: ["VVVVVVVV", P, "VV....VV", P, P, "VV....VV", P, "VVVVVVVV"] },
  { moves: 32, colors: 6, objectives: [{ type: "crate" }, { type: "ice" }, { type: "vine" }], layout: ["JJDDDDJJ", P, "V.J..J.V", P, P, "V.J..J.V", P, "JJDDDDJJ"] },
  { moves: 32, colors: 6, objectives: [{ type: "lock" }, { type: "ice" }, { type: "crate" }, { type: "vine" }], layout: ["LJJDDJJL", P, "V......V", "J.CDDC.J", P, "V......V", P, "LJJDDJJL"] },
  { moves: 30, colors: 6, objectives: [{ type: "color", color: 0, count: 30 }, { type: "color", color: 3, count: 30 }, { type: "ice" }], layout: [P, "I.I.I.I.", P, ".J.J.J.J", P, "I.I.I.I.", P, P] },
  { moves: 30, colors: 6, objectives: [{ type: "lock" }], layout: ["LLLLLLLL", P, P, "L..LL..L", P, P, P, "LLLLLLLL"] },
  { moves: 32, colors: 6, objectives: [{ type: "crate" }], layout: [P, ".DDDDDD.", ".D....D.", P, P, ".D....D.", ".DDDDDD.", P] },
  { moves: 32, colors: 6, objectives: [{ type: "vine" }, { type: "lock" }, { type: "ice" }], layout: ["VLVLVLVL", P, "JJ....JJ", "JJ....JJ", P, P, P, "LVLVLVLV"] },
  { moves: 32, colors: 6, objectives: [{ type: "crate" }, { type: "vine" }], layout: ["DDDDDDDD", P, "V..VV..V", P, P, P, P, "DDDDDDDD"] },
  { moves: 33, colors: 6, objectives: [{ type: "ice" }, { type: "crate" }], layout: ["JJJJJJJJ", "JDJJJJDJ", "J......J", P, P, "J......J", "JDJJJJDJ", "JJJJJJJJ"] },
  { moves: 33, colors: 6, objectives: [{ type: "lock" }, { type: "crate" }, { type: "ice" }], layout: ["LDLDDLDL", "IIIIIIII", P, P, P, P, "IIIIIIII", "LDLDDLDL"] },
  { moves: 34, colors: 6, objectives: [{ type: "vine" }, { type: "crate" }, { type: "lock" }], layout: ["VVVVVVVV", "D......D", "L......L", P, P, "L......L", "D......D", "VVVVVVVV"] },
  { moves: 34, colors: 6, objectives: [{ type: "ice" }, { type: "crate" }, { type: "lock" }, { type: "vine" }], layout: ["JDJLLJDJ", "V......V", P, "..DCCD..", "..DCCD..", P, "V......V", "JDJLLJDJ"] },
  { moves: 36, colors: 6, objectives: [{ type: "crate" }, { type: "ice" }, { type: "lock" }, { type: "vine" }], layout: ["DDDDDDDD", "JJJJJJJJ", "LV....VL", "J.DCCD.J", "J.DCCD.J", "LV....VL", "JJJJJJJJ", "DDDDDDDD"] },
];

export type ObstacleKind = "ice" | "crate" | "lock" | "vine";
export type Chapter = { id: number; name: string; accent: string; mix: ObstacleKind[] };

export const CHAPTER_COUNT = 16;
export const LEVELS_PER_CHAPTER = 125;
export const TOTAL_LEVELS = CHAPTER_COUNT * LEVELS_PER_CHAPTER;

export const CHAPTERS: Chapter[] = [
  { id: 1, name: "Enchanted Forest", accent: "#06D6A0", mix: ["ice", "vine"] },
  { id: 2, name: "Desert Ruins", accent: "#FFD166", mix: ["crate", "ice"] },
  { id: 3, name: "Candy Kingdom", accent: "#FF6B6B", mix: ["ice", "lock"] },
  { id: 4, name: "Crystal Caverns", accent: "#06D6A0", mix: ["ice", "crate", "lock"] },
  { id: 5, name: "Volcano Peak", accent: "#EF476F", mix: ["crate", "lock"] },
  { id: 6, name: "Floating Islands", accent: "#06D6A0", mix: ["ice", "vine", "crate"] },
  { id: 7, name: "Clockwork City", accent: "#FFD166", mix: ["lock", "crate"] },
  { id: 8, name: "Mushroom Valley", accent: "#FF6B6B", mix: ["vine", "ice", "lock"] },
  { id: 9, name: "Sunken Shipwreck", accent: "#06D6A0", mix: ["ice", "crate", "vine"] },
  { id: 10, name: "Snowy Tundra", accent: "#FFD166", mix: ["ice", "lock"] },
  { id: 11, name: "Jungle Temple", accent: "#06D6A0", mix: ["vine", "crate", "lock"] },
  { id: 12, name: "Haunted Manor", accent: "#FF9F1C", mix: ["lock", "vine", "ice"] },
  { id: 13, name: "Dragon's Lair", accent: "#EF476F", mix: ["crate", "lock", "ice"] },
  { id: 14, name: "Starry Observatory", accent: "#FFD166", mix: ["ice", "lock", "vine", "crate"] },
  { id: 15, name: "Rainbow Road", accent: "#FF6B6B", mix: ["ice", "crate", "lock", "vine"] },
  { id: 16, name: "Royal Castle", accent: "#FFD166", mix: ["ice", "crate", "lock", "vine"] },
];
export const chapterOf = (levelId: number) => Math.ceil(levelId / LEVELS_PER_CHAPTER);
export const levelInChapter = (levelId: number) => ((levelId - 1) % LEVELS_PER_CHAPTER) + 1;
export const chapterFirstLevel = (chapterId: number) => (chapterId - 1) * LEVELS_PER_CHAPTER + 1;

function countTiles(layout: string[], type: ObjectiveType): number {
  const tiles = parseTiles(layout).flat();
  if (type === "ice") return tiles.filter((t) => t.ice > 0).length;
  if (type === "crate") return tiles.filter((t) => t.crate > 0).length;
  if (type === "lock") return tiles.filter((t) => t.lock).length;
  if (type === "vine") return tiles.filter((t) => t.vine).length;
  return 0;
}

const HANDMADE: LevelDef[] = raw.map((l, i) => ({
  id: i + 1,
  moves: l.moves,
  colors: l.colors,
  layout: l.layout,
  objectives: l.objectives.map((o) => ({ type: o.type, color: o.color, count: o.count ?? countTiles(l.layout, o.type) })),
}));

// ---------- procedural generator (deterministic per level id) ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Patterns on the left half (cols 0-3); mirrored for symmetry.
const PATTERNS: ((r: number, c: number) => boolean)[] = [
  (r) => r === 0 || r === 7,
  (r) => r === 3 || r === 4,
  (_, c) => c === 0,
  (r, c) => (r + c) % 2 === 0 && (r <= 1 || r >= 6),
  (r, c) => (r === 1 || r === 6) && c >= 1,
  (r, c) => c === 3 && r >= 2 && r <= 5,
  (r, c) => (r <= 1 && c <= 1) || (r >= 6 && c <= 1),
  (r, c) => (r === 2 || r === 5) && c >= 1,
  (r, c) => r === c || r === 7 - c,
  (r, c) => r >= 5 && c >= 2,
  (r, c) => r <= 2 && c >= 2,
  (r, c) => c === 1 && r % 2 === 1,
];

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generate(id: number): LevelDef {
  const rand = rng(id * 7919 + 13);
  const ch = CHAPTERS[chapterOf(id) - 1];
  const idx = levelInChapter(id) - 1;
  const d = Math.min(1, ((ch.id - 1) * LEVELS_PER_CHAPTER + idx) / TOTAL_LEVELS + idx / LEVELS_PER_CHAPTER * 0.15);
  const hard = idx % 10 === 9;
  const breather = idx % 7 === 3;
  const colors = d < 0.08 && !hard ? 5 : 6;

  const grid = Array.from({ length: 8 }, () => Array<string>(4).fill("."));
  const objectives: Objective[] = [];
  const types: ObstacleKind[] = [];
  if (!breather) {
    const n = Math.min(ch.mix.length, 1 + (rand() < 0.35 + d ? 1 : 0) + (rand() < d - 0.25 ? 1 : 0) + (hard ? 1 : 0));
    types.push(...shuffled(ch.mix, rand).slice(0, n));
  }
  let fixedBudget = Math.round(3 + 8 * d + (hard ? 2 : 0)); // half-board fixed cells
  const pats = shuffled(PATTERNS, rand);
  types.forEach((t, ti) => {
    const pat = pats[ti];
    const cells: [number, number][] = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) if (pat(r, c) && grid[r][c] === ".") cells.push([r, c]);
    const budget = t === "ice" ? Math.round(4 + 10 * d) : Math.min(fixedBudget, Math.round(3 + 5 * d));
    const take = shuffled(cells, rand).slice(0, Math.max(2, budget));
    if (t !== "ice") fixedBudget -= take.length;
    for (const [r, c] of take) {
      grid[r][c] =
        t === "ice" ? (rand() < 0.15 + 0.6 * d ? "J" : "I") :
        t === "crate" ? (rand() < 0.1 + 0.6 * d ? "D" : "C") :
        t === "lock" ? "L" : "V";
    }
  });
  const layout = grid.map((row) => row.join("") + row.slice().reverse().join(""));
  for (const t of types) objectives.push({ type: t, count: countTiles(layout, t) });

  const colorOrder = shuffled([0, 1, 2, 3, 4, 5].slice(0, colors), rand);
  const colorCount = Math.round(16 + 24 * d);
  if (breather) {
    objectives.push({ type: "color", color: colorOrder[0], count: colorCount + 4 }, { type: "color", color: colorOrder[1], count: colorCount + 4 });
  } else if (types.length < 2 && rand() < 0.6) {
    objectives.push({ type: "color", color: colorOrder[0], count: colorCount });
  }

  // Move budget scales with total work; tighter as difficulty rises.
  const tiles = parseTiles(layout).flat();
  const work = tiles.reduce((s, t) => s + t.ice + t.crate * 1.3 + (t.lock ? 1.2 : 0) + (t.vine ? 1.2 : 0), 0);
  const colorWork = objectives.filter((o) => o.type === "color").reduce((s, o) => s + o.count, 0);
  let moves = (15 + work * 0.32 + colorWork * 0.2) * (1.12 - 0.22 * d);
  if (hard) moves *= 0.9;
  moves = Math.max(16, Math.min(40, Math.round(moves)));
  return { id, moves, colors, layout, objectives, hard };
}

const cache = new Map<number, LevelDef>();
export function getLevel(id: number): LevelDef | undefined {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL_LEVELS) return undefined;
  let l = cache.get(id);
  if (!l) {
    l = id <= HANDMADE.length ? { ...HANDMADE[id - 1], hard: id % 10 === 0 } : generate(id);
    l = { ...l, roster: rosterFor(id) };
    cache.set(id, l);
  }
  return l;
}

export const starThresholds = (lvl: LevelDef) => [0, lvl.moves * 200, lvl.moves * 320];

export function starsForScore(lvl: LevelDef, score: number): number {
  const [, t2, t3] = starThresholds(lvl);
  return score >= t3 ? 3 : score >= t2 ? 2 : 1;
}
