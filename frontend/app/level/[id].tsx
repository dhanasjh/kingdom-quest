import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { BOOSTER_INFO, BoosterKind, BoosterShop } from "@/src/components/BoosterShop";
import { GameBoard } from "@/src/components/GameBoard";
import { ObjectiveChip } from "@/src/components/ObjectiveChip";
import { ResultsModal } from "@/src/components/ResultsModal";
import { useRewardedAd } from "@/src/ads/RewardedAd";
import {
  Board, ClearPlan, Pos, Stats, applyClear, applyGravity, canSwap, cloneBoard, createBoard, emptyStats, expandSpecials,
  findHint, findMatches, hasPossibleMove, key, planCombo, planFromMatches, planHeroAbility, shuffle, swapPieces,
} from "@/src/game/engine";
import { CHAPTERS, Objective, TOTAL_LEVELS, chapterOf, getLevel, levelInChapter, starThresholds, starsForScore } from "@/src/game/levels";
import { ChapterBackground } from "@/src/components/ChapterBackground";
import { GlassFill } from "@/src/components/GlassPanel";
import { CHEERS, Cheer, CheerOverlay } from "@/src/components/CheerOverlay";
import { StarterOffer } from "@/src/components/StarterOffer";
import { useProgress } from "@/src/game/progress";
import { CHARACTER_NAMES, DEFAULT_ROSTER, heroUnlockLevel } from "@/src/game/art";
import { comboSfx, playSfx } from "@/src/game/sound";
import { diwaliEventActive, festivalMatch, festivalPack } from "@/src/game/festivals";
import type { FestivalEffectType } from "@/src/game/festivals";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Phase = "loading" | "ready" | "resolving" | "won" | "lost";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EXTRA_MOVES = 5;
const EXTRA_MOVES_COST = 150;
const HINT_DELAY = 5000;
const createCheer = (color: number, event?: FestivalEffectType, emoji?: string, label?: string): Cheer => ({ color, tick: Date.now(), text: label ?? CHEERS[Math.floor(Math.random() * CHEERS.length)], event, emoji });

function remainingFor(o: Objective, s: Stats) {
  const done = o.type === "color" ? s.colors[o.color ?? 0] : o.type === "score" ? s.score : s[o.type];
  return Math.max(0, o.count - done);
}

