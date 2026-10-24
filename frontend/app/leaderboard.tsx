import React, { useEffect, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { ChapterBackground } from "@/src/components/ChapterBackground";
import { ChunkyButton } from "@/src/components/ChunkyButton";
import { GlassPanel } from "@/src/components/GlassPanel";
import { currentWeek, fetchWeeklyScores, getMyWeeklyScore, submitWeeklyScore, WeeklyEntry } from "@/src/game/leaderboard";
import { useProgress } from "@/src/game/progress";
import { chapterOf } from "@/src/game/levels";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

export default function LeaderboardScreen() {
  const styles = useStyles(); const router = useRouter(); const insets = useSafeAreaInsets();
  const { colors } = useTheme(); const progress = useProgress();
  const [name, setName] = useState(progress.leaderboardName);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const week = currentWeek(); const stars = progress.weeklyStars[week] ?? 0;
  useEffect(() => { fetchWeeklyScores().then((r) => { if (r?.week === week) { setEntries(r.entries); setConnected(true); } }); }, [week]);
  useEffect(() => { if (!progress.playerId) return; getMyWeeklyScore(progress.playerId).then((mine) => { if (mine) setName(mine.display_name); }); }, [progress.playerId]);
  const save = async () => {
    const clean = name.trim().slice(0, 24);
    progress.update({ leaderboardName: clean });
    const previous = await getMyWeeklyScore(progress.playerId);
    const ok = await submitWeeklyScore(progress.playerId, clean, Math.max(stars, previous?.stars ?? 0), week);
    if (ok) { setConnected(true); const r = await fetchWeeklyScores(); if (r) setEntries(r.entries); }
    else setConnected(false);
  };
  const shown = entries.length ? entries : (progress.leaderboardName ? [{ display_name: `${progress.leaderboardName} (you)`, stars }] : []);
  return <View style={styles.root}>
    <ChapterBackground chapter={chapterOf(Math.max(1, progress.unlocked))} />
    <FlatList data={shown} keyExtractor={(item, i) => `${item.display_name}-${i}`} contentContainerStyle={{ paddingTop: insets.top + 116, paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}
      ListHeaderComponent={<View style={{ gap: spacing.md, marginBottom: spacing.md }}>
        <GlassPanel style={styles.form}>
          <Text style={styles.heading}>This week · {week}</Text>
          <Text style={styles.sub}>Your stars: {stars}</Text>
          <TextInput testID="leaderboard-name" value={name} onChangeText={setName} maxLength={24} placeholder="Choose a player name" placeholderTextColor={colors.onSurfaceTertiary} style={styles.input} />
          <ChunkyButton testID="leaderboard-submit" label="Join leaderboard" icon="trophy" onPress={save} disabled={!name.trim() || !progress.playerId} />
          <Text style={styles.sub}>{connected ? "Weekly scores are synced" : "Showing your local score. Connect the game backend to compete with friends."}</Text>
        </GlassPanel>
        <Text style={styles.sub}>Scores reset each week. Share your player name with friends.</Text>
      </View>}
      renderItem={({ item, index }) => <GlassPanel style={styles.row}><Text style={styles.rank}>#{index + 1}</Text><Text style={styles.player}>{item.display_name}</Text><MaterialDesignIcons name="star" size={20} color={colors.gold} /><Text style={styles.score}>{item.stars}</Text></GlassPanel>}
      ListEmptyComponent={<Text style={styles.sub}>No leaderboard scores yet. Be the first!</Text>} />
    <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <ChunkyButton icon="chevron-left" variant="plain" onPress={() => router.back()} /><Text style={styles.title}>Weekly Stars</Text>
    </GlassPanel>
  </View>;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface }, heading: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.onSurfaceTertiary }, form: { gap: spacing.md, padding: spacing.lg },
  input: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: spacing.md, color: c.onSurface, backgroundColor: c.surface },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md }, rank: { fontFamily: fonts.display, fontSize: 18, color: c.brand, width: 42 }, player: { flex: 1, fontFamily: fonts.textBold, fontSize: 16, color: c.onSurface }, score: { fontFamily: fonts.display, color: c.onSurface },
}));
