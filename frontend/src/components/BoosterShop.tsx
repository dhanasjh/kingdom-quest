import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type BoosterKind = "hammer" | "shuffle" | "snake";
export const BOOSTER_INFO: Record<BoosterKind, { name: string; icon: string; cost: number; desc: string }> = {
  hammer: { name: "Hammer", icon: "hammer", cost: 120, desc: "Smash any single tile, crate, lock or vine. No move used." },
  shuffle: { name: "Shuffle", icon: "shuffle-variant", cost: 80, desc: "Mix up all free pieces on the board. No move used." },
  snake: { name: "Royal Snake", icon: "snake", cost: 500, desc: "On a hard level, the Royal Snake clears the objectives and wins the level." },
};

type Props = { kind: BoosterKind | null; count: number; coins: number; watchAdAvailable: boolean; watchAdBusy: boolean; onBuy: () => void; onWatchAd: () => void; onClose: () => void };

export function BoosterShop({ kind, count, coins, watchAdAvailable, watchAdBusy, onBuy, onWatchAd, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const info = kind ? BOOSTER_INFO[kind] : null;
  return (
    <Modal visible={!!kind} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} testID="booster-shop-backdrop" />
      {info ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]} testID="booster-shop">
          <View style={styles.grabber} />
          <View style={styles.head}>
            <View style={styles.icon}>
              <MaterialDesignIcons name={info.icon as any} size={32} color={colors.onBrandSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{info.name}</Text>
              <Text style={styles.body}>{info.desc}</Text>
            </View>
          </View>
          <Text style={styles.body} testID="booster-shop-owned">You have {count} · Coins {coins}</Text>
          <ChunkyButton testID="booster-buy-button" label={`Buy 1 · ${info.cost} coins`} icon="circle-multiple" disabled={coins < info.cost} onPress={onBuy} size="lg" />
          <ChunkyButton testID="booster-ad-button" label={watchAdBusy ? "Loading ad…" : watchAdAvailable ? "Watch ad · Get 1 free" : "Free booster ad used today"} icon="play-box" variant="secondary" disabled={!watchAdAvailable || watchAdBusy} onPress={onWatchAd} size="lg" />
        </View>
      ) : null}
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  scrim: { flex: 1, backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
  head: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  icon: { width: 60, height: 60, borderRadius: radius.lg, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  body: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
}));
