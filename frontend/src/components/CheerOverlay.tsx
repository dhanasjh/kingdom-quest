import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { artFor } from "@/src/game/art";
import { PIECES } from "@/src/game/pieces";
import { fonts, lifted, radius, spacing, useTheme } from "@/src/theme";
import type { FestivalEffectType } from "@/src/game/festivals";

export type Cheer = { color: number; tick: number; text: string; event?: FestivalEffectType; emoji?: string };
export const CHEERS = ["Yay!", "Woohoo!", "Super!", "Awesome!", "Let's go!", "So cool!"];

// Big character pops in, wiggles and cheers on big combos.
export function CheerOverlay({ cheer, roster, customPhotos, compact = false }: { cheer: Cheer | null; roster?: number[]; customPhotos?: (string | null)[]; compact?: boolean }) {
  const { colors } = useTheme();
  const wiggle = useSharedValue(0);
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!cheer) return;
    if (cheer.event === "spin") spin.value = withRepeat(withTiming(360, { duration: 700 }), 2, false);
    else spin.value = withSpring(0);
    if (cheer.event === "glow") pulse.value = withRepeat(withSequence(withTiming(1.18, { duration: 260 }), withTiming(0.92, { duration: 260 })), 3, true);
    else pulse.value = withSpring(1.12);
    wiggle.value = withRepeat(withSequence(withTiming(-8, { duration: 110 }), withTiming(8, { duration: 110 })), 4, true);
  }, [cheer, wiggle, spin, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${cheer?.event === "spin" ? spin.value : wiggle.value}deg` }, { scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: Math.min(0.85, Math.max(0.2, pulse.value - 0.15)), transform: [{ scale: pulse.value }] }));
  if (!cheer) return null;
  if (compact) {
    return (
      <Animated.View key={cheer.tick} entering={ZoomIn.springify().damping(12)} exiting={FadeOut} style={[styles.compactWrap, { backgroundColor: colors.surfaceSecondary, borderColor: colors.glassBorder, pointerEvents: "none" }]} testID="cheer-overlay">
        <Animated.View style={[styles.compactAvatar, { backgroundColor: PIECES[cheer.color]?.from ?? colors.brand }, style]}>
          {cheer.emoji ? <Text style={styles.compactEmoji}>{cheer.emoji}</Text> : <Image source={artFor(cheer.color, roster, customPhotos)} style={StyleSheet.absoluteFill} contentFit="cover" />}
        </Animated.View>
        <Text style={[styles.compactText, { color: colors.brand }]} testID="cheer-text">{cheer.text}</Text>
      </Animated.View>
    );
  }
  const particles = cheer.event === "burst" ? ["✨", "🎇", "✦", "✨", "🎆"]
    : cheer.event === "spin" ? ["✦", "✨", "✦", "✨"]
      : cheer.event === "glow" ? ["✨", "✦", "✨", "✦"]
        : cheer.event === "confetti" ? ["🎉", "✨", "🎊", "✦"]
          : cheer.event === "rhythm" ? ["🎵", "✨", "🎶", "✦"]
            : cheer.event === "wave" ? ["🌟", "✨", "🌟", "✦"] : [];
  return (
    <Animated.View key={cheer.tick} entering={ZoomIn.springify().damping(7)} exiting={FadeOut} style={[styles.wrap, { pointerEvents: "none" }]} testID="cheer-overlay">
      <View style={[styles.bubble, { backgroundColor: colors.surfaceSecondary }, lifted(colors)]}>
        <Text style={[styles.text, { color: colors.brand }]} testID="cheer-text">{cheer.text}</Text>
      </View>
      <View style={styles.effectStage}>
        <Animated.View style={[styles.halo, { backgroundColor: cheer.event === "glow" ? "rgba(255,211,79,0.55)" : "rgba(255,255,255,0.62)" }, glowStyle]} />
        {particles.map((particle, i) => <FestivalParticle key={`${cheer.tick}-${i}`} emoji={particle} index={i} tick={cheer.tick} effect={cheer.event} />)}
        <Animated.View style={[styles.avatar, { backgroundColor: PIECES[cheer.color]?.from ?? colors.brand, borderColor: colors.surfaceSecondary }, style]}>
          {cheer.emoji ? <Text style={styles.eventEmoji}>{cheer.emoji}</Text> : <Image source={artFor(cheer.color, roster, customPhotos)} style={StyleSheet.absoluteFill} contentFit="cover" />}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function FestivalParticle({ emoji, index, tick, effect }: { emoji: string; index: number; tick: number; effect?: FestivalEffectType }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(index * 55, withTiming(1, { duration: effect === "confetti" ? 800 : 620 }));
  }, [effect, index, progress, tick]);
  const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
  const style = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - progress.value * 0.8),
    transform: [
      { translateX: Math.cos(angle) * 62 * progress.value },
      { translateY: Math.sin(angle) * 52 * progress.value + (effect === "confetti" ? 22 * progress.value : 0) },
      { scale: 0.65 + progress.value * 0.55 },
      { rotate: `${progress.value * (effect === "spin" ? 280 : 140)}deg` },
    ],
  }));
  return <Animated.Text style={[styles.particle, style]}>{emoji}</Animated.Text>;
}

const styles = StyleSheet.create({
  // Keep celebrations compact so the character pop does not hide several puzzle pieces.
  wrap: { position: "absolute", top: spacing.xs, right: spacing.sm, alignItems: "center" },
  compactWrap: { minHeight: 30, flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1.5 },
  compactAvatar: { width: 22, height: 22, borderRadius: 11, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  compactEmoji: { fontSize: 16, textAlign: "center", textAlignVertical: "center", includeFontPadding: false },
  compactText: { fontFamily: fonts.display, fontSize: 13 },
  bubble: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, marginBottom: -4 },
  text: { fontFamily: fonts.display, fontSize: 13 },
  effectStage: { width: 76, height: 76, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 66, height: 66, borderRadius: 36 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  eventEmoji: { fontSize: 42, textAlign: "center", textAlignVertical: "center", includeFontPadding: false },
  particle: { position: "absolute", left: 28, top: 28, fontSize: 18, textShadowColor: "rgba(255,255,255,0.95)", textShadowRadius: 5 },
});
