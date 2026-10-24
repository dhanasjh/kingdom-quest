import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

import { radius, useTheme } from "@/src/theme";

// Absolute blur + white tint + top sheen. Drop as first child of any container.
export function GlassFill({ blur = true, strong = false }: { blur?: boolean; strong?: boolean }) {
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
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: strong ? colors.glassTintStrong : colors.glassTint }]} />
      <View pointerEvents="none" style={[styles.sheen, { backgroundColor: colors.glassSheen }]} />
    </>
  );
}

type Props = { children?: React.ReactNode; style?: StyleProp<ViewStyle>; blur?: boolean; strong?: boolean; testID?: string };

export function GlassPanel({ children, style, blur = true, strong, testID }: Props) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={[styles.base, { borderColor: colors.glassBorder }, style]}>
      <GlassFill blur={blur} strong={strong} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, borderWidth: 1.5, overflow: "hidden" },
  sheen: { position: "absolute", top: 0, left: 0, right: 0, height: "38%", opacity: 0.6 },
});
