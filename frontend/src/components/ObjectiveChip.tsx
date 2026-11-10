import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { pieceArtFor } from "@/src/game/art";
import type { FestivalPack } from "@/src/game/festivals";
import type { Objective } from "@/src/game/levels";
import { OBJECTIVE_ICON, PIECES } from "@/src/game/pieces";
import { fonts, makeStyles, useTheme } from "@/src/theme";

type Props = {
  obj: Objective;
  remaining: number;
  testID: string;
  roster?: number[];
  customPhotos?: (string | null)[];
  festivalTiles?: FestivalPack["tiles"];
};

export function ObjectiveChip({ obj, remaining, testID, roster, customPhotos, festivalTiles }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const done = remaining <= 0;
  const color = obj.color ?? 0;
  const piece = obj.type === "color" ? PIECES[color] : null;
  const target = piece && { backgroundColor: piece.from, ...pieceArtFor(color, roster, customPhotos, festivalTiles) };
  return (
    <View style={styles.chip}>
      {target ? (
        <View style={[styles.icon, { backgroundColor: target.backgroundColor, overflow: "hidden" }]}>
          {target.festivalTile !== undefined ? (
            <Text style={styles.festivalTile}>{target.festivalTile}</Text>
          ) : (
            <Image source={target.art} style={{ width: 23, height: 23 }} contentFit="cover" />
          )}
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
  festivalTile: { fontSize: 18, includeFontPadding: false },
  count: { fontFamily: fonts.display, fontSize: 15, color: c.onSurface, minWidth: 20 },
}));
