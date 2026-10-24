import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";

import { storage } from "@/src/utils/storage";
import { setMusicEnabled, setSfxEnabled, startMusic } from "@/src/game/sound";
import { chapterFirstLevel, chapterOf } from "@/src/game/levels";

export const MAX_LIVES = 5;
export const LIFE_MS = 20 * 60 * 1000;
const KEY = "kq_progress_v1";

type Saved = {
  best: Record<string, number>; // level id -> best stars
  unlocked: number;
  coins: number;
  stars: number; // spendable
  lives: number;
  lifeAt: number; // timestamp when lives last ticked
  restored: string[];
  haptics: boolean;
  sound: boolean;
  music: boolean;
  hammers: number;
  shuffles: number;
  lastSpinAt: number;
  adSpinDay: string;
  unlockAll: boolean;
  purchases: string[];
  starterShown: boolean;
  streak: number;
  lastPlayDay: string;
  todayWins: number;
  todayDay: string;
  goalClaimedDay: string;
  leaderboardName: string;
  weeklyStars: Record<string, number>;
  playerId: string;
};

const initial = (): Saved => ({
  best: {}, unlocked: 1, coins: 0, stars: 0, lives: MAX_LIVES, lifeAt: Date.now(), restored: [], haptics: true,
  sound: true, music: true, hammers: 3, shuffles: 3, lastSpinAt: 0, adSpinDay: "", unlockAll: false, purchases: [],
  starterShown: false, streak: 0, lastPlayDay: "", todayWins: 0, todayDay: "", goalClaimedDay: "", leaderboardName: "", weeklyStars: {}, playerId: "",
});

export const DAILY_GOAL = 3;
export const DAILY_GOAL_REWARD = 150;
export const todayKey = () => new Date().toDateString();

export const SPIN_MS = 24 * 60 * 60 * 1000;
const dayKey = (t: number) => new Date(t).toDateString();

function regen(s: Saved, now: number): Saved {
  if (s.lives >= MAX_LIVES) return { ...s, lifeAt: now };
  const gained = Math.floor((now - s.lifeAt) / LIFE_MS);
  if (gained <= 0) return s;
  const lives = Math.min(MAX_LIVES, s.lives + gained);
  return { ...s, lives, lifeAt: lives >= MAX_LIVES ? now : s.lifeAt + gained * LIFE_MS };
}

type Grant = { coins?: number; lives?: number; hammers?: number; shuffles?: number };

type Ctx = Saved & {
  ready: boolean;
  nextLifeIn: number;
  freeSpinReady: boolean;
  adSpinReady: boolean;
  nextFreeSpinIn: number;
  markSpin: (kind: "free" | "ad") => void;
  isLevelUnlocked: (id: number) => boolean;
  isChapterUnlocked: (ch: number) => boolean;
  recordPurchase: (productId: string, unlockAll?: boolean) => void;
  update: (p: Partial<Saved>) => void;
  completeLevel: (id: number, stars: number, coins: number) => { newStars: number };
  loseLife: () => void;
  restore: (taskId: string, cost: number) => boolean;
  setHapticsOn: (v: boolean) => void;
  setSoundOn: (v: boolean) => void;
  setMusicOn: (v: boolean) => void;
  grant: (g: Grant) => void;
  spendCoins: (n: number) => boolean;
  consumeBooster: (k: "hammer" | "shuffle") => boolean;
  reset: () => void;
  haptic: (kind: "light" | "medium" | "heavy" | "success" | "error") => void;
};

