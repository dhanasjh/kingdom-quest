import React, { useState } from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { ZoomIn } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { GlassFill } from "@/src/components/GlassPanel";
import { STARTER_PACK, purchase } from "@/src/iap/purchases";
import { useProgress } from "@/src/game/progress";
import { playSfx } from "@/src/game/sound";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// One-time discounted bundle shown the first time a player gets stuck.
export function StarterOffer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const prog = useProgress();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const buy = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await purchase(STARTER_PACK);
    setBusy(false);
    if (!ok) setFailed(true);
    if (ok) {
      prog.grant({ coins: STARTER_PACK.coins, hammers: STARTER_PACK.hammers, shuffles: STARTER_PACK.shuffles, lives: STARTER_PACK.lives });
      prog.recordPurchase(STARTER_PACK.id);
      playSfx("jackpot");
      prog.haptic("success");
      onClose();
    }
  };

  const items = [
    { icon: "circle-multiple", text: "1,000 coins", color: colors.gold },
    { icon: "hammer", text: "3 Hammers", color: colors.brand },
    { icon: "shuffle-variant", text: "3 Shuffles", color: colors.brandPrimary },
    { icon: "heart", text: "3 Lives", color: colors.heart },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.card} testID="starter-offer-modal">
          <GlassFill strong />
          <Text style={[styles.badge, { backgroundColor: colors.error }]}>{STARTER_PACK.badge} · ONE TIME ONLY</Text>
          <MaterialDesignIcons name="rocket-launch" size={56} color={colors.brand} />
          <Text style={styles.title}>Starter Pack</Text>
          <Text style={styles.sub}>Stuck? Power up and beat this level!</Text>
          <View style={styles.items}>
            {items.map((it) => (
              <View key={it.text} style={styles.item}>
                <MaterialDesignIcons name={it.icon as any} size={24} color={it.color} />
                <Text style={styles.itemText}>{it.text}</Text>
              </View>
            ))}
          </View>
          {failed ? <Text style={[styles.sub, { color: colors.error }]} testID="starter-failed-text">Purchase cancelled or failed</Text> : null}
          {busy ? (
            <ActivityIndicator color={colors.brand} size="large" />
          ) : (
            <>
              <ChunkyButton testID="starter-buy-button" label={`Get it for ${STARTER_PACK.price}`} size="lg" onPress={buy} style={{ alignSelf: "stretch" }} />
              <ChunkyButton testID="starter-dismiss-button" label="No thanks" variant="plain" onPress={onClose} />
            </>
          )}
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: c.scrim },
  card: { width: "100%", maxWidth: 380, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, alignItems: "center", overflow: "hidden", borderWidth: 2, borderColor: c.glassBorder },
  badge: { fontFamily: fonts.textBold, fontSize: 12, color: c.onError, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },
  title: { fontFamily: fonts.display, fontSize: 32, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, color: c.onSurfaceTertiary },
  items: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.glassTint, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: "47%" },
  itemText: { fontFamily: fonts.textBold, fontSize: 14, color: c.onSurface },
}));
