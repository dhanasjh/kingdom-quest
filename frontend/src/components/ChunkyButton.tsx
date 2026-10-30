import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { fonts, lifted, useTheme } from "@/src/theme";
import { playSfx } from "@/src/game/sound";

type Variant = "brand" | "secondary" | "primary" | "plain";

type Props = {
  label?: string;
  icon?: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  size?: "xs" | "sm" | "md" | "lg";
};

export function ChunkyButton({ label, icon, onPress, variant = "brand", disabled, testID, style, size = "md" }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const palette: Record<Variant, [string, string]> = {
    brand: [colors.brand, colors.onBrand],
    secondary: [colors.brandSecondary, colors.onBrandSecondary],
    primary: [colors.brandPrimary, colors.onBrandPrimary],
    plain: [colors.surfaceSecondary, colors.onSurfaceSecondary],
  };
  const [bg, fg] = palette[variant];
  const h = size === "lg" ? 60 : size === "sm" ? 40 : size === "xs" ? 34 : 48;
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) playSfx("tap");
          scale.set(withSpring(0.95, { damping: 12, stiffness: 400 }));
        }}
        onPressOut={() => scale.set(withSpring(1, { damping: 8, stiffness: 300 }))}
        style={({ pressed }) => [
          styles.btn,
          lifted(colors),
          {
            backgroundColor: bg,
            height: h,
            opacity: disabled ? 0.5 : 1,
            borderColor: colors.extrude,
            borderBottomWidth: pressed ? 2 : 6,
            transform: [{ translateY: pressed ? 4 : 0 }],
            paddingHorizontal: label ? (size === "xs" ? 9 : size === "sm" ? 16 : 24) : 0,
            width: label ? undefined : h,
          },
        ]}
      >
        <View style={[styles.hi, { backgroundColor: colors.highlight, pointerEvents: "none" }]} />
        {icon ? <MaterialDesignIcons name={icon as any} size={size === "lg" ? 26 : size === "sm" ? 19 : size === "xs" ? 17 : 22} color={fg} /> : null}
        {label ? <Text style={[styles.label, { color: fg, fontSize: size === "lg" ? 22 : size === "sm" ? 15 : size === "xs" ? 13 : 18 }]}>{label}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  hi: { position: "absolute", top: 3, left: 8, right: 8, height: "40%", borderRadius: 12 },
  label: { fontFamily: fonts.display },
});
