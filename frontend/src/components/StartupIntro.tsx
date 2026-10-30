import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { beginStartupIntro, finishStartupIntro } from "@/src/game/sound";
import { useProgress } from "@/src/game/progress";
import { fonts } from "@/src/theme";

const SPARKLES = [
  { left: "16%", top: "28%", size: 8, delay: 0 },
  { left: "80%", top: "25%", size: 6, delay: 180 },
  { left: "12%", top: "65%", size: 5, delay: 360 },
  { left: "86%", top: "67%", size: 9, delay: 120 },
  { left: "28%", top: "78%", size: 5, delay: 300 },
  { left: "74%", top: "81%", size: 6, delay: 240 },
] as const;

export function StartupIntro() {
  const { ready, music } = useProgress();
  const [visible, setVisible] = useState(true);
  const scale = useSharedValue(0.72);
  const glow = useSharedValue(0.78);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (!ready) return;
    beginStartupIntro(music);
    scale.value = withSpring(1, { damping: 10, stiffness: 100, mass: 0.9 });
    glow.value = withRepeat(withSequence(withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.quad) }), withTiming(0.92, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1, true);
    tilt.value = withSequence(withTiming(-2, { duration: 520 }), withRepeat(withSequence(withTiming(2, { duration: 700 }), withTiming(-2, { duration: 700 })), 1, true), withTiming(0, { duration: 400 }));
    const timer = setTimeout(() => {
      setVisible(false);
      finishStartupIntro();
    }, 3000);
    return () => {
      clearTimeout(timer);
      finishStartupIntro();
    };
  }, [ready, music, scale, glow, tilt]);

  const iconMotion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }] }));
  const haloMotion = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }], opacity: 0.45 + (glow.value - 0.78) * 1.15 }));

  if (!ready || !visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(350)} style={styles.overlay} testID="startup-intro">
      <StatusBar hidden />
      <LinearGradient colors={["#071B4A", "#075A91", "#18A4B2", "#0B315E"]} locations={[0, 0.38, 0.72, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.rays, { pointerEvents: "none" }]} />
      {SPARKLES.map((sparkle, index) => (
        <Animated.View
          key={index}
          entering={FadeIn.delay(sparkle.delay).duration(500)}
          style={[styles.sparkle, { left: sparkle.left, top: sparkle.top, width: sparkle.size, height: sparkle.size }]}
        />
      ))}
      <View style={styles.content}>
        <Animated.View style={[styles.halo, haloMotion]} />
        <Animated.View entering={FadeIn.delay(150).duration(500)} style={[styles.iconFrame, iconMotion]}>
          <Image source={require("../../assets/images/icon.png")} style={styles.icon} contentFit="cover" cachePolicy="memory" />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(420).duration(700)} style={styles.titleGroup}>
          <Text style={styles.title}>KINGDOM QUEST</Text>
          <Text style={styles.tagline}>A little magic. A mighty adventure.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#071B4A" },
  rays: { ...StyleSheet.absoluteFill, opacity: 0.22, backgroundColor: "rgba(92,220,255,0.18)" },
  content: { alignItems: "center", justifyContent: "center", width: "100%", paddingHorizontal: 28 },
  halo: { position: "absolute", top: -16, width: 238, height: 238, borderRadius: 120, backgroundColor: "#43E5F2", shadowColor: "#91F5FF", shadowOpacity: 0.9, shadowRadius: 45, elevation: 24 },
  iconFrame: { width: 190, height: 190, borderRadius: 44, padding: 5, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 2, borderColor: "#FFE49A", shadowColor: "#FFD166", shadowOpacity: 0.8, shadowRadius: 28, elevation: 18 },
  icon: { width: "100%", height: "100%", borderRadius: 38 },
  titleGroup: { alignItems: "center", marginTop: 28 },
  title: { fontFamily: fonts.display, color: "#FFF9E8", fontSize: 34, letterSpacing: 1.5, textAlign: "center", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 3 } },
  tagline: { fontFamily: fonts.textBold, color: "#D5F6FF", fontSize: 15, marginTop: 8, textAlign: "center", letterSpacing: 0.4 },
  sparkle: { position: "absolute", borderRadius: 8, backgroundColor: "#FFF4B4", shadowColor: "#FFE67B", shadowOpacity: 0.95, shadowRadius: 12, elevation: 5 },
});
