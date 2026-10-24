// Pure match-3 engine: board model, matching, specials, obstacles, gravity.
export const SIZE = 8;

export type Special = "none" | "rocketH" | "rocketV" | "bomb" | "rainbow";
export type Piece = { id: number; color: number; special: Special };
export type Tile = { ice: number; crate: number; lock: boolean; vine: boolean };
export type Board = { pieces: (Piece | null)[][]; tiles: Tile[][] };
export type Pos = { r: number; c: number };
export type Stats = { colors: number[]; ice: number; crate: number; lock: number; vine: number; score: number };

let nextId = 1;
export const newPiece = (color: number, special: Special = "none"): Piece => ({ id: nextId++, color, special });
export const key = (r: number, c: number) => r * SIZE + c;
export const fromKey = (k: number): Pos => ({ r: Math.floor(k / SIZE), c: k % SIZE });
const inBounds = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export const emptyStats = (): Stats => ({ colors: [0, 0, 0, 0, 0, 0], ice: 0, crate: 0, lock: 0, vine: 0, score: 0 });

export function cloneBoard(b: Board): Board {
  return {
    pieces: b.pieces.map((row) => row.slice()),
    tiles: b.tiles.map((row) => row.map((t) => ({ ...t }))),
  };
}

export const isFixed = (t: Tile) => t.crate > 0 || t.lock || t.vine;

function colorAt(b: Board, r: number, c: number): number {
  const p = b.pieces[r][c];
  if (!p || p.special === "rainbow") return -1;
  return p.color;
}

// ---------- creation ----------
export function parseTiles(layout: string[]): Tile[][] {
  return layout.map((row) =>
    row.split("").map((ch) => ({
      ice: ch === "I" ? 1 : ch === "J" ? 2 : 0,
      crate: ch === "C" ? 1 : ch === "D" ? 2 : 0,
      lock: ch === "L",
      vine: ch === "V",
    })),
  );
}

export function createBoard(layout: string[], colors: number): Board {
  for (let attempt = 0; attempt < 100; attempt++) {
    const tiles = parseTiles(layout);
    const pieces: (Piece | null)[][] = [];
    for (let r = 0; r < SIZE; r++) {
      pieces.push([]);
      for (let c = 0; c < SIZE; c++) {
        if (tiles[r][c].crate > 0) {
          pieces[r].push(null);
          continue;
        }
        let color = 0;
        for (let t = 0; t < 20; t++) {
          color = Math.floor(Math.random() * colors);
          const left = c >= 2 && pieces[r][c - 1]?.color === color && pieces[r][c - 2]?.color === color;
          const up = r >= 2 && pieces[r - 1][c]?.color === color && pieces[r - 2][c]?.color === color;
          if (!left && !up) break;
        }
        pieces[r].push(newPiece(color));
      }
    }
    const b = { pieces, tiles };
    if (findMatches(b).length === 0 && hasPossibleMove(b)) return b;
  }
  return { pieces: [], tiles: [] };
}

// ---------- matching ----------
export type Group = { cells: Pos[]; color: number; maxH: number; maxV: number; intersect: Pos | null };

