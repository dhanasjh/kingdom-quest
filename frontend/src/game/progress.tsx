import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";

import { storage } from "@/src/utils/storage";
import { setMusicEnabled, setMusicTrack, setSfxEnabled, startMusic } from "@/src/game/sound";
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
  musicTrack: number;
  customMusicUri: string | null;
  customMusicName: string;
  customMusicUnlocked: boolean;
  unlockedMusicPacks: string[];
  unlockedSoundPacks: string[];
  activeSoundPack: string;
  hammers: number;
  shuffles: number;
  snakes: number;
  characterPhotos: (string | null)[];
  unlockedFestivals: string[];
  activeFestival: string | null;
  lastSpinAt: number;
  freeSpinDay: string;
  freeSpinCount: number;
  adSpinDay: string;
  adLifeDay: string;
  adCoinsDay: string;
  adBoosterDay: string;
  unlockAll: boolean;
  purchases: string[];
  starterShown: boolean;
  streak: number;
  lastPlayDay: string;
  streakRewardDay: string;
  todayWins: number;
  todayDay: string;
  goalClaimedDay: string;
  leaderboardName: string;
  leaderboardJoined: boolean;
  weeklyStars: Record<string, number>;
  playerId: string;
};

const initial = (): Saved => ({
  best: {}, unlocked: 1, coins: 0, stars: 0, lives: MAX_LIVES, lifeAt: Date.now(), restored: [], haptics: true,
  sound: true, music: true, musicTrack: 0, customMusicUri: null, customMusicName: "", customMusicUnlocked: false,
  unlockedMusicPacks: ["forest", "carnival", "starry"], unlockedSoundPacks: ["classic"], activeSoundPack: "classic",
  hammers: 3, shuffles: 3, snakes: 0, characterPhotos: [null, null, null, null, null, null], unlockedFestivals: [], activeFestival: null, lastSpinAt: 0, freeSpinDay: "", freeSpinCount: 0, adSpinDay: "", adLifeDay: "", adCoinsDay: "", adBoosterDay: "", unlockAll: false, purchases: [],
  starterShown: false, streak: 0, lastPlayDay: "", streakRewardDay: "", todayWins: 0, todayDay: "", goalClaimedDay: "", leaderboardName: "", leaderboardJoined: false, weeklyStars: {}, playerId: "",
});

export const DAILY_GOAL = 3;
export const DAILY_GOAL_REWARD = 150;
export const todayKey = () => new Date().toDateString();

const dayKey = (t: number) => new Date(t).toDateString();

function regen(s: Saved, now: number): Saved {
  if (s.lives >= MAX_LIVES) return { ...s, lifeAt: now };
  const gained = Math.floor((now - s.lifeAt) / LIFE_MS);
  if (gained <= 0) return s;
  const lives = Math.min(MAX_LIVES, s.lives + gained);
  return { ...s, lives, lifeAt: lives >= MAX_LIVES ? now : s.lifeAt + gained * LIFE_MS };
}

type Grant = { coins?: number; lives?: number; hammers?: number; shuffles?: number; snakes?: number };

