import React from "react";
import { LayoutChangeEvent, Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

import { radius, useTheme } from "@/src/theme";

// Absolute blur + white tint + top sheen. Drop as first child of any container.
export function GlassFill({ blur = true, strong = false, tint, sheenOpacity }: { blur?: boolean; strong?: boolean; tint?: string; sheenOpacity?: number }) {
  const { colors } = useTheme();
  return (
    <>
      {blur ? (
        <BlurView
          intensity={24}
          tint="light"
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? (strong ? colors.glassTintStrong : colors.glassTint), pointerEvents: "none" }]} />
      <View style={[styles.sheen, { backgroundColor: colors.glassSheen, opacity: sheenOpacity ?? 0.6, pointerEvents: "none" }]} />
    </>
  );
}

type Props = { children?: React.ReactNode; style?: StyleProp<ViewStyle>; blur?: boolean; strong?: boolean; testID?: string; onLayout?: (event: LayoutChangeEvent) => void };

export function GlassPanel({ children, style, blur = true, strong, testID, onLayout }: Props) {
  const { colors } = useTheme();
  return (
    <View testID={testID} onLayout={onLayout} style={[styles.base, { borderColor: colors.glassBorder }, style]}>
      <GlassFill blur={blur} strong={strong} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, borderWidth: 1.5, overflow: "hidden" },
  sheen: { position: "absolute", top: 0, left: 0, right: 0, height: "38%", opacity: 0.6 },
});