export default function LevelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = getLevel(Number(id));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useStyles();
  const { colors } = useTheme();
  const prog = useProgress();
  const diwaliActive = diwaliEventActive();
  const festival = festivalPack(prog.activeFestival) ?? (diwaliActive ? festivalPack("diwali") : undefined);

  const [board, setBoard] = useState<Board | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [moves, setMoves] = useState(0);
  const [stats, setStats] = useState<Stats>(emptyStats());
  const [dying, setDying] = useState<Set<number>>(new Set());
  const [spawnFrom, setSpawnFrom] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<Pos | null>(null);
  const [result, setResult] = useState({ stars: 0, coins: 0, newStars: 0, score: 0 });
  const [quitOpen, setQuitOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [cheer, setCheer] = useState<Cheer | null>(null);
  const [festivalEffects, setFestivalEffects] = useState<Partial<Record<number, FestivalEffectType>>>({});
  const [starterOpen, setStarterOpen] = useState(false);
  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 1500);
    return () => clearTimeout(t);
  }, [cheer]);
  const [hint, setHint] = useState<Pos[] | null>(null);
  const [armed, setArmed] = useState<BoosterKind | null>(null);
  const [shop, setShop] = useState<BoosterKind | null>(null);
  const [boosterAdBusy, setBoosterAdBusy] = useState(false);
  const [extraUsed, setExtraUsed] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [heroUsed, setHeroUsed] = useState(false);
  const [heroCenter, setHeroCenter] = useState<Pos>({ r: 3, c: 3 });
  const showAd = useRewardedAd();

  const boardRef = useRef<Board | null>(null);
  const phaseRef = useRef<Phase>("loading");
  const movesRef = useRef(0);
  const statsRef = useRef<Stats>(emptyStats());
  const alive = useRef(true);
  const boosterAdLock = useRef(false);

  // Keep the grid compact and square: stretching row pitch on tall phones made
  // characters look vertically disconnected from their matching row.
  const boardGridWidth = Math.max(160, Math.min(width - spacing.sm * 1 - 20, 436));
  const cell = Math.max(20, Math.floor(boardGridWidth / 8));
  // React Native dimensions use dp rather than em. 1.6dp approximates 0.1em
  // at a 16px base size and leaves a subtle gap between character rows.
  const cellHeight = cell + 1.6;

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const commitBoard = (b: Board) => { boardRef.current = b; setBoard(b); };

  const start = useCallback(() => {
    if (!level) return;
    setPhaseBoth("loading");
    setSelected(null);
    setDying(new Set());
    setFestivalEffects({});
    setSpawnFrom({});
    setHint(null);
    setArmed(null);
    setExtraUsed(false);
    setHeroUsed(false);
    setHeroCenter({ r: 3, c: 3 });
    const s = emptyStats();
    statsRef.current = s;
    setStats(s);
    movesRef.current = level.moves;
    setMoves(level.moves);
    // Board validated: no initial matches, at least one legal move.
    const b = createBoard(level.layout, level.colors);
    commitBoard(b);
    setTimeout(() => alive.current && setPhaseBoth("ready"), 250);
  }, [level]);

  useEffect(() => {
    alive.current = true;
    const timer = setTimeout(() => start(), 0);
    return () => { clearTimeout(timer); alive.current = false; };
  }, [start]);

  const objectivesDone = (s: Stats) => !!level && level.objectives.every((o) => remainingFor(o, s) === 0);

  // Glowing hint after idling in Ready.
  useEffect(() => {
    if (phase !== "ready" || !board) return;
    const t = setTimeout(() => {
      const h = boardRef.current && findHint(boardRef.current);
      if (h && phaseRef.current === "ready") setHint(h);
    }, HINT_DELAY);
    return () => clearTimeout(t);
  }, [phase, board, selected]);

  const finish = (won: boolean) => {
    if (!level) return;
    setHint(null);
    setArmed(null);
    if (won) {
      const bonus = movesRef.current * 250;
      const score = statsRef.current.score + bonus;
      const stars = starsForScore(level, score);
      const coins = 20 + stars * 10 + movesRef.current * 2;
      const { newStars } = prog.completeLevel(level.id, stars, coins);
      setResult({ stars, coins, newStars, score });
      prog.haptic("success");
      playSfx("win");
      setPhaseBoth("won");
    } else {
      // Life is only deducted when the player gives up (Retry / Map), so extra moves can rescue it.
      prog.haptic("error");
      playSfx("lose");
      setResult({ stars: 0, coins: 0, newStars: 0, score: statsRef.current.score });
      setPhaseBoth("lost");
      if (!prog.starterShown) {
        prog.update({ starterShown: true });
        setTimeout(() => setStarterOpen(true), 500);
      }
    }
  };

  // Resolving -> cascades -> Checking
  const resolve = async (initial: Board, first: ClearPlan) => {
    if (!level) return;
    let bd = initial;
    let plan: ClearPlan | null = first;
    let chain = 0;
    let cheered = false;
    while (plan) {
      expandSpecials(bd, plan);
      // tally which character is being cleared most (for celebrations)
      const tally: number[] = [0, 0, 0, 0, 0, 0];
      const matched: number[] = [0, 0, 0, 0, 0, 0];
      for (const k of plan.clear) {
        const pc = bd.pieces[Math.floor(k / 8)][k % 8];
        if (pc && pc.special !== "rainbow" && pc.color >= 0) tally[pc.color]++;
      }
      for (const k of plan.matchCells) {
        const pc = bd.pieces[Math.floor(k / 8)][k % 8];
        if (pc && pc.special !== "rainbow" && pc.color >= 0) matched[pc.color]++;
      }
      const topColor = tally.indexOf(Math.max(...tally));
      const celebration = festivalMatch(festival, matched);
      const matchedFestivalEffects = festival && matched.reduce<Partial<Record<number, FestivalEffectType>>>((acc, n, color) => {
        if (n >= 3) acc[color] = festival.effects[color];
        return acc;
      }, {});
      const s = { ...statsRef.current, colors: [...statsRef.current.colors] };
      const before = s.score;
      const removed = applyClear(bd, plan, s);
      s.score += Math.round((s.score - before) * chain * 0.5);
      statsRef.current = s;
      setStats(s);
      const big = plan.skip.size > 0;
      prog.haptic(big ? "heavy" : chain > 0 ? "medium" : "light");
      if (celebration) playSfx(celebration.sound);
      else playSfx(big ? "special" : comboSfx(chain, prog.activeSoundPack));
      if ((big || chain >= 2 || plan.spawns.length > 0 || celebration) && !cheered) {
        cheered = true;
        if (celebration) setCheer(createCheer(celebration.color, celebration.effect, celebration.emoji, celebration.label));
        else {
          setCheer(createCheer(topColor));
          setTimeout(() => playSfx("cheer"), 120);
        }
      }
      if (chain >= 2) setBanner(chain >= 4 ? "Spectacular!" : chain >= 3 ? "Amazing!" : "Great!");
      setDying(new Set(removed));
      setFestivalEffects(matchedFestivalEffects ?? {});
      await sleep(230);
      if (!alive.current) return;
      bd = cloneBoard(bd);
      const sp = applyGravity(bd, level.colors);
      setDying(new Set());
      setFestivalEffects({});
      setSpawnFrom(sp);
      commitBoard(bd);
      await sleep(360);
      if (!alive.current) return;
      bd = cloneBoard(bd);
      chain++;
      const groups = findMatches(bd);
      plan = groups.length ? planFromMatches(bd, groups, []) : null;
    }
    setBanner(null);

    if (objectivesDone(statsRef.current)) return finish(true);
    if (movesRef.current <= 0) return finish(false);
    if (!hasPossibleMove(bd)) {
      setBanner("Shuffling...");
      await sleep(400);
      commitBoard(shuffle(bd));
      await sleep(300);
      setBanner(null);
    }
    setPhaseBoth("ready");
  };

  const runSwap = async (a: Pos, b: Pos) => {
    if (!level || !boardRef.current || phaseRef.current !== "ready") return;
    if (armed) return;
    if (!canSwap(boardRef.current, a, b)) { setSelected(null); return; }
    setPhaseBoth("resolving");
    setSelected(null);
    setHint(null);
    prog.haptic("light");
    playSfx("swap");
    let bd = cloneBoard(boardRef.current);
    swapPieces(bd, a, b);
    setSpawnFrom({});
    commitBoard(bd);
    await sleep(190);
    if (!alive.current) return;

    bd = cloneBoard(bd);
    let plan = planCombo(bd, a, b);
    if (!plan) {
      const groups = findMatches(bd);
      if (!groups.length) {
        // Invalid swap reversed
        playSfx("invalid");
        swapPieces(bd, a, b);
        commitBoard(bd);
        await sleep(190);
        setPhaseBoth("ready");
        return;
      }
      plan = planFromMatches(bd, groups, [b, a]);
    }
    movesRef.current -= 1;
    setMoves(movesRef.current);
    await resolve(bd, plan);
  };

  const runHammer = async (p: Pos) => {
    const b0 = boardRef.current;
    if (!b0 || phaseRef.current !== "ready") return;
    if (!b0.pieces[p.r][p.c] && b0.tiles[p.r][p.c].crate === 0) return;
    if (!prog.consumeBooster("hammer")) return;
    setArmed(null);
    setSelected(null);
    setHint(null);
    setPhaseBoth("resolving");
    playSfx("hammer");
    prog.haptic("heavy");
    await resolve(cloneBoard(b0), { clear: new Set([key(p.r, p.c)]), matchCells: new Set(), spawns: [], skip: new Set() });
  };

  const runShuffle = async () => {
    const b0 = boardRef.current;
    if (!b0 || phaseRef.current !== "ready") return;
    if (!prog.consumeBooster("shuffle")) return;
    setSelected(null);
    setHint(null);
    setArmed(null);
    setPhaseBoth("resolving");
    playSfx("combo1");
    prog.haptic("medium");
    setBanner("Shuffling...");
    await sleep(250);
    commitBoard(shuffle(b0));
    await sleep(350);
    setBanner(null);
    if (alive.current) setPhaseBoth("ready");
  };

  const runSnake = async () => {
    if (!level?.hard || !boardRef.current || phaseRef.current !== "ready") return;
    if (!prog.consumeBooster("snake")) return setShop("snake");
    setSelected(null);
    setHint(null);
    setArmed(null);
    setPhaseBoth("resolving");
    setBanner("Royal Snake! Objectives cleared!");
    playSfx("special");
    prog.haptic("heavy");
    const next = { ...statsRef.current, colors: [...statsRef.current.colors] };
    for (const objective of level.objectives) {
      if (objective.type === "color") next.colors[objective.color ?? 0] = Math.max(next.colors[objective.color ?? 0] ?? 0, objective.count);
      else if (objective.type === "score") next.score = Math.max(next.score, objective.count, starThresholds(level)[2]);
      else next[objective.type] = Math.max(next[objective.type], objective.count);
    }
    statsRef.current = next;
    setStats(next);
    await sleep(650);
    if (alive.current) finish(true);
  };

  const useHero = async () => {
    if (!level || !boardRef.current || phaseRef.current !== "ready" || heroUsed) return;
    const unlockedHero = (level.roster ?? DEFAULT_ROSTER).find((hero) => DEFAULT_ROSTER.includes(hero) || prog.unlocked - 1 >= heroUnlockLevel(hero));
    if (unlockedHero === undefined) return;
    setHeroUsed(true);
    setPhaseBoth("resolving");
    setSelected(null);
    setHint(null);
    setBanner(`${CHARACTER_NAMES[unlockedHero]} power!`);
    prog.haptic("heavy");
    playSfx("special");
    await resolve(cloneBoard(boardRef.current), planHeroAbility(boardRef.current, heroCenter, unlockedHero));
  };

  const onBooster = (k: BoosterKind) => {
    if (phaseRef.current !== "ready") return;
    if (k === "snake") return void runSnake();
    const count = k === "hammer" ? prog.hammers : prog.shuffles;
    if (count <= 0) return setShop(k);
    prog.haptic("light");
    if (k === "hammer") setArmed((a) => (a === "hammer" ? null : "hammer"));
    else runShuffle();
  };

  const buyBooster = () => {
    if (!shop) return;
    if (prog.spendCoins(BOOSTER_INFO[shop].cost)) {
      playSfx("coin");
      prog.grant(shop === "hammer" ? { hammers: 1 } : shop === "shuffle" ? { shuffles: 1 } : { snakes: 1 });
      setShop(null);
    }
  };

  const adBooster = async () => {
    const k = shop;
    if (!k || !prog.adBoosterReady || boosterAdLock.current) return;
    boosterAdLock.current = true;
    setBoosterAdBusy(true);
    setShop(null);
    try {
      if (await showAd(`booster-${k}`)) {
        prog.markAdReward("booster");
        prog.grant(k === "hammer" ? { hammers: 1 } : k === "shuffle" ? { shuffles: 1 } : { snakes: 1 });
      }
    } finally {
      boosterAdLock.current = false;
      setBoosterAdBusy(false);
    }
  };

  const addExtraMoves = () => {
    movesRef.current += EXTRA_MOVES;
    setMoves(movesRef.current);
    setExtraUsed(true);
    setPhaseBoth("ready");
  };

  const adExtraMoves = async () => {
    setAdBusy(true);
    const ok = await showAd("extra-moves");
    setAdBusy(false);
    if (ok) addExtraMoves();
  };

  const buyExtraMoves = () => {
    if (prog.spendCoins(EXTRA_MOVES_COST)) {
      playSfx("coin");
      addExtraMoves();
    }
  };

  const onTapCell = (p: Pos) => {
    if (phaseRef.current !== "ready" || !boardRef.current) return;
    if (armed === "hammer") return void runHammer(p);
    if (!selected) {
      if (canSelect(boardRef.current, p)) setSelected(p);
      return;
    }
    if (selected.r === p.r && selected.c === p.c) return setSelected(null);
    if (Math.abs(selected.r - p.r) + Math.abs(selected.c - p.c) === 1) return void runSwap(selected, p);
    setSelected(canSelect(boardRef.current, p) ? p : null);
  };

  const quit = useCallback(() => {
    if (level && movesRef.current < level.moves && phaseRef.current !== "won" && phaseRef.current !== "lost") prog.loseLife();
    router.replace("/");
  }, [level, prog, router]);

  useEffect(() => {
    // React Navigation's web history owns browser Back. BackHandler is for the
    // Android hardware button only; registering it on web can produce an
    // unhandled GO_BACK warning when the level is the root route.
    if (Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      // A native Modal handles Back through onRequestClose. This listener keeps
      // the level route from dispatching an unhandled navigation GO_BACK.
      if (phaseRef.current === "won" || phaseRef.current === "lost") {
        router.replace("/");
      } else if (level && movesRef.current < level.moves) {
        setQuitOpen(true);
      } else {
        quit();
      }
      return true;
    });
    return () => subscription.remove();
  }, [level, quit, router]);

  if (!level) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.title} testID="level-error-text">Level not found</Text>
        <ChunkyButton testID="level-error-back-button" label="Back to Map" onPress={() => router.replace("/")} />
      </View>
    );
  }

  const thresholds = starThresholds(level);
  const progress = Math.min(1, stats.score / thresholds[2]);
  const nextId = level.id + 1 <= TOTAL_LEVELS ? level.id + 1 : null;
  const chId = chapterOf(level.id);

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={chId} dim={false} />
      <View style={[styles.hud, { paddingTop: insets.top + 2 }]}>
        <GlassFill />
        <View style={styles.hudRow}>
          <ChunkyButton testID="quit-level-button" icon="chevron-left" variant="plain" onPress={() => (movesRef.current < level.moves ? setQuitOpen(true) : quit())} size="sm" />
          <View style={styles.levelBox}>
            <Text style={styles.stageLabel} numberOfLines={1} testID="level-stage">{CHAPTERS[chId - 1].name} · Stage {levelInChapter(level.id)}{level.hard ? " · Hard" : ""}</Text>
            <Text style={styles.levelNum} testID="level-number">{level.id}</Text>
          </View>
          <View style={[styles.movesBox, moves <= 5 && { backgroundColor: colors.error }]}>
            <Text style={[styles.kicker, { color: colors.onBrandSecondary }, moves <= 5 && { color: colors.onError }]}>Moves</Text>
            <Text testID="moves-left" style={[styles.moves, moves <= 5 && { color: colors.onError }]}>{moves}</Text>
          </View>
        </View>
        <View style={styles.objRow} testID="objectives-row">
          {level.objectives.map((o, i) => (
            <ObjectiveChip key={i} obj={o} remaining={remainingFor(o, stats)} roster={level.roster} customPhotos={prog.characterPhotos} testID={`objective-remaining-${i}`} />
          ))}
        </View>
        <ScoreBar progress={progress} marks={[thresholds[1] / thresholds[2], 1]} score={stats.score} />
      </View>

      <View style={[styles.boardArea, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl + spacing.md + spacing.sm }]}>
        <View style={styles.boardStage}>
          {phase === "loading" || !board || board.pieces.length === 0 ? (
            <View style={styles.centered} testID="level-loading">
              <ActivityIndicator color={colors.brandSecondary} size="large" />
              <Text style={styles.kicker}>Loading level objectives...</Text>
            </View>
          ) : (
            <View style={[styles.frame, festival && styles.festivalFrame]} testID="board-frame">
              <GlassFill blur={false} tint="rgba(255,255,255,0.045)" sheenOpacity={0.2} />
              <GameBoard board={board} cell={cell} cellHeight={cellHeight} dying={dying} spawnFrom={spawnFrom} selected={selected} hint={hint} roster={level.roster} customPhotos={prog.characterPhotos} festivalTiles={festival?.tiles} festivalEffects={festivalEffects} cheer={cheer} onTapCell={onTapCell} onSwipe={runSwap} />
            </View>
          )}
          {banner ? (
            <View style={[styles.bannerWrap, { pointerEvents: "none" }]}>
              <Text style={styles.banner} testID="combo-banner">{banner}</Text>
            </View>
          ) : null}
          <View style={[styles.cheerPlacement, { pointerEvents: "none" }]}>
            <CheerOverlay cheer={cheer} roster={level.roster} customPhotos={prog.characterPhotos} compact />
          </View>
          {armed === "hammer" ? (
            <Text style={styles.armedText} testID="hammer-armed-text">Tap any tile to smash it</Text>
          ) : null}
        </View>
        <View style={[styles.bottomDock, { pointerEvents: "box-none" }]}>
        <View style={styles.boosterBar}>
        <Pressable testID="hero-ability-button" disabled={heroUsed || phase !== "ready"} onPress={useHero} style={[styles.booster, { opacity: heroUsed ? 0.45 : 1 }]}>
          <MaterialDesignIcons name="auto-fix" size={24} color={colors.gold} />
          <Text style={styles.heroLabel}>{heroUsed ? "Used" : "Hero"}</Text>
        </Pressable>
        {(["hammer", "shuffle", ...(level.hard ? ["snake" as const] : [])] as BoosterKind[]).map((k) => {
          const count = k === "hammer" ? prog.hammers : k === "shuffle" ? prog.shuffles : prog.snakes;
          const active = armed === k;
          return (
            <Pressable
              key={k}
              testID={`booster-${k}-button`}
              onPress={() => onBooster(k)}
              style={[styles.booster, active && { backgroundColor: colors.brandSecondary, borderColor: colors.borderStrong }]}
            >
              <MaterialDesignIcons name={BOOSTER_INFO[k].icon as any} size={25} color={active ? colors.onBrandSecondary : colors.onSurface} />
              <View style={[styles.badge, { backgroundColor: count > 0 ? colors.brand : colors.brandSecondary }]}>
                {count > 0 ? (
                  <Text style={styles.badgeText} testID={`booster-${k}-count`}>{count}</Text>
                ) : (
                  <MaterialDesignIcons testID={`booster-${k}-count`} name="plus" size={14} color={colors.onBrand} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      {!heroUsed && phase === "ready" ? (
        <View style={styles.heroTargetRow}>
          <Text style={styles.heroHint}>Power target</Text>
          <View style={styles.targetControls}>
            <ChunkyButton testID="hero-target-up" icon="chevron-up" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, r: Math.max(0, p.r - 1) }))} size="xs" />
            <ChunkyButton testID="hero-target-down" icon="chevron-down" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, r: Math.min(7, p.r + 1) }))} size="xs" />
            <ChunkyButton testID="hero-target-left" icon="chevron-left" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, c: Math.max(0, p.c - 1) }))} size="xs" />
            <ChunkyButton testID="hero-target-right" icon="chevron-right" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, c: Math.min(7, p.c + 1) }))} size="xs" />
            <Text style={styles.heroHint}>{heroCenter.r + 1},{heroCenter.c + 1}</Text>
          </View>
        </View>
      ) : null}
        </View>
      </View>

      <StarterOffer visible={starterOpen} onClose={() => setStarterOpen(false)} />
      <BoosterShop
        kind={shop}
        count={shop === "hammer" ? prog.hammers : shop === "shuffle" ? prog.shuffles : prog.snakes}
        coins={prog.coins}
        watchAdAvailable={prog.adBoosterReady}
        watchAdBusy={boosterAdBusy}
        onBuy={buyBooster}
        onWatchAd={adBooster}
        onClose={() => setShop(null)}
      />

      <ResultsModal
        visible={(phase === "won" || phase === "lost") && !adBusy && !starterOpen}
        won={phase === "won"}
        festivalCelebration={phase === "won" ? festival?.celebration : undefined}
        level={level.id}
        stars={result.stars}
        score={result.score}
        coins={result.coins}
        newStars={result.newStars}
        hasNext={!!nextId}
        canRetry={phase === "won" ? prog.lives > 0 : prog.lives > 1}
        extraAvailable={!extraUsed}
        extraMoves={EXTRA_MOVES}
        extraCost={EXTRA_MOVES_COST}
        coinBalance={prog.coins}
        onAdMoves={adExtraMoves}
        onBuyMoves={buyExtraMoves}
        onContinue={() => (nextId ? router.replace(`/level/${nextId}`) : router.replace("/kingdom"))}
        onRetry={() => {
          if (phase === "lost") prog.loseLife();
          start();
        }}
        onMap={() => {
          if (phase === "lost") prog.loseLife();
          router.replace("/");
        }}
      />

      <Modal visible={quitOpen} transparent animationType="fade" onRequestClose={() => setQuitOpen(false)}>
        <View style={styles.quitBackdrop}>
          <View style={styles.quitCard} testID="quit-confirm-modal">
            <View style={styles.quitEmblem}>
              <MaterialDesignIcons name="heart-broken" size={34} color={colors.heart} />
            </View>
            <Text style={[styles.title, { textAlign: "center" }]}>Pause your adventure?</Text>
            <Text style={[styles.body, { textAlign: "center" }]}>Leaving now will use one life. Your level progress will not be saved.</Text>
            <View style={styles.hudRow}>
              <ChunkyButton testID="quit-cancel-button" label="Keep playing" variant="primary" onPress={() => setQuitOpen(false)} style={{ flex: 1 }} />
              <ChunkyButton testID="quit-confirm-button" label="Leave" variant="plain" onPress={() => { setQuitOpen(false); quit(); }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function canSelect(b: Board, p: Pos) {
  const t = b.tiles[p.r][p.c];
  return !!b.pieces[p.r][p.c] && t.crate === 0 && !t.lock && !t.vine;
}

function ScoreBar({ progress, marks, score }: { progress: number; marks: number[]; score: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const anim = useAnimatedStyle(() => ({ width: withTiming(`${progress * 100}%`, { duration: 300 }) }));
  return (
    <View style={styles.scoreWrap}>
      <View style={styles.scoreTrack}>
        <Animated.View style={[styles.scoreFill, { backgroundColor: colors.gold }, anim]} />
        {marks.map((m, i) => (
          <View key={i} style={[styles.mark, { left: `${m * 100}%` }]} />
        ))}
      </View>
      <Text style={styles.scoreText} testID="score-value">{score}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  hud: { paddingHorizontal: spacing.md, paddingBottom: 4, gap: 2, overflow: "hidden", borderWidth: 1.5, borderTopWidth: 0, borderColor: c.glassBorder, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  hudRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  levelBox: { alignItems: "center" },
  kicker: { fontFamily: fonts.textBold, fontSize: 9, color: c.muted, textTransform: "uppercase", letterSpacing: 0.65 },
  stageLabel: { fontFamily: fonts.textBold, fontSize: 11, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.45, backgroundColor: "rgba(24,33,48,0.94)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 3 },
  levelNum: { fontFamily: fonts.display, fontSize: 21, lineHeight: 23, color: c.onSurface },
  movesBox: { backgroundColor: c.brandSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.sm, paddingVertical: 2, alignItems: "center", minWidth: 56, ...lifted(c) },
  moves: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: c.onBrandSecondary },
  objRow: { flexDirection: "row", gap: spacing.md, justifyContent: "center", flexWrap: "wrap" },
  scoreWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  scoreTrack: { flex: 1, height: 9, borderRadius: 6, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 6 },
  mark: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -2, backgroundColor: c.borderStrong, opacity: 0.4 },
  scoreText: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface, minWidth: 56, textAlign: "right" },
  boardArea: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 0, gap: 0 },
  boardStage: { flex: 1, minHeight: 0, width: "100%", alignItems: "center", justifyContent: "center", paddingBottom: 4 },
  frame: { position: "relative", overflow: "hidden", padding: 4, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 2, borderColor: "rgba(255,255,255,0.82)" },
  festivalFrame: { borderColor: "rgba(255,209,102,0.92)", backgroundColor: "rgba(255,255,255,0.07)" },
  bottomDock: { width: "100%", alignItems: "center", justifyContent: "flex-start", gap: 3, paddingTop: 2, marginTop: 0 },
  boosterBar: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  heroLabel: { fontFamily: fonts.textBold, fontSize: 11, color: c.gold },
  heroTargetRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  targetControls: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  heroHint: { fontFamily: fonts.textBold, fontSize: 12, color: c.onSurfaceInverse },
  booster: { width: 54, height: 54, borderRadius: 17, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 4, borderColor: c.extrude, ...lifted(c) },
  badge: { position: "absolute", top: -5, right: -5, minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { fontFamily: fonts.display, fontSize: 13, color: c.onBrand },
  armedText: { position: "absolute", top: 42, zIndex: 5, textAlign: "center", fontFamily: fonts.textBold, fontSize: 14, color: c.onBrandSecondary, backgroundColor: c.brandSecondary, alignSelf: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill, overflow: "hidden" },
  bannerWrap: { position: "absolute", top: 8, left: 0, right: 0, zIndex: 4, minHeight: 26, alignItems: "center", justifyContent: "center" },
  cheerPlacement: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 3 },
  banner: { fontFamily: fonts.display, fontSize: 20, color: c.brandSecondary, textShadowColor: c.shadow, textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  title: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  body: { fontFamily: fonts.text, fontSize: 15, color: c.muted },
  quitBackdrop: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  quitCard: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  quitEmblem: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center", backgroundColor: c.surfaceTertiary, borderWidth: 2, borderColor: c.glassBorder },
}));
