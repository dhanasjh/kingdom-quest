// Rewarded ads grant rewards only after AdMob reports EARNED_REWARD.
import React, { createContext, useCallback, useContext, useState } from "react";
import { Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { pauseMusic, playSfx, startMusic } from "@/src/game/sound";
import { showNativeRewarded } from "@/src/ads/admob";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

type ShowAd = (placement: string) => Promise<boolean>;
const AdContext = createContext<ShowAd | null>(null);

export function RewardedAdProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [req, setReq] = useState<{ placement: string; resolve: (v: boolean) => void } | null>(null);

  // No mock reward is granted in Expo Go, web, or an unconfigured build.
  const show = useCallback<ShowAd>(
    async (placement) => {
      pauseMusic();
      const native = await showNativeRewarded();
      if (native === null) {
        setReq({ placement, resolve: () => {} });
        startMusic();
        return false;
      }
      startMusic();
      if (native) playSfx("coin");
      return native;
    },
    [],
  );

  const close = (granted: boolean) => {
    req?.resolve(granted);
    setReq(null);
    startMusic();
    if (granted) playSfx("coin");
  };

  return (
    <AdContext.Provider value={show}>
      {children}
      <Modal visible={!!req} animationType="fade" onRequestClose={() => close(false)}>
        <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} testID="rewarded-ad-modal">
          <View style={styles.top}>
            <Text style={styles.sponsored}>Rewarded ads</Text>
            <ChunkyButton icon="close" variant="plain" onPress={() => close(false)} />
          </View>
          <View style={styles.center}>
            <MaterialDesignIcons name="lock" size={72} color={colors.gold} />
            <Text style={styles.title}>Ad unavailable</Text>
            <Text style={styles.body}>A configured AdMob native build is required to earn this reward.</Text>
          </View>
          <ChunkyButton label="Close" icon="close" size="lg" onPress={() => close(false)} />
        </View>
      </Modal>
    </AdContext.Provider>
  );
}

export function useRewardedAd() {
  const ctx = useContext(AdContext);
  if (!ctx) throw new Error("useRewardedAd outside provider");
  return ctx;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.xl, gap: spacing.lg },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sponsored: { fontFamily: fonts.textBold, fontSize: 13, color: c.onSurfaceInverse, opacity: 0.8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 28, color: c.onSurfaceInverse, textAlign: "center" },
  body: { fontFamily: fonts.text, fontSize: 15, color: c.onSurfaceInverse, opacity: 0.75, textAlign: "center" },
}));