type Ctx = Saved & {
  ready: boolean;
  nextLifeIn: number;
  freeSpinReady: boolean;
  freeSpinsRemaining: number;
  adSpinReady: boolean;
  nextFreeSpinIn: number;
  markSpin: (kind: "free" | "ad") => void;
  adLifeReady: boolean;
  adCoinsReady: boolean;
  adBoosterReady: boolean;
  markAdReward: (kind: "life" | "coins" | "booster") => void;
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
  setMusicTrackNumber: (v: number) => void;
  grant: (g: Grant) => void;
  spendCoins: (n: number) => boolean;
  consumeBooster: (k: "hammer" | "shuffle" | "snake") => boolean;
  claimStreakBonus: () => boolean;
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
          const parsed = { ...initial(), ...JSON.parse(raw) } as Saved;
          // Migrate users from the previous one-free-spin-per-24-hours rule.
          if (!parsed.freeSpinDay && parsed.lastSpinAt) {
            parsed.freeSpinDay = dayKey(parsed.lastSpinAt);
            parsed.freeSpinCount = 1;
          }
          setState(regen(parsed, Date.now()));
        } catch {}
      }
      setState((s) => ({
        ...s,
        playerId: s.playerId || makePlayerId(),
        leaderboardName: s.leaderboardName || makePlayerName(),
      }));
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
    setMusicTrack(state.musicTrack, state.customMusicUri);
    if (state.music) startMusic();
  }, [state.sound, state.music, state.musicTrack, state.customMusicUri]);

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
        snakes: s.snakes + (g.snakes ?? 0),
      };
    });
  }, []);

  const spendCoins = useCallback((n: number) => {
    if (stateRef.current.coins < n) return false;
    stateRef.current = { ...stateRef.current, coins: stateRef.current.coins - n };
    setState((s) => ({ ...s, coins: s.coins - n }));
    return true;
  }, []);

  const consumeBooster = useCallback((k: "hammer" | "shuffle" | "snake") => {
    const field = k === "hammer" ? "hammers" : k === "shuffle" ? "shuffles" : "snakes";
    if (stateRef.current[field] <= 0) return false;
    stateRef.current = { ...stateRef.current, [field]: stateRef.current[field] - 1 };
    setState((s) => ({ ...s, [field]: s[field] - 1 }));
    return true;
  }, []);

  const claimStreakBonus = useCallback(() => {
    const current = stateRef.current;
    const today = dayKey(Date.now());
    if (current.streak < 3 || current.lastPlayDay !== today || current.streakRewardDay === today) return false;
    const next = { ...current, coins: current.coins + 50, streakRewardDay: today };
    stateRef.current = next;
    setState(next);
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
      freeSpinReady: (state.freeSpinDay === dayKey(now) ? state.freeSpinCount : 0) < 2,
      freeSpinsRemaining: Math.max(0, 2 - (state.freeSpinDay === dayKey(now) ? state.freeSpinCount : 0)),
      adSpinReady: state.adSpinDay !== dayKey(now),
      nextFreeSpinIn: (state.freeSpinDay === dayKey(now) ? state.freeSpinCount : 0) < 2 ? 0 : Math.max(0, (() => { const next = new Date(now); next.setHours(24, 0, 0, 0); return next.getTime() - now; })()),
      adLifeReady: state.adLifeDay !== dayKey(now),
      adCoinsReady: state.adCoinsDay !== dayKey(now),
      adBoosterReady: state.adBoosterDay !== dayKey(now),
      markSpin: (kind) => setState((s) => {
        const today = dayKey(Date.now());
        if (kind === "ad") return { ...s, adSpinDay: today };
        const count = s.freeSpinDay === today ? s.freeSpinCount : 0;
        return count >= 2 ? s : { ...s, lastSpinAt: Date.now(), freeSpinDay: today, freeSpinCount: count + 1 };
      }),
      markAdReward: (kind) => setState((s) => ({
        ...s,
        [kind === "life" ? "adLifeDay" : kind === "coins" ? "adCoinsDay" : "adBoosterDay"]: dayKey(Date.now()),
      })),
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
      setMusicTrackNumber: (v) => setState((s) => ({ ...s, musicTrack: Math.max(0, Math.min(4, Math.floor(v))), customMusicUri: null, customMusicName: "" })),
      grant,
      spendCoins,
      consumeBooster,
      claimStreakBonus,
      reset: () => setState({ ...initial(), characterPhotos: stateRef.current.characterPhotos }),
      haptic,
    }),
    [state, ready, now, completeLevel, loseLife, restore, haptic, grant, spendCoins, consumeBooster, claimStreakBonus],
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

const SAFE_NICKNAMES = ["Brave Lion", "Magic Mouse", "Happy Dragon", "Star Bunny", "Golden Fox", "Kind Panda"];
function makePlayerName() {
  return `${SAFE_NICKNAMES[Math.floor(Math.random() * SAFE_NICKNAMES.length)]} ${Math.floor(100 + Math.random() * 900)}`;
}
