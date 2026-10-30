// Design tokens for this app. Light theme only (from /app/design_guidelines.json).
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FDFBF7",
  onSurface: "#2C2C2C",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#3A3A3A",
  surfaceTertiary: "#F1EDE4",
  onSurfaceTertiary: "#4A4A4A",
  surfaceInverse: "#2C2C2C",
  onSurfaceInverse: "#FFFFFF",
  muted: "#8A8A8A",

  brand: "#FF7A59",
  onBrand: "#FFFFFF",
  brandPrimary: "#06D6A0",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FFD166",
  onBrandSecondary: "#4A3A1A",
  brandTertiary: "#FF6B6B",
  onBrandTertiary: "#FFFFFF",

  success: "#06D6A0",
  onSuccess: "#FFFFFF",
  warning: "#FFD166",
  onWarning: "#4A4A4A",
  error: "#EF476F",
  onError: "#FFFFFF",
  info: "#FFD166",
  onInfo: "#4A4A4A",

  border: "#E5E5E5",
  borderStrong: "#CCCCCC",
  divider: "#EEEEEE",

  // Liquid glass + 3D
  glassTint: "rgba(255,255,255,0.42)",
  glassTintStrong: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.75)",
  glassSheen: "rgba(255,255,255,0.35)",
  extrude: "rgba(0,0,0,0.22)",
  highlight: "rgba(255,255,255,0.3)",
  bgScrimTop: "rgba(20,14,8,0.35)",
  bgScrimBottom: "rgba(20,14,8,0.45)",
  sparkle: "rgba(255,248,220,0.9)",
  textShadow: "rgba(0,0,0,0.35)",

  // Game extras
  scrim: "rgba(30,24,20,0.55)",
  boardFrame: "rgba(255,255,255,0.3)",
  cellA: "rgba(255,255,255,0.4)",
  cellB: "rgba(255,255,255,0.26)",
  ice: "rgba(140,215,255,0.55)",
  iceStrong: "rgba(80,175,240,0.75)",
  crate: "#B07A45",
  crateDark: "#7D522A",
  onCrate: "#FFE9C7",
  vine: "rgba(6,214,160,0.38)",
  lockTint: "rgba(30,24,20,0.28)",
  gold: "#FFC93C",
  heart: "#FF4D6D",
  starEmpty: "#E3D8C8",
  shadow: "#2D2A26",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export const colors = light;

export const fonts = {
  display: "Fredoka-Bold",
  displaySemi: "Fredoka-SemiBold",
  text: "Nunito-SemiBold",
  textBold: "Nunito-ExtraBold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const lifted = (c: ThemeColors) => ({
  shadowColor: c.shadow,
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
});
