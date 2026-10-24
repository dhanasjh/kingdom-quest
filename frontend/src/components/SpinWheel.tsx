import React, { useState } from "react";
import { Modal, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { useRewardedAd } from "@/src/ads/RewardedAd";
import { useProgress } from "@/src/game/progress";
import { playSfx } from "@/src/game/sound";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Prize = { label: string; icon: string; w: number; grant: { coins?: number; hammers?: number; shuffles?: number; lives?: number }; text: string };
const PRIZES: Prize[] = [
  { label: "50", icon: "circle-multiple", w: 22, grant: { coins: 50 }, text: "50 coins" },
  { label: "Hammer", icon: "hammer", w: 12, grant: { hammers: 1 }, text: "a Hammer" },
  { label: "100", icon: "circle-multiple", w: 18, grant: { coins: 100 }, text: "100 coins" },
  { label: "Life", icon: "heart", w: 14, grant: { lives: 1 }, text: "an extra life" },
  { label: "Shuffle", icon: "shuffle-variant", w: 12, grant: { shuffles: 1 }, text: "a Shuffle" },
  { label: "250", icon: "circle-multiple", w: 10, grant: { coins: 250 }, text: "250 coins" },
  { label: "Combo", icon: "gift", w: 7, grant: { hammers: 2, shuffles: 2 }, text: "2 Hammers + 2 Shuffles" },
  { label: "500", icon: "crown", w: 5, grant: { coins: 500 }, text: "the 500 coin JACKPOT" },
];
const R = 140;
const SEG = 360 / PRIZES.length;

function wedge(i: number) {
  const a0 = ((i * SEG - 90) * Math.PI) / 180;
  const a1 = (((i + 1) * SEG - 90) * Math.PI) / 180;
  return `M${R},${R} L${R + R * Math.cos(a0)},${R + R * Math.sin(a0)} A${R},${R} 0 0 1 ${R + R * Math.cos(a1)},${R + R * Math.sin(a1)} Z`;
}

const fmtHours = (ms: number) => {
  const m = Math.ceil(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export function SpinWheel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const prog = useProgress();
  const showAd = useRewardedAd();
  const rot = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const segColors = [colors.brand, colors.brandSecondary, colors.brandPrimary, colors.brandTertiary];
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const spin = (kind: "free" | "ad") => {
    if (spinning) return;
    const total = PRIZES.reduce((s, p) => s + p.w, 0);
    let roll = Math.random() * total;
    let idx = 0;
    while (roll > PRIZES[idx].w) roll -= PRIZES[idx++].w;
    const prize = PRIZES[idx];
    setSpinning(true);
    setResult(null);
    prog.markSpin(kind);
    const base = rot.value - (rot.value % 360);
    rot.value = withTiming(base + 360 * 6 + (360 - (idx * SEG + SEG / 2)), { duration: 4200, easing: Easing.out(Easing.cubic) });
    let t = 0;
    for (let k = 0; k < 18; k++) {
      t += 60 + k * 14;
      setTimeout(() => playSfx("tick"), t);
    }
    setTimeout(() => {
      prog.grant(prize.grant);
      playSfx(idx === PRIZES.length - 1 ? "jackpot" : "coin");
      prog.haptic("success");
      setResult(`You won ${prize.text}!`);
      setSpinning(false);
    }, 4300);
  };

  const adSpin = async () => {
    setAdBusy(true);
    const ok = await showAd("daily-spin");
    setAdBusy(false);
    if (ok) setTimeout(() => spin("ad"), 400);
  };

  return (
    <Modal visible={visible && !adBusy} transparent animationType="fade" onRequestClose={() => !spinning && onClose()}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="spin-wheel-modal">
          <View style={styles.head}>
            <Text style={styles.title}>Daily Spin</Text>
            <ChunkyButton testID="spin-close-button" icon="close" variant="plain" disabled={spinning} onPress={onClose} />
          </View>
          <View style={styles.wheelWrap}>
            <Animated.View style={[{ width: R * 2, height: R * 2 }, wheelStyle]} testID="spin-wheel">
              <Svg width={R * 2} height={R * 2}>
                {PRIZES.map((_, i) => (
                  <Path key={i} d={wedge(i)} fill={segColors[i % segColors.length]} stroke={colors.surfaceSecondary} strokeWidth={3} />
                ))}
              </Svg>
              {PRIZES.map((p, i) => {
                const a = ((i * SEG + SEG / 2) * Math.PI) / 180;
                const r = R * 0.64;
                return (
                  <View key={i} style={[styles.label, { left: R + r * Math.sin(a) - 30, top: R - r * Math.cos(a) - 22, transform: [{ rotate: `${i * SEG + SEG / 2}deg` }] }]}>
                    <MaterialDesignIcons name={p.icon as any} size={22} color={colors.onSurfaceInverse} />
                    <Text style={styles.labelText}>{p.label}</Text>
                  </View>
                );
              })}
            </Animated.View>
            <View style={[styles.hub, { backgroundColor: colors.surfaceSecondary, borderColor: colors.gold }]}>
              <MaterialDesignIcons name="star" size={28} color={colors.gold} />
            </View>
            <View style={styles.pointer}>
              <MaterialDesignIcons name="menu-down" size={56} color={colors.error} />
            </View>
          </View>
          {result ? <Text style={styles.result} testID="spin-result">{result}</Text> : null}
          {prog.freeSpinReady ? (
            <ChunkyButton testID="spin-free-button" label={spinning ? "Spinning..." : "Spin for free!"} icon="sync" size="lg" disabled={spinning} onPress={() => spin("free")} />
          ) : (
            <>
              <Text style={styles.sub} testID="spin-next-free">Next free spin in {fmtHours(prog.nextFreeSpinIn)}</Text>
              <ChunkyButton
                testID="spin-ad-button"
                label={prog.adSpinReady ? "Watch ad · Extra spin" : "Extra spin used today"}
                icon="play-box"
                variant="secondary"
                size="lg"
                disabled={spinning || !prog.adSpinReady}
                onPress={adSpin}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, alignItems: "center" },
  head: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  wheelWrap: { width: R * 2, height: R * 2, alignItems: "center", justifyContent: "center" },
  label: { position: "absolute", width: 60, height: 44, alignItems: "center" },
  labelText: { fontFamily: fonts.display, fontSize: 13, color: c.onSurfaceInverse, textShadowColor: c.textShadow, textShadowRadius: 2 },
  hub: { position: "absolute", width: 56, height: 56, borderRadius: 28, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  pointer: { position: "absolute", top: -30 },
  result: { fontFamily: fonts.display, fontSize: 20, color: c.brand, textAlign: "center" },
  sub: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
}));
