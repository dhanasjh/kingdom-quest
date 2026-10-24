import React, { memo, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { useRewardedAd } from "@/src/ads/RewardedAd";
import { ChapterBackground } from "@/src/components/ChapterBackground";
import { ChunkyButton } from "@/src/components/ChunkyButton";
import { CurrencyPill } from "@/src/components/CurrencyPill";
import { GlassPanel } from "@/src/components/GlassPanel";
import { LevelStartSheet } from "@/src/components/LevelStartSheet";
import { StarRow } from "@/src/components/StarRow";
import { CHAPTERS, LEVELS_PER_CHAPTER, LevelDef, chapterFirstLevel, getLevel, levelInChapter } from "@/src/game/levels";
import { formatMs, useProgress } from "@/src/game/progress";
import { fonts, lifted, makeStyles, spacing, useTheme } from "@/src/theme";

const ROW = 112;
const NODE = 74;
const OFFSETS = [0.5, 0.78, 0.62, 0.3, 0.18, 0.4];

const LevelNode = memo(function LevelNode({ id, unlocked, current, best, hard, onPress }: { id: number; unlocked: boolean; current: boolean; best: number; hard: boolean; onPress: (id: number) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (current) bob.value = withRepeat(withSequence(withTiming(-8, { duration: 520 }), withTiming(0, { duration: 520 })), -1, false);
  }, [current, bob]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const grad: [string, string] = !unlocked
    ? [colors.glassTintStrong, colors.glassTint]
    : current
      ? [colors.brandSecondary, colors.brand]
      : hard
        ? [colors.brandTertiary, colors.error]
        : [colors.brandPrimary, colors.success];
  return (
    <Animated.View style={[styles.nodeWrap, anim]}>
      <Pressable testID={`level-node-${id}`} disabled={!unlocked} onPress={() => onPress(id)}>
        <View style={[styles.nodeBase, { backgroundColor: colors.extrude }]}>
          <LinearGradient colors={grad} style={[styles.node, { borderColor: current ? colors.surfaceSecondary : colors.glassBorder }]}>
            <View style={[styles.nodeHi, { backgroundColor: colors.highlight }]} />
            {unlocked ? <Text style={styles.nodeText}>{levelInChapter(id)}</Text> : <MaterialDesignIcons name="lock" size={24} color={colors.muted} />}
          </LinearGradient>
        </View>
      </Pressable>
      {hard && unlocked ? (
        <View style={[styles.hardBadge, { backgroundColor: colors.error }]}>
          <MaterialDesignIcons name="fire" size={14} color={colors.onError} />
        </View>
      ) : null}
      {unlocked ? <StarRow stars={best} size={18} testID={`level-stars-${id}`} /> : null}
    </Animated.View>
  );
});

export default function ChapterMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chId = Math.max(1, Math.min(CHAPTERS.length, Number(id) || 1));
  const ch = CHAPTERS[chId - 1];
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const prog = useProgress();
  const showAd = useRewardedAd();
  const [picked, setPicked] = useState<LevelDef | null>(null);

  const first = chapterFirstLevel(chId);
  const ids = useMemo(() => Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => first + i), [first]);
  const currentIdx = Math.max(0, Math.min(LEVELS_PER_CHAPTER - 1, prog.unlocked - first));
  const w = Math.min(width, 520);
  const headerH = insets.top + 118;
  const stars = ids.reduce((s, x) => s + (prog.best[x] ?? 0), 0);
  const cleared = ids.filter((x) => prog.best[x]).length;

  const open = (lid: number) => {
    prog.haptic("light");
    setPicked(getLevel(lid) ?? null);
  };

  const renderItem = ({ item, index }: { item: number; index: number }) => {
    const x = OFFSETS[index % OFFSETS.length] * (w - NODE);
    const nx = OFFSETS[(index + 1) % OFFSETS.length] * (w - NODE);
    const last = index === LEVELS_PER_CHAPTER - 1;
    const unlocked = prog.isLevelUnlocked(item);
    return (
      <View style={{ height: ROW, width: w, alignSelf: "center" }}>
        {!last
          ? [0.3, 0.5, 0.7].map((t) => (
              <View
                key={t}
                style={[
                  styles.dot,
                  {
                    left: x + NODE / 2 + (nx - x) * t - 5,
                    top: NODE / 2 + ROW * t - 5,
                    backgroundColor: item + 1 <= prog.unlocked ? colors.brandSecondary : colors.glassTintStrong,
                  },
                ]}
              />
            ))
          : null}
        <View style={{ position: "absolute", left: x }}>
          <LevelNode id={item} unlocked={unlocked} current={item === prog.unlocked} best={prog.best[item] ?? 0} hard={!!getLevel(item)?.hard} onPress={open} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={chId} />
      <FlatList
        testID="chapter-level-list"
        data={ids}
        keyExtractor={(x) => String(x)}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
        initialScrollIndex={Math.max(0, currentIdx - 2)}
        contentContainerStyle={{ paddingTop: headerH + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        initialNumToRender={10}
      />

      <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="chapter-header">
        <View style={styles.headRow}>
          <ChunkyButton testID="chapter-back-button" icon="chevron-left" variant="plain" onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Chapter {chId}</Text>
            <Text style={styles.title} numberOfLines={1} testID="chapter-title">{ch.name}</Text>
          </View>
          <CurrencyPill testID="chapter-lives" icon="heart" iconColor={colors.heart} value={prog.lives} sub={prog.nextLifeIn ? formatMs(prog.nextLifeIn) : undefined} />
        </View>
        <View style={styles.headRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(cleared / LEVELS_PER_CHAPTER) * 100}%` }]} />
          </View>
          <Text style={styles.small} testID="chapter-progress">{cleared}/{LEVELS_PER_CHAPTER}</Text>
          <MaterialDesignIcons name="star" size={16} color={colors.gold} />
          <Text style={styles.small} testID="chapter-stars">{stars}</Text>
        </View>
      </GlassPanel>

      <LevelStartSheet
        level={picked}
        onClose={() => setPicked(null)}
        onPlay={(lid) => {
          setPicked(null);
          router.push(`/level/${lid}`);
        }}
        onAdLife={async () => {
          setPicked(null);
          if (await showAd("free-life")) prog.grant({ lives: 1 });
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  kicker: { fontFamily: fonts.textBold, fontSize: 12, color: c.onSurfaceTertiary, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.glassTint, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: c.brandSecondary, borderRadius: 5 },
  small: { fontFamily: fonts.textBold, fontSize: 13, color: c.onSurface },
  dot: { position: "absolute", width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.glassBorder },
  nodeWrap: { width: NODE, alignItems: "center", gap: 2 },
  nodeBase: { width: NODE, height: NODE + 6, borderRadius: NODE / 2 },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: "center", justifyContent: "center", borderWidth: 3, overflow: "hidden", ...lifted(c) },
  nodeHi: { position: "absolute", top: 4, left: 12, right: 12, height: NODE * 0.32, borderRadius: NODE },
  nodeText: { fontFamily: fonts.display, fontSize: 26, color: c.onSurfaceInverse, textShadowColor: c.textShadow, textShadowRadius: 3, textShadowOffset: { width: 0, height: 2 } },
  hardBadge: { position: "absolute", top: -4, right: -4, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.surfaceSecondary },
}));