const ProgressContext = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Saved>(initial);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem(KEY, null);
      if (typeof raw === "string") {
        try {
          setState(regen({ ...initial(), ...JSON.parse(raw) }, Date.now()));
        } catch {}
      }
      setState((s) => s.playerId ? s : { ...s, playerId: makePlayerId() });
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setState((s) => regen(s, Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ready) storage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    setSfxEnabled(state.sound);
    setMusicEnabled(state.music);
    if (state.music) startMusic();
  }, [state.sound, state.music]);

  const grant = useCallback((g: Grant) => {
    setState((s) => {
      const lives = Math.min(MAX_LIVES, s.lives + (g.lives ?? 0));
      return {
        ...s,
        coins: s.coins + (g.coins ?? 0),
        lives,
        lifeAt: lives >= MAX_LIVES ? Date.now() : s.lifeAt,
        hammers: s.hammers + (g.hammers ?? 0),
        shuffles: s.shuffles + (g.shuffles ?? 0),
      };
    });
  }, []);

  const spendCoins = useCallback((n: number) => {
    if (stateRef.current.coins < n) return false;
    stateRef.current = { ...stateRef.current, coins: stateRef.current.coins - n };
    setState((s) => ({ ...s, coins: s.coins - n }));
    return true;
  }, []);

  const consumeBooster = useCallback((k: "hammer" | "shuffle") => {
    const field = k === "hammer" ? "hammers" : "shuffles";
    if (stateRef.current[field] <= 0) return false;
    stateRef.current = { ...stateRef.current, [field]: stateRef.current[field] - 1 };
    setState((s) => ({ ...s, [field]: s[field] - 1 }));
    return true;
  }, []);

  const completeLevel = useCallback((id: number, stars: number, coins: number) => {
    const prev = stateRef.current.best[id] ?? 0;
    const newStars = Math.max(0, stars - prev);
    setState((s) => {
      const today = dayKey(Date.now());
      const yesterday = dayKey(Date.now() - 86400000);
      const date = new Date();
      const iso = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = iso.getUTCDay() || 7;
      iso.setUTCDate(iso.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(iso.getUTCFullYear(), 0, 1));
      const week = `${iso.getUTCFullYear()}-W${String(Math.ceil((((iso.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)).padStart(2, "0")}`;
      const streak = s.lastPlayDay === today ? Math.max(1, s.streak) : s.lastPlayDay === yesterday ? s.streak + 1 : 1;
      return {
        ...s,
        best: { ...s.best, [id]: Math.max(prev, stars) },
        unlocked: Math.max(s.unlocked, id + 1),
        coins: s.coins + coins,
        stars: s.stars + newStars,
        weeklyStars: { ...s.weeklyStars, [week]: (s.weeklyStars[week] ?? 0) + newStars },
        streak,
        lastPlayDay: today,
        todayWins: s.todayDay === today ? s.todayWins + 1 : 1,
        todayDay: today,
      };
    });
    return { newStars };
  }, []);

  const loseLife = useCallback(() => {
    setState((s) => ({ ...s, lives: Math.max(0, s.lives - 1), lifeAt: s.lives >= MAX_LIVES ? Date.now() : s.lifeAt }));
  }, []);

  const restore = useCallback((taskId: string, cost: number) => {
    const s = stateRef.current;
    if (s.stars < cost || s.restored.includes(taskId)) return false;
    setState((x) => ({ ...x, stars: x.stars - cost, restored: [...x.restored, taskId] }));
    return true;
  }, []);

  const haptic = useCallback((kind: "light" | "medium" | "heavy" | "success" | "error") => {
    if (!stateRef.current.haptics) return;
    try {
      if (kind === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (kind === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else Haptics.impactAsync(kind === "light" ? Haptics.ImpactFeedbackStyle.Light : kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      nextLifeIn: state.lives >= MAX_LIVES ? 0 : Math.max(0, state.lifeAt + LIFE_MS - now),
      freeSpinReady: now - state.lastSpinAt >= SPIN_MS,
      adSpinReady: now - state.lastSpinAt < SPIN_MS && state.adSpinDay !== dayKey(now),
      nextFreeSpinIn: Math.max(0, state.lastSpinAt + SPIN_MS - now),
      markSpin: (kind) =>
        setState((s) => (kind === "free" ? { ...s, lastSpinAt: Date.now() } : { ...s, adSpinDay: dayKey(Date.now()) })),
      isLevelUnlocked: (id) =>
        id <= state.unlocked || (state.unlockAll && (id === chapterFirstLevel(chapterOf(id)) || (state.best[id - 1] ?? 0) > 0)),
      isChapterUnlocked: (ch) => state.unlockAll || chapterFirstLevel(ch) <= state.unlocked,
      update: (p) => setState((s) => ({ ...s, ...p })),
      recordPurchase: (productId, unlockAll) =>
        setState((s) => ({ ...s, purchases: [...s.purchases, productId], unlockAll: s.unlockAll || !!unlockAll })),
      completeLevel,
      loseLife,
      restore,
      setHapticsOn: (v) => setState((s) => ({ ...s, haptics: v })),
      setSoundOn: (v) => setState((s) => ({ ...s, sound: v })),
      setMusicOn: (v) => setState((s) => ({ ...s, music: v })),
      grant,
      spendCoins,
      consumeBooster,
      reset: () => setState(initial()),
      haptic,
    }),
    [state, ready, now, completeLevel, loseLife, restore, haptic, grant, spendCoins, consumeBooster],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress outside provider");
  return ctx;
}

export const formatMs = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function makePlayerId() {
  return `kq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
}
