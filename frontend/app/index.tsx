import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { useRewardedAd } from "@/src/ads/RewardedAd";
import { playSfx } from "@/src/game/sound";
import { MAX_LIVES, formatMs, useProgress } from "@/src/game/progress";
import { ChapterBackground } from "@/src/components/ChapterBackground";
import { GlassPanel } from "@/src/components/GlassPanel";
import { LevelStartSheet } from "@/src/components/LevelStartSheet";
import { CHAPTER_BG } from "@/src/game/art";
import { SpinWheel } from "@/src/components/SpinWheel";
import { DailyQuest } from "@/src/components/DailyQuest";
import { CurrencyPill } from "@/src/components/CurrencyPill";

import { CHAPTERS, LEVELS_PER_CHAPTER, LevelDef, TOTAL_LEVELS, chapterOf, getLevel } from "@/src/game/levels";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const LIFE_REFILL_COST = 200;

export default function MapScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prog = useProgress();
  const [picked, setPicked] = useState<LevelDef | null>(null);
  const [settings, setSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [livesOpen, setLivesOpen] = useState(false);
  const [spinOpen, setSpinOpen] = useState(false);
  const autoSpin = useRef(false);
  useEffect(() => {
    // Offer the daily spin once per app session when it's ready.
    if (!prog.ready || autoSpin.current || !prog.freeSpinReady) return;
    autoSpin.current = true;
    const t = setTimeout(() => setSpinOpen(true), 900);
    return () => clearTimeout(t);
  }, [prog.ready, prog.freeSpinReady]);
  const showAd = useRewardedAd();

  const adLife = async () => {
    setPicked(null);
    setLivesOpen(false);
    if (await showAd("free-life")) prog.grant({ lives: 1 });
  };

  const refillLives = () => {
    if (prog.spendCoins(LIFE_REFILL_COST)) {
      playSfx("coin");
      prog.grant({ lives: MAX_LIVES });
      setLivesOpen(false);
    }
  };

  const currentLevel = Math.min(prog.unlocked, TOTAL_LEVELS);
  const curCh = chapterOf(currentLevel);
  const chapter = CHAPTERS[curCh - 1];
  const headerH = insets.top + 128;
  const chStats = useMemo(() => {
    const s = CHAPTERS.map(() => ({ stars: 0, cleared: 0 }));
    for (const [k, v] of Object.entries(prog.best)) {
      const c = chapterOf(Number(k)) - 1;
      if (s[c] && v > 0) {
        s[c].stars += v;
        s[c].cleared += 1;
      }
    }
    return s;
  }, [prog.best]);

  const play = (id: number) => {
    if (prog.lives <= 0) return;
    prog.haptic("light");
    setPicked(null);
    router.push(`/level/${id}`);
  };

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={curCh} />
      <FlatList
        testID="chapter-list"
        ListHeaderComponent={<DailyQuest />}
        data={CHAPTERS}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingTop: headerH + spacing.lg, paddingBottom: insets.bottom + 120, paddingHorizontal: spacing.lg, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: ch, index: i }) => {
          const open = prog.isChapterUnlocked(ch.id);
          const current = ch.id === curCh;
          const st = chStats[i];
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(i, 6) * 50)}>
              <Pressable
                testID={`chapter-card-${ch.id}`}
                disabled={!open}
                onPress={() => {
                  prog.haptic("light");
                  router.push(`/chapter/${ch.id}`);
                }}
              >
                <GlassPanel blur={false} strong style={[styles.chCard, current && { borderColor: ch.accent, borderWidth: 3 }]}>
                  <View style={styles.thumbWrap}>
                    <Image source={CHAPTER_BG[i]} style={styles.thumb} contentFit="cover" />
                    {!open ? (
                      <View style={[styles.thumbLock, { backgroundColor: colors.scrim }]}>
                        <MaterialDesignIcons name="lock" size={26} color={colors.onSurfaceInverse} />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.chKicker}>Chapter {ch.id}{current ? " · Now playing" : ""}</Text>
                    <Text style={styles.chTitle} numberOfLines={1}>{ch.name}</Text>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${(st.cleared / LEVELS_PER_CHAPTER) * 100}%`, backgroundColor: ch.accent === "#FFD166" ? colors.brandSecondary : ch.accent }]} />
                    </View>
                    <View style={styles.inline}>
                      <MaterialDesignIcons name="star" size={15} color={colors.gold} />
                      <Text style={styles.chSmall} testID={`chapter-stars-${ch.id}`}>{st.stars}/{LEVELS_PER_CHAPTER * 3}</Text>
                      <Text style={styles.chSmall} testID={`chapter-cleared-${ch.id}`}>· {st.cleared}/{LEVELS_PER_CHAPTER} levels</Text>
                    </View>
                  </View>
                  <MaterialDesignIcons name={open ? "chevron-right" : "lock"} size={26} color={colors.onSurfaceTertiary} />
                </GlassPanel>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="home-header">
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker} numberOfLines={1} testID="header-chapter">Chapter {chapter.id} · {chapter.name}</Text>
            <Text style={styles.title} numberOfLines={1}>Kingdom Quest</Text>
          </View>
          <View style={styles.inline}>
            <View>
              <ChunkyButton testID="open-spin-button" icon="ferris-wheel" variant="secondary" onPress={() => setSpinOpen(true)} />
              {prog.freeSpinReady ? <View style={[styles.dotBadge, { backgroundColor: colors.error }]} testID="spin-ready-badge" /> : null}
            </View>
            <ChunkyButton testID="open-shop-button" icon="cart" variant="primary" onPress={() => router.push("/shop")} />
            <ChunkyButton testID="open-leaderboard-button" icon="trophy" variant="secondary" onPress={() => router.push("/leaderboard")} />
            <ChunkyButton testID="open-settings-button" icon="cog" variant="plain" onPress={() => setSettings(true)} />
          </View>
        </View>
        <View style={styles.hud}>
          <Pressable testID="open-lives-button" onPress={() => setLivesOpen(true)}>
            <CurrencyPill testID="hud-lives" icon="heart" iconColor={colors.heart} value={prog.lives} sub={prog.nextLifeIn ? formatMs(prog.nextLifeIn) : "Full"} />
          </Pressable>
          <Pressable testID="open-shop-coins" onPress={() => router.push("/shop")}>
            <CurrencyPill testID="hud-coins" icon="circle-multiple" iconColor={colors.gold} value={prog.coins} />
          </Pressable>
          <CurrencyPill testID="hud-stars" icon="star" iconColor={colors.gold} value={prog.stars} />
        </View>
      </GlassPanel>

      <View style={[styles.bottomBar, { bottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
        <ChunkyButton testID="play-current-level-button" label={`Play ${currentLevel}`} icon="play" onPress={() => setPicked(getLevel(currentLevel) ?? null)} size="lg" />
        <ChunkyButton testID="open-heroes-button" icon="account-group" variant="primary" onPress={() => router.push("/heroes")} size="lg" />
        <ChunkyButton testID="open-kingdom-button" icon="castle" variant="secondary" onPress={() => router.push("/kingdom")} size="lg" />
      </View>

      <LevelStartSheet level={picked} onClose={() => setPicked(null)} onPlay={play} onAdLife={adLife} />
      <SpinWheel visible={spinOpen} onClose={() => setSpinOpen(false)} />
      {/* Lives */}
      <Modal visible={livesOpen} transparent animationType="fade" onRequestClose={() => setLivesOpen(false)}>
        <View style={styles.center}>
          <View style={styles.card} testID="lives-modal">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Lives</Text>
              <ChunkyButton testID="close-lives-button" icon="close" variant="plain" onPress={() => setLivesOpen(false)} />
            </View>
            <View style={styles.inline}>
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <MaterialDesignIcons key={i} name="heart" size={36} color={i < prog.lives ? colors.heart : colors.border} />
              ))}
            </View>
            <Text style={styles.label} testID="lives-modal-status">
              {prog.lives >= MAX_LIVES ? "Your lives are full!" : `Next life in ${formatMs(prog.nextLifeIn)}`}
            </Text>
            <ChunkyButton testID="lives-ad-button" label="Watch ad · +1 life" icon="play-box" variant="secondary" disabled={prog.lives >= MAX_LIVES} onPress={adLife} />
            <ChunkyButton
              testID="lives-refill-button"
              label={`Refill all · ${LIFE_REFILL_COST} coins`}
              icon="circle-multiple"
              variant="primary"
              disabled={prog.lives >= MAX_LIVES || prog.coins < LIFE_REFILL_COST}
              onPress={refillLives}
            />
          </View>
        </View>
      </Modal>

      {/* Settings */}
      <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}>
        <View style={styles.center}>
          <View style={styles.card} testID="settings-modal">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Settings</Text>
              <ChunkyButton testID="close-settings-button" icon="close" variant="plain" onPress={() => { setSettings(false); setConfirmReset(false); }} />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.inline}>
                <MaterialDesignIcons name="vibrate" size={22} color={colors.onSurface} />
                <Text style={styles.settingText}>Haptics</Text>
              </View>
              <Switch testID="haptics-switch" value={prog.haptics} onValueChange={prog.setHapticsOn} trackColor={{ true: colors.brand, false: colors.border }} />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.inline}>
                <MaterialDesignIcons name="volume-high" size={22} color={colors.onSurface} />
                <Text style={styles.settingText}>Sound effects</Text>
              </View>
              <Switch testID="sound-switch" value={prog.sound} onValueChange={prog.setSoundOn} trackColor={{ true: colors.brand, false: colors.border }} />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.inline}>
                <MaterialDesignIcons name="music" size={22} color={colors.onSurface} />
                <Text style={styles.settingText}>Music</Text>
              </View>
              <Switch testID="music-switch" value={prog.music} onValueChange={prog.setMusicOn} trackColor={{ true: colors.brand, false: colors.border }} />
            </View>
            {confirmReset ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.label}>This erases all levels, stars and kingdom progress.</Text>
                <ChunkyButton testID="confirm-reset-button" label="Yes, reset" variant="secondary" onPress={() => { prog.reset(); setConfirmReset(false); setSettings(false); }} />
              </View>
            ) : (
              <ChunkyButton testID="reset-progress-button" label="Reset progress" icon="restore" variant="plain" onPress={() => setConfirmReset(true)} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  chCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, ...lifted(c) },
  thumbWrap: { width: 72, height: 96, borderRadius: radius.md, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  thumbLock: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  chKicker: { fontFamily: fonts.textBold, fontSize: 11, color: c.onSurfaceTertiary, textTransform: "uppercase", letterSpacing: 1 },
  chTitle: { fontFamily: fonts.display, fontSize: 21, color: c.onSurface },
  chSmall: { fontFamily: fonts.textBold, fontSize: 12, color: c.onSurfaceTertiary },
  track: { height: 8, borderRadius: 4, backgroundColor: c.glassTint, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  fill: { height: "100%", borderRadius: 4 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  kicker: { fontFamily: fonts.textBold, fontSize: 12, color: c.brand, textTransform: "uppercase", letterSpacing: 1.5 },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  hud: { flexDirection: "row", gap: spacing.sm },
  bottomBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: spacing.md },
  dotBadge: { position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.surfaceSecondary },
  scrim: { flex: 1, backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  label: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
  goals: { flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  center: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingText: { fontFamily: fonts.textBold, fontSize: 16, color: c.onSurface },
}));
