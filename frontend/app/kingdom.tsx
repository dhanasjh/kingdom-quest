import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp, FadeOut } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { CurrencyPill } from "@/src/components/CurrencyPill";
import { AREAS, AREA_REWARD, areaUnlocked } from "@/src/game/kingdom";
import { playSfx } from "@/src/game/sound";
import { useProgress } from "@/src/game/progress";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function KingdomScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prog = useProgress();
  const firstOpen = Math.max(0, AREAS.findIndex((a) => a.tasks.some((t) => !prog.restored.includes(t.id))));
  const [areaIdx, setAreaIdx] = useState(firstOpen);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const area = AREAS[areaIdx];
  const unlocked = areaUnlocked(areaIdx, prog.restored);
  const done = area.tasks.filter((t) => prog.restored.includes(t.id)).length;
  const pct = done / area.tasks.length;

  const onRestore = (id: string, cost: number, title: string) => {
    if (prog.restore(id, cost)) {
      prog.haptic("success");
      playSfx("restore");
      const areaDone = area.tasks.every((t) => t.id === id || prog.restored.includes(t.id));
      if (areaDone) {
        prog.grant(AREA_REWARD);
        setToast(`${area.name} restored! +${AREA_REWARD.coins} coins, +1 Hammer, +1 Shuffle`);
        return;
      }
      setToast(`${title} — restored!`);
    } else {
      prog.haptic("error");
      setToast("Not enough stars. Play levels to earn more!");
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={{ uri: area.image }} style={styles.heroImg} contentFit="cover" transition={300} testID="kingdom-area-image" />
        {/* Ruin dimming fades away as the area is restored */}
        <View style={[styles.dim, { opacity: 0.55 * (1 - pct) }]} />
        <LinearGradient colors={["rgba(45,42,38,0.55)", "transparent", "rgba(45,42,38,0.85)"]} style={styles.heroImgAbs} />
        <View style={[styles.heroTop, { paddingTop: insets.top + spacing.sm }]}>
          <ChunkyButton testID="kingdom-back-button" icon="chevron-left" variant="plain" onPress={() => router.replace("/")} />
          <CurrencyPill testID="kingdom-stars" icon="star" iconColor={colors.gold} value={prog.stars} dark />
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.areaName} testID="kingdom-area-name">{area.name}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressText} testID="kingdom-area-progress">{done}/{area.tasks.length} restored</Text>
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
          {AREAS.map((a, i) => {
            const open = areaUnlocked(i, prog.restored);
            const active = i === areaIdx;
            return (
              <Pressable
                key={a.id}
                testID={`kingdom-area-chip-${a.id}`}
                onPress={() => setAreaIdx(i)}
                style={[styles.chip, active && { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse }]}
              >
                {!open ? <MaterialDesignIcons name="lock" size={14} color={active ? colors.onSurfaceInverse : colors.muted} /> : null}
                <Text style={[styles.chipText, active && { color: colors.onSurfaceInverse }]}>{a.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
          {!unlocked ? (
            <View style={styles.empty} testID="kingdom-area-locked">
              <MaterialDesignIcons name="lock" size={40} color={colors.muted} />
              <Text style={styles.emptyText}>Restore {AREAS[areaIdx - 1].name} to unlock this area.</Text>
            </View>
          ) : (
            area.tasks.map((t, i) => {
              const isDone = prog.restored.includes(t.id);
              const affordable = prog.stars >= t.cost;
              return (
                <Animated.View key={t.id} entering={FadeInUp.delay(i * 60)} style={[styles.task, isDone && { opacity: 0.7 }]}>
                  <View style={[styles.taskIcon, { backgroundColor: isDone ? colors.success : colors.brandSecondary }]}>
                    <MaterialDesignIcons name={(isDone ? "check-bold" : t.icon) as any} size={24} color={colors.onSurfaceInverse} />
                  </View>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  {isDone ? (
                    <Text style={[styles.doneText, { color: colors.success }]} testID={`task-done-${t.id}`}>Done</Text>
                  ) : (
                    <Pressable
                      testID={`restore-task-${t.id}`}
                      onPress={() => onRestore(t.id, t.cost, t.title)}
                      style={[styles.costBtn, { backgroundColor: affordable ? colors.brand : colors.surfaceTertiary }]}
                    >
                      <MaterialDesignIcons name="star" size={18} color={colors.gold} />
                      <Text style={[styles.costText, { color: affordable ? colors.onBrand : colors.muted }]}>{t.cost}</Text>
                    </Pressable>
                  )}
                </Animated.View>
              );
            })
          )}
          {unlocked && done === area.tasks.length ? (
            <Text style={styles.emptyText} testID="kingdom-area-complete">{area.name} is fully restored!</Text>
          ) : null}
        </ScrollView>
      </View>

      {toast ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.toast, { bottom: insets.bottom + spacing.lg }]} testID="kingdom-toast">
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  hero: { height: "46%" },
  heroImg: { width: "100%", height: "100%" },
  heroImgAbs: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.surfaceInverse },
  heroTop: { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroBottom: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.xxl, gap: spacing.sm },
  areaName: { fontFamily: fonts.display, fontSize: 32, color: c.onSurfaceInverse },
  progressTrack: { height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: c.gold, borderRadius: 6 },
  progressText: { fontFamily: fonts.textBold, fontSize: 13, color: c.onSurfaceInverse },
  sheet: { flex: 1, marginTop: -spacing.lg, backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: "hidden" },
  chipRow: { height: 56, flexGrow: 0 },
  chipContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: { height: 36, flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  chipText: { fontFamily: fonts.textBold, fontSize: 14, color: c.onSurface },
  task: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, borderBottomWidth: 4, borderColor: c.border, ...lifted(c) },
  taskIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  taskTitle: { flex: 1, fontFamily: fonts.textBold, fontSize: 16, color: c.onSurface },
  costBtn: { flexDirection: "row", alignItems: "center", gap: 4, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  costText: { fontFamily: fonts.display, fontSize: 18 },
  doneText: { fontFamily: fonts.display, fontSize: 16, paddingHorizontal: spacing.sm },
  empty: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl },
  emptyText: { fontFamily: fonts.text, fontSize: 15, color: c.muted, textAlign: "center" },
  toast: { position: "absolute", left: spacing.lg, right: spacing.lg, backgroundColor: c.surfaceInverse, borderRadius: radius.md, padding: spacing.lg },
  toastText: { fontFamily: fonts.textBold, fontSize: 15, color: c.onSurfaceInverse, textAlign: "center" },
}));
