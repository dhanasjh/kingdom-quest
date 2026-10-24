import React from "react";
import { Modal, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { ZoomIn } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { StarRow } from "@/src/components/StarRow";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  won: boolean;
  level: number;
  stars: number;
  score: number;
  coins: number;
  newStars: number;
  hasNext: boolean;
  canRetry: boolean;
  extraAvailable: boolean;
  extraMoves: number;
  extraCost: number;
  coinBalance: number;
  onAdMoves: () => void;
  onBuyMoves: () => void;
  onContinue: () => void;
  onRetry: () => void;
  onMap: () => void;
};

export function ResultsModal(p: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Modal visible={p.visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={30} tint="dark" style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card} testID="results-modal">
          <Text style={styles.small}>Level {p.level}</Text>
          <Text testID="results-title" style={[styles.title, { color: p.won ? colors.brand : colors.error }]}>
            {p.won ? "Level Cleared!" : "Out of Moves"}
          </Text>
          {p.won ? (
            <>
              <StarRow stars={p.stars} size={56} animate testID="results-stars" />
              <View style={styles.row}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Score</Text>
                  <Text testID="results-score" style={styles.statValue}>{p.score}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Coins</Text>
                  <View style={styles.inline}>
                    <MaterialDesignIcons name="circle-multiple" size={18} color={colors.gold} />
                    <Text testID="results-coins" style={styles.statValue}>+{p.coins}</Text>
                  </View>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>New stars</Text>
                  <View style={styles.inline}>
                    <MaterialDesignIcons name="star" size={18} color={colors.gold} />
                    <Text testID="results-new-stars" style={styles.statValue}>+{p.newStars}</Text>
                  </View>
                </View>
              </View>
              <ChunkyButton testID="results-continue-button" label={p.hasNext ? "Next Level" : "Continue"} onPress={p.onContinue} size="lg" style={styles.full} />
              <View style={styles.row}>
                <ChunkyButton testID="results-map-button" label="Map" icon="map" variant="plain" onPress={p.onMap} />
                <ChunkyButton testID="results-retry-button" label="Replay" icon="restore" variant="primary" onPress={p.onRetry} />
              </View>
            </>
          ) : (
            <>
              {p.extraAvailable ? (
                <View style={styles.offer} testID="extra-moves-offer">
                  <Text style={styles.offerTitle}>So close! Keep going?</Text>
                  <ChunkyButton testID="results-ad-moves-button" label={`Watch ad · +${p.extraMoves} moves`} icon="play-box" variant="secondary" onPress={p.onAdMoves} style={styles.full} />
                  <ChunkyButton
                    testID="results-buy-moves-button"
                    label={`+${p.extraMoves} moves · ${p.extraCost} coins`}
                    icon="circle-multiple"
                    variant="primary"
                    disabled={p.coinBalance < p.extraCost}
                    onPress={p.onBuyMoves}
                    style={styles.full}
                  />
                </View>
              ) : null}
              <View style={styles.heartWrap}>
                <MaterialDesignIcons name="heart-broken" size={p.extraAvailable ? 36 : 64} color={colors.heart} />
                <Text style={styles.statLabel}>Giving up costs a life</Text>
              </View>
              <ChunkyButton testID="results-retry-button" label="Retry" icon="restore" variant={p.extraAvailable ? "plain" : "brand"} disabled={!p.canRetry} onPress={p.onRetry} size="lg" style={styles.full} />
              {!p.canRetry ? <Text style={styles.statLabel}>No lives left after this. Wait for a refill or watch an ad on the map.</Text> : null}
              <ChunkyButton testID="results-map-button" label="Back to Map" variant="plain" onPress={p.onMap} />
            </>
          )}
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: c.scrim },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
    borderBottomWidth: 6,
    borderColor: c.border,
    ...lifted(c),
  },
  small: { fontFamily: fonts.textBold, fontSize: 14, color: c.muted, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontFamily: fonts.display, fontSize: 32 },
  row: { flexDirection: "row", gap: spacing.md, justifyContent: "center" },
  stat: { alignItems: "center", backgroundColor: c.surfaceTertiary, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minWidth: 90 },
  statLabel: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  full: { alignSelf: "stretch" },
  heartWrap: { alignItems: "center", gap: 4 },
  offer: { alignSelf: "stretch", gap: spacing.sm, backgroundColor: c.surfaceTertiary, borderRadius: radius.lg, padding: spacing.md },
  offerTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface, textAlign: "center" },
}));
