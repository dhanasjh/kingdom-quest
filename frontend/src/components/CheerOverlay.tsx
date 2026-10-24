import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { artFor } from "@/src/game/art";
import { PIECES } from "@/src/game/pieces";
import { fonts, lifted, radius, spacing, useTheme } from "@/src/theme";

export type Cheer = { color: number; tick: number; text: string };
export const CHEERS = ["Yay!", "Woohoo!", "Super!", "Awesome!", "Let's go!", "So cool!"];

// Big character pops in, wiggles and cheers on big combos.
export function CheerOverlay({ cheer, roster }: { cheer: Cheer | null; roster?: number[] }) {
  const { colors } = useTheme();
  const wiggle = useSharedValue(0);
  useEffect(() => {
    if (!cheer) return;
    wiggle.value = withRepeat(withSequence(withTiming(-10, { duration: 110 }), withTiming(10, { duration: 110 })), 5, true);
  }, [cheer, wiggle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  if (!cheer) return null;
  return (
    <Animated.View key={cheer.tick} entering={ZoomIn.springify().damping(7)} exiting={FadeOut} pointerEvents="none" style={styles.wrap} testID="cheer-overlay">
      <View style={[styles.bubble, { backgroundColor: colors.surfaceSecondary }, lifted(colors)]}>
        <Text style={[styles.text, { color: colors.brand }]} testID="cheer-text">{cheer.text}</Text>
      </View>
      <Animated.View style={[styles.avatar, { backgroundColor: PIECES[cheer.color]?.from ?? colors.brand, borderColor: colors.surfaceSecondary }, style]}>
        <Image source={artFor(cheer.color, roster)} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: spacing.sm, right: spacing.lg, alignItems: "center" },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, marginBottom: -6 },
  text: { fontFamily: fonts.display, fontSize: 18 },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 4, overflow: "hidden" },
});
