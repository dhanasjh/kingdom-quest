import React from "react";
import { Text, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { GlassPanel } from "@/src/components/GlassPanel";
import { DAILY_GOAL, DAILY_GOAL_REWARD, todayKey, useProgress } from "@/src/game/progress";
import { playSfx } from "@/src/game/sound";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Duolingo-style streak + daily quest card.
export function DailyQuest() {
  const styles = useStyles();
  const { colors } = useTheme();
  const prog = useProgress();
  const today = todayKey();
  const wins = prog.todayDay === today ? prog.todayWins : 0;
  const yesterday = new Date(new Date().setHours(0, 0, 0, 0) - 86400000).toDateString();
  const streak = prog.lastPlayDay === today || prog.lastPlayDay === yesterday ? prog.streak : 0;
  const done = wins >= DAILY_GOAL;
  const claimed = prog.goalClaimedDay === today;

  const claimingRef = React.useRef(false);
  const claim = () => {
    if (claimingRef.current || prog.goalClaimedDay === today) return;
    claimingRef.current = true;
    prog.grant({ coins: DAILY_GOAL_REWARD });
    prog.update({ goalClaimedDay: today });
    playSfx("jackpot");
    prog.haptic("success");
  };

  return (
    <GlassPanel strong blur={false} style={styles.card} testID="daily-quest-card">
      <View style={styles.streak}>
        <MaterialDesignIcons name="fire" size={34} color={streak > 0 ? colors.brand : colors.muted} />
        <Text style={styles.streakNum} testID="streak-count">{streak}</Text>
        <Text style={styles.small}>day streak</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.title}>Daily Quest</Text>
        <Text style={styles.small}>Win {DAILY_GOAL} levels today</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(1, wins / DAILY_GOAL) * 100}%`, backgroundColor: done ? colors.success : colors.brandSecondary }]} />
        </View>
        <Text style={styles.small} testID="daily-quest-progress">{Math.min(wins, DAILY_GOAL)}/{DAILY_GOAL}</Text>
      </View>
      {done && !claimed ? (
        <ChunkyButton testID="daily-quest-claim-button" icon="treasure-chest" label={`+${DAILY_GOAL_REWARD}`} variant="secondary" onPress={claim} />
      ) : (
        <MaterialDesignIcons testID="daily-quest-chest" name={claimed ? "check-circle" : "treasure-chest"} size={40} color={claimed ? colors.success : colors.muted} />
      )}
    </GlassPanel>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.xs },
  streak: { alignItems: "center", width: 64 },
  streakNum: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, marginTop: -4 },
  title: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  small: { fontFamily: fonts.textBold, fontSize: 11, color: c.onSurfaceTertiary },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: c.glassTint, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
}));
