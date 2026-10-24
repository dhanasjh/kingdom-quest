import React from "react";
import { FlatList, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, { ZoomIn } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { ChapterBackground } from "@/src/components/ChapterBackground";
import { ChunkyButton } from "@/src/components/ChunkyButton";
import { GlassPanel } from "@/src/components/GlassPanel";
import { CHARACTER_NAMES, CHARACTER_POOL, heroUnlockLevel } from "@/src/game/art";
import { chapterOf } from "@/src/game/levels";
import { PIECES } from "@/src/game/pieces";
import { useProgress } from "@/src/game/progress";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function HeroesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const prog = useProgress();
  const cleared = Math.max(0, prog.unlocked - 1);
  const ids = CHARACTER_POOL.map((_, i) => i);
  const owned = ids.filter((i) => cleared >= heroUnlockLevel(i)).length;
  const size = (Math.min(width, 520) - spacing.lg * 2 - spacing.md * 2) / 3;

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={chapterOf(Math.max(1, prog.unlocked))} />
      <FlatList
        testID="heroes-grid"
        data={ids}
        numColumns={3}
        keyExtractor={(i) => String(i)}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ paddingTop: insets.top + 110, paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md }}
        renderItem={({ item: i, index }) => {
          const need = heroUnlockLevel(i);
          const open = cleared >= need;
          return (
            <Animated.View entering={ZoomIn.delay(index * 40).springify()} style={{ width: size }}>
              <GlassPanel blur={false} strong style={styles.card} testID={`hero-card-${i}`}>
                <View style={[styles.avatar, { width: size - 20, height: size - 20, backgroundColor: PIECES[Math.floor(i / 3)].from }]}>
                  <Image source={CHARACTER_POOL[i]} style={[styles.img, !open && { opacity: 0.15 }]} contentFit="cover" />
                  {!open ? <MaterialDesignIcons name="lock" size={30} color={colors.onSurfaceInverse} style={{ position: "absolute" }} /> : null}
                </View>
                <Text style={styles.name} numberOfLines={1}>{open ? CHARACTER_NAMES[i] : "???"}</Text>
                <Text style={styles.small} testID={`hero-status-${i}`}>{open ? `Power: ${["Clear a row", "Clear a column", "Blast a 3×3 area", "Clear a diagonal"][i % 4]}` : `Clear ${need} levels`}</Text>
              </GlassPanel>
            </Animated.View>
          );
        }}
      />
      <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="heroes-header">
        <ChunkyButton testID="heroes-back-button" icon="chevron-left" variant="plain" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hero Collection</Text>
          <Text style={styles.small} testID="heroes-owned">{owned}/{ids.length} heroes collected</Text>
        </View>
      </GlassPanel>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  card: { alignItems: "center", padding: spacing.sm, gap: 4, ...lifted(c) },
  avatar: { borderRadius: radius.lg, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.glassBorder },
  img: { width: "100%", height: "100%" },
  name: { fontFamily: fonts.display, fontSize: 13, color: c.onSurface },
  small: { fontFamily: fonts.textBold, fontSize: 10, color: c.onSurfaceTertiary },
}));
