import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChunkyButton } from "@/src/components/ChunkyButton";
import { ObjectiveChip } from "@/src/components/ObjectiveChip";
import { StarRow } from "@/src/components/StarRow";
import { CHAPTERS, LevelDef, chapterOf, levelInChapter } from "@/src/game/levels";
import { formatMs, useProgress } from "@/src/game/progress";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = { level: LevelDef | null; onClose: () => void; onPlay: (id: number) => void; onAdLife: () => void };

export function LevelStartSheet({ level, onClose, onPlay, onAdLife }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const prog = useProgress();
  const ch = level ? CHAPTERS[chapterOf(level.id) - 1] : null;
  return (
    <Modal visible={!!level} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} testID="level-sheet-backdrop" />
      {level && ch ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]} testID="level-start-sheet">
          <View style={styles.grabber} />
          <View style={styles.head}>
            <View>
              <Text style={[styles.kicker, { color: ch.accent === "#FFD166" ? colors.brand : ch.accent }]}>{ch.name}</Text>
              <Text style={styles.title} testID="level-sheet-title">Level {level.id}</Text>
            </View>
            <StarRow stars={prog.best[level.id] ?? 0} size={26} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Chapter {ch.id} · Stage {levelInChapter(level.id)}</Text>
            {level.hard ? (
              <View style={[styles.hard, { backgroundColor: colors.error }]} testID="level-sheet-hard-badge">
                <MaterialDesignIcons name="fire" size={14} color={colors.onError} />
                <Text style={styles.hardText}>Hard</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.label}>Goals</Text>
          <View style={styles.goals}>
            {level.objectives.map((o, i) => (
              <ObjectiveChip key={i} obj={o} remaining={o.count} roster={level.roster} testID={`level-sheet-goal-${i}`} />
            ))}
          </View>
          <View style={styles.row}>
            <MaterialDesignIcons name="shoe-print" size={18} color={colors.muted} />
            <Text style={styles.label} testID="level-sheet-moves">{level.moves} moves</Text>
          </View>
          {prog.lives <= 0 ? (
            <>
              <Text style={[styles.label, { color: colors.error }]} testID="no-lives-text">
                Out of lives. Next life in {formatMs(prog.nextLifeIn)}
              </Text>
              <ChunkyButton testID="level-sheet-ad-life-button" label={prog.adLifeReady ? "Watch ad · +1 life" : "Life ad used today"} icon="play-box" variant="secondary" disabled={!prog.adLifeReady} onPress={onAdLife} />
            </>
          ) : null}
          <ChunkyButton testID="level-sheet-play-button" label="Play" icon="play" size="lg" disabled={prog.lives <= 0} onPress={() => onPlay(level.id)} />
        </View>
      ) : null}
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  scrim: { flex: 1, backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { fontFamily: fonts.textBold, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface },
  label: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
  goals: { flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hard: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, height: 24, borderRadius: radius.pill },
  hardText: { fontFamily: fonts.textBold, fontSize: 12, color: c.onError },
}));
