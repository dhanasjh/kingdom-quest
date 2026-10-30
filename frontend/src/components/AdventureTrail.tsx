import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { GlassPanel } from "@/src/components/GlassPanel";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

type Props = { currentLevel: number; unlockedLevel: number; onSelect: (level: number) => void };

const POINTS = [
  { x: "8%", y: 92 },
  { x: "29%", y: 58 },
  { x: "50%", y: 75 },
  { x: "72%", y: 35 },
  { x: "93%", y: 15 },
] as const;

export function AdventureTrail({ currentLevel, unlockedLevel, onSelect }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const levels = POINTS.map((_, index) => currentLevel + index - 2);
  return (
    <GlassPanel blur={false} strong style={styles.card} testID="adventure-trail">
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <MaterialDesignIcons name="map-marker-path" size={22} color={colors.brand} />
          <Text style={styles.title}>Kingdom Trail</Text>
        </View>
        <Text style={styles.subtitle}>Your next steps</Text>
      </View>
      <View style={styles.pathArea}>
        <Svg width="100%" height="100%" viewBox="0 0 360 120" preserveAspectRatio="none" style={styles.svg}>
          <Path d="M 28 92 C 70 95, 66 56, 106 58 S 145 72, 180 75 S 226 71, 259 35 S 314 10, 335 15" stroke="rgba(255,122,89,0.26)" strokeWidth="17" fill="none" strokeLinecap="round" />
          <Path d="M 28 92 C 70 95, 66 56, 106 58 S 145 72, 180 75 S 226 71, 259 35 S 314 10, 335 15" stroke={colors.brand} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="2 5" />
        </Svg>
        {levels.map((level, index) => {
          if (level < 1) return null;
          const open = level <= unlockedLevel;
          const completed = level < unlockedLevel;
          const current = level === currentLevel;
          return (
            <Pressable
              key={`${level}-${index}`}
              testID={`trail-level-${level}`}
              accessibilityRole="button"
              accessibilityLabel={`Level ${level}${current ? ", current level" : completed ? ", completed" : open ? ", unlocked" : ", locked"}`}
              disabled={!open}
              onPress={() => onSelect(level)}
              style={[styles.node, { left: POINTS[index].x, top: POINTS[index].y }, current && styles.currentNode, !open && styles.lockedNode]}
            >
              <MaterialDesignIcons name={!open ? "lock" : completed ? "check" : current ? "star" : "circle-outline"} size={current ? 18 : 15} color={open ? (current ? colors.onBrandSecondary : colors.brand) : colors.muted} />
              <Text style={[styles.nodeText, current && styles.currentText]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.footer}>Chapter {Math.ceil(currentLevel / 125)} · Level {currentLevel}</Text>
    </GlassPanel>
  );
}

const useStyles = makeStyles((c) => ({
  card: { padding: spacing.md, gap: spacing.xs, borderRadius: 24 },
  heading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  subtitle: { fontFamily: fonts.textBold, fontSize: 12, color: c.onSurfaceTertiary },
  pathArea: { height: 126, position: "relative", marginHorizontal: spacing.xs },
  svg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  node: { position: "absolute", width: 42, height: 42, marginLeft: -21, marginTop: -21, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.98)", backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 1, elevation: 3 },
  currentNode: { width: 50, height: 50, marginLeft: -25, marginTop: -25, borderWidth: 3, borderColor: c.brandSecondary, backgroundColor: c.brandSecondary },
  lockedNode: { backgroundColor: "rgba(245,242,236,0.88)", borderColor: "rgba(255,255,255,0.72)" },
  nodeText: { fontFamily: fonts.textBold, fontSize: 10, color: c.onSurface },
  currentText: { fontFamily: fonts.display, fontSize: 12, color: c.onBrandSecondary },
  footer: { alignSelf: "flex-end", marginRight: spacing.xs, fontFamily: fonts.textBold, fontSize: 11, color: c.onSurfaceTertiary },
}));