export function findMatches(b: Board): Group[] {
  const runs: { cells: number[]; horiz: boolean }[] = [];
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      const col = colorAt(b, r, c);
      let e = c + 1;
      while (col >= 0 && e < SIZE && colorAt(b, r, e) === col) e++;
      if (col >= 0 && e - c >= 3) runs.push({ cells: range(c, e).map((x) => key(r, x)), horiz: true });
      c = e;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      const col = colorAt(b, r, c);
      let e = r + 1;
      while (col >= 0 && e < SIZE && colorAt(b, e, c) === col) e++;
      if (col >= 0 && e - r >= 3) runs.push({ cells: range(r, e).map((y) => key(y, c)), horiz: false });
      r = e;
    }
  }
  // merge runs sharing a cell
  const groups: { runs: typeof runs }[] = [];
  for (const run of runs) {
    const hits = groups.filter((g) => g.runs.some((x) => x.cells.some((k) => run.cells.includes(k))));
    if (hits.length === 0) groups.push({ runs: [run] });
    else {
      const merged = { runs: [run, ...hits.flatMap((h) => h.runs)] };
      for (const h of hits) groups.splice(groups.indexOf(h), 1);
      groups.push(merged);
    }
  }
  return groups.map((g) => {
    const set = new Set<number>();
    g.runs.forEach((x) => x.cells.forEach((k) => set.add(k)));
    const h = g.runs.filter((x) => x.horiz);
    const v = g.runs.filter((x) => !x.horiz);
    let intersect: Pos | null = null;
    for (const hr of h) for (const vr of v) {
      const k = hr.cells.find((x) => vr.cells.includes(x));
      if (k !== undefined) intersect = fromKey(k);
    }
    const cells = [...set].map(fromKey);
    return {
      cells,
      color: colorAt(b, cells[0].r, cells[0].c),
      maxH: Math.max(0, ...h.map((x) => x.cells.length)),
      maxV: Math.max(0, ...v.map((x) => x.cells.length)),
      intersect,
    };
  });
}

function range(a: number, b: number) {
  const out: number[] = [];
  for (let i = a; i < b; i++) out.push(i);
  return out;
}

// ---------- swapping ----------
export function canSwap(b: Board, a: Pos, c: Pos): boolean {
  if (!inBounds(a.r, a.c) || !inBounds(c.r, c.c)) return false;
  if (Math.abs(a.r - c.r) + Math.abs(a.c - c.c) !== 1) return false;
  return !!b.pieces[a.r][a.c] && !!b.pieces[c.r][c.c] && !isFixed(b.tiles[a.r][a.c]) && !isFixed(b.tiles[c.r][c.c]);
}

export function swapPieces(b: Board, a: Pos, c: Pos) {
  const t = b.pieces[a.r][a.c];
  b.pieces[a.r][a.c] = b.pieces[c.r][c.c];
  b.pieces[c.r][c.c] = t;
}

const isSpecialCombo = (p: Piece, q: Piece) =>
  p.special === "rainbow" || q.special === "rainbow" || (p.special !== "none" && q.special !== "none");

export function findHint(b: Board): [Pos, Pos] | null {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const a = { r, c }, o = { r: r + dr, c: c + dc };
        if (!canSwap(b, a, o)) continue;
        if (isSpecialCombo(b.pieces[r][c]!, b.pieces[o.r][o.c]!)) return [a, o];
        swapPieces(b, a, o);
        const ok = findMatches(b).length > 0;
        swapPieces(b, a, o);
        if (ok) return [a, o];
      }
  return null;
}

export const hasPossibleMove = (b: Board) => findHint(b) !== null;

export function shuffle(b: Board): Board {
  for (let attempt = 0; attempt < 100; attempt++) {
    const nb = cloneBoard(b);
    const slots: Pos[] = [];
    const ps: Piece[] = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (nb.pieces[r][c] && !isFixed(nb.tiles[r][c])) {
          slots.push({ r, c });
          ps.push(nb.pieces[r][c]!);
        }
    for (let i = ps.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ps[i], ps[j]] = [ps[j], ps[i]];
    }
    slots.forEach((s, i) => (nb.pieces[s.r][s.c] = ps[i]));
    if (findMatches(nb).length === 0 && hasPossibleMove(nb)) return nb;
  }
  return b;
}

// ---------- clearing ----------
export type ClearPlan = { clear: Set<number>; matchCells: Set<number>; spawns: { pos: Pos; piece: Piece }[]; skip: Set<number> };

export function planFromMatches(b: Board, groups: Group[], preferred: Pos[]): ClearPlan {
  const clear = new Set<number>();
  const spawns: ClearPlan["spawns"] = [];
  for (const g of groups) {
    g.cells.forEach((p) => clear.add(key(p.r, p.c)));
    let special: Special = "none";
    if (g.maxH >= 5 || g.maxV >= 5) special = "rainbow";
    else if (g.intersect) special = "bomb";
    else if (g.maxH === 4) special = "rocketH";
    else if (g.maxV === 4) special = "rocketV";
    if (special === "none") continue;
    const pref = preferred.find((p) => g.cells.some((x) => x.r === p.r && x.c === p.c));
    const pos = pref ?? g.intersect ?? g.cells[Math.floor(g.cells.length / 2)];
    spawns.push({ pos, piece: newPiece(special === "rainbow" ? -1 : g.color, special) });
  }
  return { clear, matchCells: new Set(clear), spawns, skip: new Set() };
}

