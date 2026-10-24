import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChapterBackground } from "@/src/components/ChapterBackground";
import { ChunkyButton } from "@/src/components/ChunkyButton";
import { CurrencyPill } from "@/src/components/CurrencyPill";
import { GlassPanel } from "@/src/components/GlassPanel";
import { BOOSTER_INFO, BoosterKind } from "@/src/components/BoosterShop";
import { PRODUCTS, Product, purchase } from "@/src/iap/purchases";
import { rcAvailable, rcRestorePurchases, rcRestoreUnlock } from "@/src/iap/rc";
import { chapterOf } from "@/src/game/levels";
import { useProgress } from "@/src/game/progress";
import { playSfx } from "@/src/game/sound";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ShopScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prog = useProgress();
  const [pending, setPending] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    const ok = await purchase(pending);
    setBusy(false);
    if (ok) {
      prog.grant({ coins: pending.coins, hammers: pending.hammers, shuffles: pending.shuffles, lives: pending.lives });
      prog.recordPurchase(pending.id, pending.unlockAll);
      playSfx("jackpot");
      prog.haptic("success");
      setToast(`${pending.title} added!`);
    } else {
      setToast("Purchase cancelled or failed");
    }
    setPending(null);
  };

  const restore = async () => {
    const purchasesRestored = await rcRestorePurchases();
    const r = await rcRestoreUnlock();
    if (r === null) return setToast("Restore requires a configured native store build");
    if (r) {
      prog.recordPurchase("unlock_all", true);
      setToast("All chapters restored!");
    } else setToast(purchasesRestored ? "Purchases restored; consumable items are not re-granted" : "No purchases to restore");
  };

  const buyBooster = (k: BoosterKind) => {
    if (!prog.spendCoins(BOOSTER_INFO[k].cost)) {
      setToast("Not enough coins");
      return;
    }
    prog.grant(k === "hammer" ? { hammers: 1 } : { shuffles: 1 });
    playSfx("coin");
    setToast(`+1 ${BOOSTER_INFO[k].name}`);
  };

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={chapterOf(Math.max(1, prog.unlocked))} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 96, paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Text style={styles.section}>Coins & Packs</Text>
        {PRODUCTS.map((p, i) => {
          const owned = p.unlockAll && prog.unlockAll;
          return (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 50)}>
              <GlassPanel blur={false} strong style={[styles.card, p.unlockAll && { borderColor: colors.gold, borderWidth: 3 }]} testID={`product-${p.id}`}>
                <View style={[styles.icon, { backgroundColor: p.unlockAll ? colors.brand : colors.brandSecondary }]}>
                  <MaterialDesignIcons name={p.icon as any} size={30} color={colors.onSurfaceInverse} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.title}>{p.title}</Text>
                    {p.badge ? <Text style={[styles.badge, { backgroundColor: colors.error }]}>{p.badge}</Text> : null}
                  </View>
                  <Text style={styles.desc}>{p.desc}</Text>
                </View>
                <ChunkyButton testID={`buy-${p.id}`} label={owned ? "Owned" : p.price} variant={owned ? "plain" : "brand"} disabled={!!owned} onPress={() => setPending(p)} />
              </GlassPanel>
            </Animated.View>
          );
        })}
        <Text style={styles.section}>Spend Coins</Text>
        {(["hammer", "shuffle"] as BoosterKind[]).map((k) => (
          <GlassPanel key={k} blur={false} strong style={styles.card} testID={`coin-item-${k}`}>
            <View style={[styles.icon, { backgroundColor: colors.brandPrimary }]}>
              <MaterialDesignIcons name={BOOSTER_INFO[k].icon as any} size={30} color={colors.onSurfaceInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{BOOSTER_INFO[k].name}</Text>
              <Text style={styles.desc}>You have {k === "hammer" ? prog.hammers : prog.shuffles}</Text>
            </View>
            <ChunkyButton testID={`coin-buy-${k}`} label={`${BOOSTER_INFO[k].cost}`} icon="circle-multiple" variant="secondary" disabled={prog.coins < BOOSTER_INFO[k].cost} onPress={() => buyBooster(k)} />
          </GlassPanel>
        ))}
        <ChunkyButton testID="restore-purchases-button" label="Restore purchases" icon="restore" variant="plain" onPress={restore} />
      </ScrollView>

      <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="shop-header">
        <ChunkyButton testID="shop-back-button" icon="chevron-left" variant="plain" onPress={() => router.back()} />
        <Text style={[styles.title, { flex: 1, fontSize: 26 }]}>Shop</Text>
        <CurrencyPill testID="shop-coins" icon="circle-multiple" iconColor={colors.gold} value={prog.coins} />
      </GlassPanel>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => !busy && setPending(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modal} testID="purchase-confirm-modal">
            <Text style={styles.title}>{pending?.title}</Text>
            <Text style={styles.desc}>{pending?.desc}</Text>
            {!rcAvailable() ? (
              <Text style={[styles.desc, { color: colors.brand }]} testID="purchase-test-note">Purchases are unavailable until this native build is connected to RevenueCat and its app store products.</Text>
            ) : null}
            {busy ? (
              <ActivityIndicator color={colors.brand} size="large" testID="purchase-processing" />
            ) : (
              <View style={styles.row}>
                <ChunkyButton testID="purchase-cancel-button" label="Cancel" variant="plain" onPress={() => setPending(null)} />
                <ChunkyButton testID="purchase-confirm-button" label={`Buy ${pending?.price ?? ""}`} onPress={confirm} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {toast ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.toast, { bottom: insets.bottom + spacing.lg }]} testID="shop-toast">
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  section: { fontFamily: fonts.display, fontSize: 22, color: c.onSurfaceInverse, textShadowColor: c.textShadow, textShadowRadius: 4, marginTop: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, ...lifted(c) },
  icon: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  title: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  desc: { fontFamily: fonts.text, fontSize: 13, color: c.onSurfaceTertiary },
  badge: { fontFamily: fonts.textBold, fontSize: 11, color: c.onError, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden" },
  backdrop: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, alignItems: "center" },
  toast: { position: "absolute", left: spacing.lg, right: spacing.lg, backgroundColor: c.surfaceInverse, borderRadius: radius.md, padding: spacing.lg },
  toastText: { fontFamily: fonts.textBold, fontSize: 15, color: c.onSurfaceInverse, textAlign: "center" },
}));
