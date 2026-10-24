import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";

import { CHAPTER_BG } from "@/src/game/art";
import { useTheme } from "@/src/theme";

function Sparkle({ x, size, duration, delay, height }: { x: number; size: number; duration: number; delay: number; height: number }) {
  const { colors } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: height - t.value * (height + 60) }, { translateX: Math.sin(t.value * 6.28) * 14 }],
    opacity: t.value < 0.1 ? t.value * 10 : t.value > 0.85 ? (1 - t.value) * 6.6 : 1,
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, top: 0, width: size, height: size, borderRadius: size, backgroundColor: colors.sparkle, shadowColor: colors.sparkle, shadowOpacity: 1, shadowRadius: size },
        style,
      ]}
    />
  );
}

// Slow-panning chapter art with floating sparkles.
export function ChapterBackground({ chapter, dim = true }: { chapter: number; dim?: boolean }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const pan = useSharedValue(0);
  useEffect(() => {
    pan.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pan]);
  const panStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.12 }, { translateX: (pan.value - 0.5) * 22 }, { translateY: (pan.value - 0.5) * -28 }],
  }));
  const sparks = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        x: ((i * 37) % 100) / 100 * width,
        size: 3 + (i % 4) * 1.5,
        duration: 7000 + (i % 5) * 1300,
        delay: i * 650,
      })),
    [width],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="chapter-background">
      <Animated.View style={[StyleSheet.absoluteFill, panStyle]}>
        <Image source={CHAPTER_BG[(chapter - 1) % CHAPTER_BG.length]} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      </Animated.View>
      {dim ? <LinearGradient colors={[colors.bgScrimTop, "transparent", colors.bgScrimBottom]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} /> : null}
      {sparks.map((s, i) => (
        <Sparkle key={i} {...s} height={height} />
      ))}
    </View>
  );
}