function allOfColor(b: Board, color: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (colorAt(b, r, c) === color) out.push(key(r, c));
  return out;
}

function mostCommonColor(b: Board): number {
  const counts: Record<number, number> = {};
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const col = colorAt(b, r, c);
    if (col >= 0) counts[col] = (counts[col] ?? 0) + 1;
  }
  let best = 0, n = -1;
  for (const k in counts) if (counts[k] > n) { n = counts[k]; best = Number(k); }
  return best;
}

function area(r0: number, r1: number, c0: number, c1: number): number[] {
  const out: number[] = [];
  for (let r = Math.max(0, r0); r <= Math.min(SIZE - 1, r1); r++)
    for (let c = Math.max(0, c0); c <= Math.min(SIZE - 1, c1); c++) out.push(key(r, c));
  return out;
}

const isRocket = (s: Special) => s === "rocketH" || s === "rocketV";

// Swap-activated combos (rainbow involved, or two specials). Board is post-swap; `at` is the destination cell.
export function planCombo(b: Board, from: Pos, at: Pos): ClearPlan | null {
  const p = b.pieces[at.r][at.c]!, q = b.pieces[from.r][from.c]!;
  if (!isSpecialCombo(p, q)) return null;
  const clear = new Set<number>();
  const skip = new Set<number>([p.id, q.id]);
  clear.add(key(at.r, at.c)).add(key(from.r, from.c));
  if (p.special === "rainbow" && q.special === "rainbow") {
    area(0, SIZE - 1, 0, SIZE - 1).forEach((k) => clear.add(k));
  } else if (p.special === "rainbow" || q.special === "rainbow") {
    const other = p.special === "rainbow" ? q : p;
    const cells = allOfColor(b, other.color);
    if (other.special !== "none") {
      skip.delete(other.id);
      cells.forEach((k) => {
        const { r, c } = fromKey(k);
        const sp: Special = other.special === "bomb" ? "bomb" : Math.random() < 0.5 ? "rocketH" : "rocketV";
        if (!isFixed(b.tiles[r][c])) b.pieces[r][c] = { ...b.pieces[r][c]!, special: sp };
      });
    }
    cells.forEach((k) => clear.add(k));
  } else if (isRocket(p.special) && isRocket(q.special)) {
    area(at.r, at.r, 0, SIZE - 1).forEach((k) => clear.add(k));
    area(0, SIZE - 1, at.c, at.c).forEach((k) => clear.add(k));
  } else if (p.special === "bomb" && q.special === "bomb") {
    area(at.r - 2, at.r + 2, at.c - 2, at.c + 2).forEach((k) => clear.add(k));
  } else {
    area(at.r - 1, at.r + 1, 0, SIZE - 1).forEach((k) => clear.add(k));
    area(0, SIZE - 1, at.c - 1, at.c + 1).forEach((k) => clear.add(k));
  }
  return { clear, matchCells: new Set(), spawns: [], skip };
}

// Chain-activate specials caught in the clear set.
export function expandSpecials(b: Board, plan: ClearPlan) {
  const queue = [...plan.clear];
  while (queue.length) {
    const k = queue.shift()!;
    const { r, c } = fromKey(k);
    const p = b.pieces[r][c];
    const t = b.tiles[r][c];
    if (!p || p.special === "none" || plan.skip.has(p.id) || t.lock || t.vine) continue;
    plan.skip.add(p.id);
    let cells: number[] = [];
    if (p.special === "rocketH") cells = area(r, r, 0, SIZE - 1);
    else if (p.special === "rocketV") cells = area(0, SIZE - 1, c, c);
    else if (p.special === "bomb") cells = area(r - 1, r + 1, c - 1, c + 1);
    else if (p.special === "rainbow") cells = allOfColor(b, mostCommonColor(b));
    for (const x of cells) if (!plan.clear.has(x)) { plan.clear.add(x); queue.push(x); }
  }
}

