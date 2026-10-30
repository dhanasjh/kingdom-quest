import React, { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { Image } from "expo-image";

import type { Piece } from "@/src/game/engine";
import { PIECES, RAINBOW, SPECIAL_ICON } from "@/src/game/pieces";
import { useTheme } from "@/src/theme";
import type { FestivalEffectType } from "@/src/game/festivals";

type Props = { piece: Piece; row: number; col: number; fromRow?: number; cell: number; cellHeight?: number; dying: boolean; selected: boolean; hint?: boolean; art: number | { uri: string }; festivalTile?: string; festivalEffect?: FestivalEffectType; cheerTick?: number };

function PieceViewInner({ piece, row, col, fromRow, cell, cellHeight = cell, dying, selected, hint, art, festivalTile, festivalEffect, cheerTick }: Props) {
  const { colors } = useTheme();
  const rowInset = (cellHeight - cell) / 2;
  const x = useSharedValue(col * cell);
  const y = useSharedValue((fromRow ?? row) * cellHeight + rowInset);
  const scale = useSharedValue(1);
  const jump = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Celebration hop for this character.
  useEffect(() => {
    if (!cheerTick) return;
    // Keep the celebration hop inside the tile so neighboring pieces remain visible.
    jump.value = withSequence(withTiming(-cell * 0.03, { duration: 120 }), withSpring(0, { damping: 7, stiffness: 220 }));
  }, [cheerTick, cell, jump]);

  useEffect(() => {
    x.value = withTiming(col * cell, { duration: 170 });
    const destination = row * cellHeight + rowInset;
    const dist = Math.abs(y.value - destination) / cellHeight;
    y.value = withTiming(destination, { duration: Math.min(420, 150 + dist * 45), easing: Easing.out(Easing.quad) });
  }, [row, col, cell, cellHeight, rowInset, x, y]);

  useEffect(() => {
    if (dying) scale.value = withSequence(withTiming(0.96, { duration: 80 }), withTiming(0, { duration: 140 }));
    else if (hint) scale.value = withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.97, { duration: 420 })), -1, true);
    else scale.value = withSpring(1, { damping: 10 });
  }, [dying, selected, hint, scale]);

  useEffect(() => {
    rotation.value = dying && festivalEffect === "spin" ? withTiming(1080, { duration: 620 }) : withTiming(0, { duration: 0 });
  }, [dying, festivalEffect, rotation]);

  const anim = useAnimatedStyle(() => ({ left: x.value, top: y.value + jump.value, transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }] }));

  const style = PIECES[piece.color] ?? PIECES[0];
  const isRainbow = piece.special === "rainbow";
  const grad: [string, string, ...string[]] = isRainbow ? [...RAINBOW] : [style.from, style.to];
  const pad = 0;
  const size = cell;
  const customPhoto = typeof art !== "number";
  // Let bundled character art use the full tile canvas. Keep extra breathing
  // room around user photos so faces stay comfortably inside the frame.
  const imageSize = size * (customPhoto ? 0.9 : 1);
  return (
    <Animated.View testID={hint ? `hint-piece-${row}-${col}` : undefined} style={[styles.wrap, { pointerEvents: "none", width: cell, height: cell, padding: pad, borderRadius: cell * 0.3, borderColor: festivalEffect === "glow" && dying ? "#FFE27A" : "transparent" }, anim]}>
      {hint || (festivalEffect === "glow" && dying) ? <View style={[styles.glow, { borderRadius: cell * 0.35, backgroundColor: festivalEffect === "glow" ? "#FFD54F" : colors.gold }]} /> : null}
      <LinearGradient
        colors={grad}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.gem,
          {
            width: size,
            height: size,
            borderRadius: size * 0.25,
            borderColor: hint ? colors.gold : selected ? colors.onSurfaceInverse : piece.special === "bomb" ? colors.gold : "rgba(255,255,255,0.24)",
            borderWidth: selected || hint || piece.special === "bomb" ? 2.5 : festivalTile ? 2 : 0.75,
          },
        ]}
      >
        {festivalTile ? (
          <Text style={[styles.festivalTile, { fontSize: size * 0.72 }]}>{festivalTile}</Text>
        ) : isRainbow ? (
          <MaterialDesignIcons name="creation" size={size * 0.62} color={colors.onSurfaceInverse} />
        ) : (
          <Image
            source={art}
            style={[styles.art, { width: imageSize, height: imageSize, left: (size - imageSize) / 2, top: (size - imageSize) / 2 }]}
            contentFit="contain"
            cachePolicy="memory"
            recyclingKey={typeof art === "number" ? String(art) : art.uri}
          />
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
  wrap: { position: "absolute", overflow: "hidden", backgroundColor: "transparent", borderWidth: 0, borderColor: "transparent", shadowColor: "#17344A", shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  glow: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.45 },
  gem: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  art: { position: "absolute" },
  festivalTile: { textAlign: "center", textAlignVertical: "center" },
  shine: { position: "absolute", top: "6%", left: "14%", backgroundColor: "rgba(255,255,255,0.24)" },
  stripe: { position: "absolute", backgroundColor: "rgba(255,255,255,0.75)" },
  badge: { position: "absolute", right: 1, bottom: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
});
