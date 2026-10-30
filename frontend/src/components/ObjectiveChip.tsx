import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { artFor } from "@/src/game/art";
import type { Objective } from "@/src/game/levels";
import { OBJECTIVE_ICON, PIECES } from "@/src/game/pieces";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export function ObjectiveChip({ obj, remaining, testID, roster, customPhotos }: { obj: Objective; remaining: number; testID: string; roster?: number[]; customPhotos?: (string | null)[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const done = remaining <= 0;
  const piece = obj.type === "color" ? PIECES[obj.color ?? 0] : null;
  return (
    <View style={styles.chip}>
      {piece ? (
        <View style={[styles.icon, { backgroundColor: piece.from, overflow: "hidden" }]}>
          <Image source={artFor(obj.color ?? 0, roster, customPhotos)} style={{ width: 23, height: 23 }} contentFit="cover" />
        </View>
      ) : (
        <View style={[styles.icon, { backgroundColor: obj.type === "crate" ? colors.crate : obj.type === "vine" ? colors.success : obj.type === "ice" ? colors.info : colors.muted }]}>
          <MaterialDesignIcons name={OBJECTIVE_ICON[obj.type] as any} size={18} color={colors.onSurfaceInverse} />
        </View>
      )}
      {done ? (
        <MaterialDesignIcons testID={testID} name="check-bold" size={20} color={colors.success} />
      ) : (
        <Text testID={testID} style={styles.count}>
          {remaining}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  chip: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  icon: { width: 25, height: 25, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  count: { fontFamily: fonts.display, fontSize: 15, color: c.onSurface, minWidth: 20 },
}));
