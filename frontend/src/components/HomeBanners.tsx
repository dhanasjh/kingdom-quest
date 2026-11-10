import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { GlassPanel } from "@/src/components/GlassPanel";
import { FESTIVAL_PACKS } from "@/src/game/festivals";
import { playSfx } from "@/src/game/sound";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

export function FestivalBanner({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const festivalEmojis = FESTIVAL_PACKS.map((pack) => pack.tiles[0]).slice(0, 8).join("  ");
  return (
    <Pressable testID="festival-banner" onPress={() => { playSfx("tap"); onPress(); }} accessibilityRole="button" accessibilityLabel="Explore festival tile packs in the shop">
      <GlassPanel blur={false} strong style={styles.banner}>
        <View style={[styles.icon, { backgroundColor: colors.brandSecondary }]}><MaterialDesignIcons name="party-popper" size={25} color={colors.onBrandSecondary} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title}>Festival celebrations</Text>
          <Text style={styles.body}>Unlock colorful Diwali, Holi, Eid, Christmas & more packs with coins.</Text>
          <Text style={styles.emojis}>{festivalEmojis}</Text>
        </View>
        <MaterialDesignIcons name="chevron-right" size={28} color={colors.brand} />
      </GlassPanel>
    </Pressable>
  );
}

export function MakeItYoursBanner({ hasPhotos, onPress }: { hasPhotos: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const action = hasPhotos ? "Manage photos" : "Add your photos";
  return (
    <Pressable testID="make-it-yours-banner" onPress={() => { playSfx("tap"); onPress(); }} accessibilityRole="button" accessibilityLabel={action} accessibilityHint="Turn personal photos into puzzle pieces">
      <GlassPanel blur={false} strong style={[styles.banner, styles.photoBanner]}>
        <View style={[styles.icon, { backgroundColor: colors.brandPrimary }]}><MaterialDesignIcons name="image-multiple" size={28} color={colors.onSurface} /></View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={styles.title}>Play with your photos</Text>
          <Text style={styles.body}>Turn pictures of family, friends, or pets into puzzle pieces.</Text>
          <View style={styles.photoCta}>
            <Text style={styles.photoCtaText}>{action}</Text>
            <MaterialDesignIcons name="chevron-right" size={20} color={colors.onBrandSecondary} />
          </View>
        </View>
      </GlassPanel>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  body: { fontFamily: fonts.text, fontSize: 12, lineHeight: 16, color: c.onSurfaceTertiary },
  emojis: { fontFamily: fonts.textBold, fontSize: 13, color: c.onSurfaceTertiary },
  photoBanner: { borderColor: c.brandPrimary, borderWidth: 2 },
  photoCta: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: 12, backgroundColor: c.brandSecondary, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  photoCtaText: { flexShrink: 1, fontFamily: fonts.textBold, fontSize: 14, color: c.onBrandSecondary },
}));
