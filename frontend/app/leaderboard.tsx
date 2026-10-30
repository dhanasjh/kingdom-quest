import React, { useEffect, useRef, useState } from "react";
import { FlatList, Share, Text, TextInput, View } from "react-native";
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
  const [loading, setLoading] = useState(false);
  const lastSubmit = useRef("");
  const week = currentWeek(); const stars = progress.weeklyStars[week] ?? 0;
  const chosenName = name.trim() || progress.leaderboardName;
  const refresh = async () => {
    setLoading(true);
    let scoreSynced: boolean | null = null;
    if (progress.leaderboardJoined && progress.playerId && chosenName.trim()) {
      const clean = chosenName.trim().replace(/[\\<>]/g, "").slice(0, 24);
      scoreSynced = await submitWeeklyScore(progress.playerId, clean, Math.max(stars, 0), week);
      lastSubmit.current = `${week}:${clean}:${Math.max(stars, 0)}`;
    }
    const r = await fetchWeeklyScores();
    if (r?.week === week) setEntries(r.entries);
    setConnected(scoreSynced ?? r?.week === week);
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    fetchWeeklyScores().then((r) => {
      if (!active) return;
      if (r?.week === week) { setEntries(r.entries); setConnected(true); }
      else setConnected(false);
    });
    return () => { active = false; };
  }, [week]);
  useEffect(() => { if (!progress.playerId) return; getMyWeeklyScore(progress.playerId).then((mine) => { if (mine) setName(mine.display_name); }); }, [progress.playerId]);
  useEffect(() => {
    if (!progress.leaderboardJoined || !progress.playerId || !chosenName.trim()) return;
    const clean = chosenName.trim().replace(/[\\<>]/g, "").slice(0, 24);
    const score = Math.max(stars, 0);
    const signature = `${week}:${clean}:${score}`;
    if (lastSubmit.current === signature) return;
    lastSubmit.current = signature;
    submitWeeklyScore(progress.playerId, clean, score, week).then(async (ok) => {
      setConnected(ok);
      if (ok) {
        const r = await fetchWeeklyScores();
        if (r?.week === week) setEntries(r.entries);
      }
    });
  }, [progress.leaderboardJoined, progress.playerId, chosenName, stars, week]);
  const join = () => {
    const clean = chosenName.trim().replace(/[\\<>]/g, "").slice(0, 24);
    if (!clean) return;
    progress.update({ leaderboardName: clean, leaderboardJoined: true });
  };
  const shareChallenge = async () => {
    await Share.share({ message: `Join me in Kingdom Quest! I have ${stars} stars this week (${week}). Pick a nickname and compete on Weekly Stars.` });
  };
  const shown = entries.length ? entries : (progress.leaderboardName ? [{ display_name: `${progress.leaderboardName} (you)`, stars }] : []);
  return <View style={styles.root}>
    <ChapterBackground chapter={chapterOf(Math.max(1, progress.unlocked))} />
    <FlatList data={shown} keyExtractor={(item, i) => `${item.display_name}-${i}`} contentContainerStyle={{ paddingTop: insets.top + 116, paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}
      ListHeaderComponent={<View style={{ gap: spacing.md, marginBottom: spacing.md }}>
        <GlassPanel style={styles.form}>
          <Text style={styles.heading}>This week · {week}</Text>
          <Text style={styles.sub}>Your stars: {stars}</Text>
          <TextInput testID="leaderboard-name" value={name || progress.leaderboardName} onChangeText={setName} maxLength={24} placeholder="Game nickname only" placeholderTextColor={colors.onSurfaceTertiary} style={styles.input} />
          <ChunkyButton testID="leaderboard-submit" label={progress.leaderboardJoined ? "Joined · scores sync automatically" : "Join weekly leaderboard"} icon="trophy" onPress={join} disabled={!chosenName.trim() || !progress.playerId} />
          <View style={styles.actions}>
            <ChunkyButton testID="leaderboard-refresh" label={loading ? "Refreshing…" : "Refresh"} icon="refresh" variant="plain" onPress={refresh} disabled={loading} style={styles.actionButton} />
            <ChunkyButton testID="leaderboard-share" label="Invite" icon="share-variant" variant="secondary" onPress={shareChallenge} style={styles.actionButton} />
          </View>
          <Text style={styles.sub}>{connected ? "Connected · your weekly score syncs after each level." : "Offline right now. Your score stays on this device and will sync when the service is reachable."}</Text>
          <Text style={styles.privacy}>Only your chosen nickname and weekly star total are shared. No chat, real name, contacts, or photos.</Text>
          {progress.leaderboardJoined ? <ChunkyButton testID="leaderboard-leave" label="Stop syncing scores" icon="logout" variant="plain" onPress={() => progress.update({ leaderboardJoined: false })} /> : null}
          {progress.leaderboardJoined ? <Text style={styles.privacy}>A score already sent this week stays visible until the weekly reset.</Text> : null}
        </GlassPanel>
        <GlassPanel style={styles.note}>
          <Text style={styles.noteText}>Scores reset each week. This is an asynchronous challenge board; live head-to-head and team play are not currently included.</Text>
        </GlassPanel>
      </View>}
      renderItem={({ item, index }) => <GlassPanel style={styles.row}><Text style={styles.rank}>#{index + 1}</Text><Text style={styles.player}>{item.display_name}</Text><MaterialDesignIcons name="star" size={20} color={colors.gold} /><Text style={styles.score}>{item.stars}</Text></GlassPanel>}
      ListEmptyComponent={<GlassPanel style={styles.note}><Text style={styles.noteText}>No leaderboard scores yet. Be the first!</Text></GlassPanel>} />
    <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <ChunkyButton icon="chevron-left" variant="plain" onPress={() => router.replace("/")} /><Text style={styles.title}>Weekly Stars</Text>
    </GlassPanel>
  </View>;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface }, heading: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.onSurfaceTertiary, lineHeight: 19 }, privacy: { fontFamily: fonts.text, fontSize: 11, color: c.onSurfaceTertiary, lineHeight: 15 }, form: { gap: spacing.md, padding: spacing.lg },
  actions: { flexDirection: "row", gap: spacing.sm, width: "100%" }, actionButton: { flex: 1, minWidth: 0 },
  note: { width: "100%", paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, noteText: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.onSurface },
  input: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: spacing.md, color: c.onSurface, backgroundColor: c.surface },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md }, rank: { fontFamily: fonts.display, fontSize: 18, color: c.brand, width: 42 }, player: { flex: 1, fontFamily: fonts.textBold, fontSize: 16, color: c.onSurface }, score: { fontFamily: fonts.display, color: c.onSurface },
}));
