import React, { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { Image } from "expo-image";

import type { Piece } from "@/src/game/engine";
import { PIECES, RAINBOW, SPECIAL_ICON } from "@/src/game/pieces";
import { useTheme } from "@/src/theme";

type Props = { piece: Piece; row: number; col: number; fromRow?: number; cell: number; dying: boolean; selected: boolean; hint?: boolean; art: number; cheerTick?: number };

function PieceViewInner({ piece, row, col, fromRow, cell, dying, selected, hint, art, cheerTick }: Props) {
  const { colors } = useTheme();
  const x = useSharedValue(col * cell);
  const y = useSharedValue((fromRow ?? row) * cell);
  const scale = useSharedValue(1);
  const jump = useSharedValue(0);

  // Celebration hop for this character.
  useEffect(() => {
    if (!cheerTick) return;
    jump.value = withSequence(withTiming(-cell * 0.3, { duration: 140 }), withSpring(0, { damping: 5, stiffness: 220 }));
  }, [cheerTick, cell, jump]);

  useEffect(() => {
    x.value = withTiming(col * cell, { duration: 170 });
    const dist = Math.abs(y.value - row * cell) / cell;
    y.value = withTiming(row * cell, { duration: Math.min(420, 150 + dist * 45), easing: Easing.out(Easing.quad) });
  }, [row, col, cell, x, y]);

  useEffect(() => {
    if (dying) scale.value = withSequence(withTiming(1.2, { duration: 80 }), withTiming(0, { duration: 140 }));
    else if (hint) scale.value = withRepeat(withSequence(withTiming(1.14, { duration: 420 }), withTiming(0.94, { duration: 420 })), -1, true);
    else scale.value = withSpring(selected ? 1.12 : 1, { damping: 10 });
  }, [dying, selected, hint, scale]);

  const anim = useAnimatedStyle(() => ({ left: x.value, top: y.value + jump.value, transform: [{ scale: scale.value }] }));

  const style = PIECES[piece.color] ?? PIECES[0];
  const isRainbow = piece.special === "rainbow";
  const grad: [string, string, ...string[]] = isRainbow ? [...RAINBOW] : [style.from, style.to];
  const pad = cell * 0.08;
  const size = cell - pad * 2;
  return (
    <Animated.View pointerEvents="none" testID={hint ? `hint-piece-${row}-${col}` : undefined} style={[styles.wrap, { width: cell, height: cell, padding: pad }, anim]}>
      {hint ? <View style={[styles.glow, { borderRadius: cell * 0.35, backgroundColor: colors.gold }]} /> : null}
      <LinearGradient
        colors={grad}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.gem,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            borderColor: hint ? colors.gold : selected ? colors.onSurfaceInverse : piece.special === "bomb" ? colors.gold : colors.glassBorder,
            borderWidth: selected || hint || piece.special === "bomb" ? 3 : 1.5,
          },
        ]}
      >
        {isRainbow ? (
          <MaterialDesignIcons name="creation" size={size * 0.62} color={colors.onSurfaceInverse} />
        ) : (
          <Image source={art} style={styles.art} contentFit="cover" cachePolicy="memory" />
        )}
        <View style={[styles.shine, { width: size * 0.55, height: size * 0.2, borderRadius: size }]} />
        {piece.special === "rocketH" || piece.special === "rocketV" ? (
          <View style={[styles.stripe, piece.special === "rocketH" ? { height: 4, width: size } : { width: 4, height: size }]} />
        ) : null}
        {piece.special !== "none" && !isRainbow ? (
          <View style={[styles.badge, { width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: colors.surfaceInverse, borderColor: colors.gold }]}>
            <MaterialDesignIcons name={SPECIAL_ICON[piece.special] as any} size={size * 0.28} color={colors.gold} />
          </View>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

export const PieceView = memo(PieceViewInner);

const styles = StyleSheet.create({
  wrap: { position: "absolute" },
  glow: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.45 },
  gem: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  art: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  shine: { position: "absolute", top: "6%", left: "14%", backgroundColor: "rgba(255,255,255,0.35)" },
  stripe: { position: "absolute", backgroundColor: "rgba(255,255,255,0.75)" },
  badge: { position: "absolute", right: 1, bottom: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
});
