import React from "react";
import { Text, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { fonts, lifted, makeStyles, radius, useTheme } from "@/src/theme";

type Props = { icon: string; iconColor: string; value: string | number; sub?: string; testID: string; dark?: boolean; compact?: boolean };

export function CurrencyPill({ icon, iconColor, value, sub, testID, dark, compact }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, compact && styles.compact, dark && { backgroundColor: colors.scrim, borderColor: "transparent" }]}>
      <MaterialDesignIcons name={icon as any} size={compact ? 17 : 20} color={iconColor} />
      <Text testID={testID} style={[styles.value, compact && styles.compactValue, dark && { color: colors.onSurfaceInverse }]}>
        {value}
      </Text>
      {sub ? <Text style={[styles.sub, dark && { color: colors.onSurfaceInverse }]}>{sub}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderColor: c.border,
    ...lifted(c),
  },
  compact: { height: 30, paddingHorizontal: 9, gap: 4 },
  value: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface },
  compactValue: { fontSize: 14 },
  sub: { fontFamily: fonts.text, fontSize: 11, color: c.muted },
}));
