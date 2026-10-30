import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, LayoutChangeEvent, Modal, Pressable, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { useRewardedAd } from "@/src/ads/RewardedAd";
import { MUSIC_TRACKS, playSfx } from "@/src/game/sound";
import { MUSIC_PACKS } from "@/src/game/musicPacks";
import { MAX_LIVES, formatMs, useProgress } from "@/src/game/progress";
import { ChapterBackground } from "@/src/components/ChapterBackground";
import { GlassPanel } from "@/src/components/GlassPanel";
import { LevelStartSheet } from "@/src/components/LevelStartSheet";
import { CHAPTER_BG } from "@/src/game/art";
import { SpinWheel } from "@/src/components/SpinWheel";
import { DailyQuest } from "@/src/components/DailyQuest";
import { CurrencyPill } from "@/src/components/CurrencyPill";
import { FestivalBanner, MakeItYoursBanner } from "@/src/components/HomeBanners";
import { AdventureTrail } from "@/src/components/AdventureTrail";

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
  const [lifeAdBusy, setLifeAdBusy] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(insets.top + 100);
  const [spinOpen, setSpinOpen] = useState(false);
  const autoSpin = useRef(false);
  const lifeAdLock = useRef(false);
  useEffect(() => {
    // Offer the daily spin once per app session when it's ready.
    if (!prog.ready || autoSpin.current || !prog.freeSpinReady) return;
    autoSpin.current = true;
    const t = setTimeout(() => setSpinOpen(true), 900);
    return () => clearTimeout(t);
  }, [prog.ready, prog.freeSpinReady]);
  const showAd = useRewardedAd();

  const adLife = async () => {
    if (lifeAdLock.current || !prog.adLifeReady || prog.lives >= MAX_LIVES) return;
    lifeAdLock.current = true;
    setLifeAdBusy(true);
    setPicked(null);
    setLivesOpen(false);
    try {
      if (await showAd("free-life")) {
        prog.markAdReward("life");
        prog.grant({ lives: 1 });
      }
    } finally {
      lifeAdLock.current = false;
      setLifeAdBusy(false);
    }
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
  const onHeaderLayout = (event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height);
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
  const cycleMusic = () => {
    const available = MUSIC_PACKS.filter((pack) => prog.unlockedMusicPacks.includes(pack.id));
    if (!available.length) return;
    const currentIndex = available.findIndex((pack) => pack.track === prog.musicTrack);
    const next = available[(currentIndex + 1) % available.length];
    prog.update({ musicTrack: next.track, customMusicUri: null, customMusicName: "" });
  };
  const currentMusicName = prog.customMusicUri
    ? (prog.customMusicName || "Your music")
    : (MUSIC_TRACKS[prog.musicTrack] ?? MUSIC_TRACKS[0]);

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={curCh} />
      <FlatList
        testID="chapter-list"
        ListHeaderComponent={(
          <View style={{ gap: spacing.md }}>
            <AdventureTrail currentLevel={currentLevel} unlockedLevel={prog.unlocked} onSelect={(id) => setPicked(getLevel(id) ?? null)} />
            <DailyQuest />
            <FestivalBanner onPress={() => router.push("/shop")} />
            <MakeItYoursBanner onPress={() => router.push("/heroes")} />
          </View>
        )}
        data={CHAPTERS}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingTop: headerHeight + spacing.md, paddingBottom: insets.bottom + 120, paddingHorizontal: spacing.lg, gap: spacing.md }}
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

      <GlassPanel onLayout={onHeaderLayout} style={[styles.header, { paddingTop: insets.top + spacing.xs }]} testID="home-header">
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker} numberOfLines={1} testID="header-chapter">Chapter {chapter.id} · {chapter.name}</Text>
            <Text style={styles.title} numberOfLines={1}>Kingdom Quest</Text>
          </View>
          <View style={styles.inline}>
            <View>
              <ChunkyButton testID="open-spin-button" icon="ferris-wheel" variant="secondary" onPress={() => setSpinOpen(true)} size="sm" />
              {prog.freeSpinReady ? <View style={[styles.dotBadge, { backgroundColor: colors.error }]} testID="spin-ready-badge" /> : null}
            </View>
            <ChunkyButton testID="open-shop-button" icon="cart" variant="primary" onPress={() => router.push("/shop")} size="sm" />
            <ChunkyButton testID="open-leaderboard-button" icon="trophy" variant="secondary" onPress={() => router.push("/leaderboard")} size="sm" />
            <ChunkyButton testID="open-settings-button" icon="cog" variant="plain" onPress={() => setSettings(true)} size="sm" />
          </View>
        </View>
        <View style={styles.hud}>
          <Pressable testID="open-lives-button" onPress={() => setLivesOpen(true)}>
          <CurrencyPill testID="hud-lives" icon="heart" iconColor={colors.heart} value={prog.lives} sub={prog.nextLifeIn ? formatMs(prog.nextLifeIn) : "Full"} compact />
          </Pressable>
          <Pressable testID="open-shop-coins" onPress={() => router.push("/shop")}>
          <CurrencyPill testID="hud-coins" icon="circle-multiple" iconColor={colors.gold} value={prog.coins} compact />
          </Pressable>
          <CurrencyPill testID="hud-stars" icon="star" iconColor={colors.gold} value={prog.stars} compact />
        </View>
      </GlassPanel>

      <View style={[styles.bottomBar, { bottom: insets.bottom + spacing.lg, pointerEvents: "box-none" }]}>
        <ChunkyButton testID="play-current-level-button" label={`Play ${currentLevel}`} icon="play" onPress={() => setPicked(getLevel(currentLevel) ?? null)} size="lg" />
        <ChunkyButton testID="open-heroes-button" icon="account-group" variant="primary" onPress={() => router.push("/heroes")} size="lg" />
        <View style={styles.kingdomAction}>
          <ChunkyButton testID="open-kingdom-button" icon="castle" variant="secondary" onPress={() => router.push("/kingdom")} size="lg" />
          <Text style={styles.kingdomActionLabel}>Restore</Text>
        </View>
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
            <ChunkyButton testID="lives-ad-button" label={lifeAdBusy ? "Loading ad…" : prog.adLifeReady ? "Watch ad · +1 life" : "Life ad used today"} icon="play-box" variant="secondary" disabled={lifeAdBusy || prog.lives >= MAX_LIVES || !prog.adLifeReady} onPress={adLife} />
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
                <Pressable onPress={cycleMusic} accessibilityRole="button" accessibilityLabel={`Change music. Current track: ${currentMusicName}`}>
                  <Text style={styles.settingText}>Music · {currentMusicName}</Text>
                  <Text style={styles.musicHint}>Tap track name to change</Text>
                </Pressable>
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
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
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
  kingdomAction: { alignItems: "center", gap: 2 },
  kingdomActionLabel: { fontFamily: fonts.textBold, fontSize: 10, color: c.onSurface, textShadowColor: "rgba(255,255,255,0.85)", textShadowRadius: 4 },
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
  musicHint: { fontFamily: fonts.text, fontSize: 11, color: c.onSurfaceTertiary },
}));
