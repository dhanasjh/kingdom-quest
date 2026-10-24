import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
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
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Phase = "loading" | "ready" | "resolving" | "won" | "lost";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EXTRA_MOVES = 5;
const EXTRA_MOVES_COST = 150;
const HINT_DELAY = 5000;

function remainingFor(o: Objective, s: Stats) {
  const done = o.type === "color" ? s.colors[o.color ?? 0] : o.type === "score" ? s.score : s[o.type];
  return Math.max(0, o.count - done);
}

export default function LevelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = getLevel(Number(id));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useStyles();
  const { colors } = useTheme();
  const prog = useProgress();

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
  const [starterOpen, setStarterOpen] = useState(false);
  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 1500);
    return () => clearTimeout(t);
  }, [cheer]);
  const [hint, setHint] = useState<Pos[] | null>(null);
  const [armed, setArmed] = useState<BoosterKind | null>(null);
  const [shop, setShop] = useState<BoosterKind | null>(null);
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

  const cell = Math.floor(Math.min(width - spacing.lg * 2, 440, height - insets.top - insets.bottom - 350) / 8);

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const commitBoard = (b: Board) => { boardRef.current = b; setBoard(b); };

  const start = useCallback(() => {
    if (!level) return;
    setPhaseBoth("loading");
    setSelected(null);
    setDying(new Set());
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
      for (const k of plan.clear) {
        const pc = bd.pieces[Math.floor(k / 8)][k % 8];
        if (pc && pc.special !== "rainbow" && pc.color >= 0) tally[pc.color]++;
      }
      const topColor = tally.indexOf(Math.max(...tally));
      const s = { ...statsRef.current, colors: [...statsRef.current.colors] };
      const before = s.score;
      const removed = applyClear(bd, plan, s);
      s.score += Math.round((s.score - before) * chain * 0.5);
      statsRef.current = s;
      setStats(s);
      const big = plan.skip.size > 0;
      prog.haptic(big ? "heavy" : chain > 0 ? "medium" : "light");
      playSfx(big ? "special" : comboSfx(chain));
      if ((big || chain >= 2 || plan.spawns.length > 0) && !cheered) {
        cheered = true;
        setCheer({ color: topColor, tick: Date.now(), text: CHEERS[Math.floor(Math.random() * CHEERS.length)] });
        setTimeout(() => playSfx("cheer"), 120);
      }
      if (chain >= 2) setBanner(chain >= 4 ? "Spectacular!" : chain >= 3 ? "Amazing!" : "Great!");
      setDying(new Set(removed));
      await sleep(230);
      if (!alive.current) return;
      bd = cloneBoard(bd);
      const sp = applyGravity(bd, level.colors);
      setDying(new Set());
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
      prog.grant(shop === "hammer" ? { hammers: 1 } : { shuffles: 1 });
      setShop(null);
    }
  };

  const adBooster = async () => {
    const k = shop;
    if (!k) return;
    setShop(null);
    if (await showAd(`booster-${k}`)) prog.grant(k === "hammer" ? { hammers: 1 } : { shuffles: 1 });
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

  const quit = () => {
    if (level && movesRef.current < level.moves && phaseRef.current !== "won" && phaseRef.current !== "lost") prog.loseLife();
    router.back();
  };

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
      <View style={[styles.hud, { paddingTop: insets.top + spacing.sm }]}>
        <GlassFill />
        <View style={styles.hudRow}>
          <ChunkyButton testID="quit-level-button" icon="chevron-left" variant="plain" onPress={() => (movesRef.current < level.moves ? setQuitOpen(true) : quit())} />
          <View style={styles.levelBox}>
            <Text style={styles.kicker} numberOfLines={1}>{CHAPTERS[chId - 1].name}</Text>
            <Text style={styles.levelNum} testID="level-number">{level.id}</Text>
            <Text style={styles.kicker} testID="level-stage">Stage {levelInChapter(level.id)}{level.hard ? " · Hard" : ""}</Text>
          </View>
          <View style={[styles.movesBox, moves <= 5 && { backgroundColor: colors.error }]}>
            <Text style={[styles.kicker, { color: colors.onBrandSecondary }, moves <= 5 && { color: colors.onError }]}>Moves</Text>
            <Text testID="moves-left" style={[styles.moves, moves <= 5 && { color: colors.onError }]}>{moves}</Text>
          </View>
        </View>
        <View style={styles.objRow} testID="objectives-row">
          {level.objectives.map((o, i) => (
            <ObjectiveChip key={i} obj={o} remaining={remainingFor(o, stats)} roster={level.roster} testID={`objective-remaining-${i}`} />
          ))}
        </View>
        <ScoreBar progress={progress} marks={[thresholds[1] / thresholds[2], 1]} score={stats.score} />
      </View>

      <View style={styles.boardArea}>
        {phase === "loading" || !board || board.pieces.length === 0 ? (
          <View style={styles.centered} testID="level-loading">
            <ActivityIndicator color={colors.brandSecondary} size="large" />
            <Text style={styles.kicker}>Loading level objectives...</Text>
          </View>
        ) : (
          <View style={styles.frame} testID="board-frame">
            <GameBoard board={board} cell={cell} dying={dying} spawnFrom={spawnFrom} selected={selected} hint={hint} roster={level.roster} cheer={cheer} onTapCell={onTapCell} onSwipe={runSwap} />
          </View>
        )}
        {banner ? (
          <View pointerEvents="none" style={styles.bannerWrap}>
            <Text style={styles.banner} testID="combo-banner">{banner}</Text>
          </View>
        ) : null}
        <CheerOverlay cheer={cheer} roster={level.roster} />
      </View>

      {armed === "hammer" ? (
        <Text style={styles.armedText} testID="hammer-armed-text">Tap any tile to smash it</Text>
      ) : null}
      <View style={[styles.boosterBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable testID="hero-ability-button" disabled={heroUsed || phase !== "ready"} onPress={useHero} style={[styles.booster, { opacity: heroUsed ? 0.45 : 1 }]}>
          <MaterialDesignIcons name="auto-fix" size={26} color={colors.gold} />
          <Text style={styles.heroLabel}>{heroUsed ? "Used" : "Hero"}</Text>
        </Pressable>
        {(["hammer", "shuffle"] as BoosterKind[]).map((k) => {
          const count = k === "hammer" ? prog.hammers : prog.shuffles;
          const active = armed === k;
          return (
            <Pressable
              key={k}
              testID={`booster-${k}-button`}
              onPress={() => onBooster(k)}
              style={[styles.booster, active && { backgroundColor: colors.brandSecondary, borderColor: colors.borderStrong }]}
            >
              <MaterialDesignIcons name={BOOSTER_INFO[k].icon as any} size={28} color={active ? colors.onBrandSecondary : colors.onSurface} />
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
            <ChunkyButton testID="hero-target-up" icon="chevron-up" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, r: Math.max(0, p.r - 1) }))} />
            <ChunkyButton testID="hero-target-down" icon="chevron-down" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, r: Math.min(7, p.r + 1) }))} />
            <ChunkyButton testID="hero-target-left" icon="chevron-left" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, c: Math.max(0, p.c - 1) }))} />
            <ChunkyButton testID="hero-target-right" icon="chevron-right" variant="plain" onPress={() => setHeroCenter((p) => ({ ...p, c: Math.min(7, p.c + 1) }))} />
            <Text style={styles.heroHint}>{heroCenter.r + 1},{heroCenter.c + 1}</Text>
          </View>
        </View>
      ) : null}

      <StarterOffer visible={starterOpen} onClose={() => setStarterOpen(false)} />
      <BoosterShop
        kind={shop}
        count={shop === "hammer" ? prog.hammers : prog.shuffles}
        coins={prog.coins}
        onBuy={buyBooster}
        onWatchAd={adBooster}
        onClose={() => setShop(null)}
      />

      <ResultsModal
        visible={(phase === "won" || phase === "lost") && !adBusy && !starterOpen}
        won={phase === "won"}
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
          router.back();
        }}
      />

      <Modal visible={quitOpen} transparent animationType="fade" onRequestClose={() => setQuitOpen(false)}>
        <View style={styles.quitBackdrop}>
          <View style={styles.quitCard} testID="quit-confirm-modal">
            <Text style={styles.title}>Leave level?</Text>
            <Text style={styles.body}>You will lose a life if you quit now.</Text>
            <View style={styles.hudRow}>
              <ChunkyButton testID="quit-cancel-button" label="Keep playing" variant="primary" onPress={() => setQuitOpen(false)} />
              <ChunkyButton testID="quit-confirm-button" label="Quit" variant="secondary" onPress={() => { setQuitOpen(false); quit(); }} />
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
  hud: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md, overflow: "hidden", borderWidth: 1.5, borderTopWidth: 0, borderColor: c.glassBorder, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  hudRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  levelBox: { alignItems: "center" },
  kicker: { fontFamily: fonts.textBold, fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 1 },
  levelNum: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  movesBox: { backgroundColor: c.brandSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, alignItems: "center", minWidth: 76, ...lifted(c) },
  moves: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: c.onBrandSecondary },
  objRow: { flexDirection: "row", gap: spacing.lg, justifyContent: "center", flexWrap: "wrap" },
  scoreWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  scoreTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 6 },
  mark: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -2, backgroundColor: c.borderStrong, opacity: 0.4 },
  scoreText: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface, minWidth: 56, textAlign: "right" },
  boardArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { padding: 2 },
  boosterBar: { flexDirection: "row", justifyContent: "center", gap: spacing.xl, paddingTop: spacing.md },
  heroLabel: { fontFamily: fonts.textBold, fontSize: 11, color: c.gold },
  heroTargetRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingBottom: spacing.xs },
  targetControls: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  heroHint: { fontFamily: fonts.textBold, fontSize: 12, color: c.onSurfaceInverse },
  booster: { width: 66, height: 66, borderRadius: 20, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 6, borderColor: c.extrude, ...lifted(c) },
  badge: { position: "absolute", top: -6, right: -6, minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { fontFamily: fonts.display, fontSize: 13, color: c.onBrand },
  armedText: { textAlign: "center", fontFamily: fonts.textBold, fontSize: 14, color: c.onBrandSecondary, backgroundColor: c.brandSecondary, alignSelf: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill, overflow: "hidden" },
  bannerWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  banner: { fontFamily: fonts.display, fontSize: 40, color: c.brandSecondary, textShadowColor: c.shadow, textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  title: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  body: { fontFamily: fonts.text, fontSize: 15, color: c.muted },
  quitBackdrop: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  quitCard: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
}));