// Mutates board. Returns ids of removed pieces.
export function applyClear(b: Board, plan: ClearPlan, stats: Stats): number[] {
  const removed: number[] = [];
  const removedCells: number[] = [];
  for (const k of plan.clear) {
    const { r, c } = fromKey(k);
    const t = b.tiles[r][c];
    if (t.crate > 0) {
      t.crate--;
      if (t.crate === 0) stats.crate++;
      stats.score += 40;
      continue;
    }
    const p = b.pieces[r][c];
    if (!p) continue;
    if (t.lock) { t.lock = false; stats.lock++; stats.score += 40; continue; }
    if (t.vine) { t.vine = false; stats.vine++; stats.score += 40; continue; }
    removed.push(p.id);
    removedCells.push(k);
    b.pieces[r][c] = null;
    if (p.color >= 0 && p.special !== "rainbow") stats.colors[p.color]++;
    stats.score += p.special === "none" ? 60 : 180;
    if (t.ice > 0) { t.ice--; if (t.ice === 0) stats.ice++; }
  }
  // adjacent damage from matched cells
  const damaged = new Set<number>();
  for (const k of removedCells) {
    if (!plan.matchCells.has(k)) continue;
    const { r, c } = fromKey(k);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const nk = key(nr, nc);
      if (plan.clear.has(nk) || damaged.has(nk)) continue;
      const t = b.tiles[nr][nc];
      if (t.crate > 0) { damaged.add(nk); t.crate--; if (t.crate === 0) stats.crate++; }
      else if (t.vine) { damaged.add(nk); t.vine = false; stats.vine++; }
    }
  }
  for (const s of plan.spawns) if (!b.pieces[s.pos.r][s.pos.c] && b.tiles[s.pos.r][s.pos.c].crate === 0) b.pieces[s.pos.r][s.pos.c] = s.piece;
  return removed;
}

// Pieces fall through fixed cells; refill from top. Returns spawn row offsets for new pieces.
export function applyGravity(b: Board, colors: number): Record<number, number> {
  const spawnFrom: Record<number, number> = {};
  for (let c = 0; c < SIZE; c++) {
    const slots: number[] = [];
    for (let r = 0; r < SIZE; r++) if (!isFixed(b.tiles[r][c])) slots.push(r);
    const existing = slots.map((r) => b.pieces[r][c]).filter((p): p is Piece => !!p);
    const missing = slots.length - existing.length;
    const fresh: Piece[] = [];
    for (let i = 0; i < missing; i++) {
      const p = newPiece(Math.floor(Math.random() * colors));
      spawnFrom[p.id] = i - missing - 0.5;
      fresh.push(p);
    }
    const col = [...fresh, ...existing];
    slots.forEach((r, i) => (b.pieces[r][c] = col[i]));
  }
  return spawnFrom;
}

// Hero abilities clear a compact pattern without consuming a move. Each hero
// has a deterministic signature based on its roster slot, so every hero feels
// different while using the same obstacle and scoring rules as other clears.
export function planHeroAbility(b: Board, center: Pos, heroIndex: number): ClearPlan {
  const pattern = heroIndex % 4;
  const clear = new Set<number>();
  if (pattern === 0) area(center.r, center.r, 0, SIZE - 1).forEach((k) => clear.add(k));
  else if (pattern === 1) area(0, SIZE - 1, center.c, center.c).forEach((k) => clear.add(k));
  else if (pattern === 2) area(center.r - 1, center.r + 1, center.c - 1, center.c + 1).forEach((k) => clear.add(k));
  else {
    for (let i = 0; i < SIZE; i++) {
      if (center.r + i < SIZE && center.c + i < SIZE) clear.add(key(center.r + i, center.c + i));
      if (center.r - i >= 0 && center.c - i >= 0) clear.add(key(center.r - i, center.c - i));
    }
  }
  return { clear, matchCells: new Set(), spawns: [], skip: new Set() };
}
