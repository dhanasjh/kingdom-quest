import React, { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, { ZoomIn } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { ChapterBackground } from "@/src/components/ChapterBackground";
import { ChunkyButton } from "@/src/components/ChunkyButton";
import { GlassPanel } from "@/src/components/GlassPanel";
import { CHARACTER_NAMES, CHARACTER_POOL, heroUnlockLevel } from "@/src/game/art";
import { chapterOf } from "@/src/game/levels";
import { PIECES } from "@/src/game/pieces";
import { useProgress } from "@/src/game/progress";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const photoDirectory = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}kingdom-quest-characters/` : null;
const photoFilename = (slot: number) => `character-${slot}-${Date.now()}.jpg`;

function removePhotoCopy(uri: string) {
  if (photoDirectory && uri.startsWith(photoDirectory) && /^character-\d+-\d+\.jpg$/.test(uri.slice(photoDirectory.length))) {
    void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}

export default function HeroesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const prog = useProgress();
  const [picking, setPicking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const pickerBusy = useRef(false);
  const mounted = useRef(true);
  const photos = PIECES.map((_, slot) => prog.characterPhotos[slot] ?? null);
  const savedCount = photos.filter(Boolean).length;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const savePhotos = (next: (string | null)[]) => {
    prog.update({ characterPhotos: next });
    for (const uri of new Set(photos)) {
      if (uri && !next.includes(uri)) removePhotoCopy(uri);
    }
  };

  const choosePhoto = async (slot: number) => {
    if (!prog.ready || pickerBusy.current) return;
    pickerBusy.current = true;
    setPicking(true);
    setPhotoMessage("");
    let pendingCopy: string | null = null;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled || !result.assets[0] || !mounted.current) return;
      const pickedUri = result.assets[0].uri;
      if (photoDirectory) {
        await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
        pendingCopy = `${photoDirectory}${photoFilename(slot)}`;
        await FileSystem.copyAsync({ from: pickedUri, to: pendingCopy });
      }
      if (!mounted.current) return;
      const next = [...photos];
      next[slot] = pendingCopy ?? pickedUri;
      savePhotos(next);
      pendingCopy = null;
      setPhotoMessage(`Photo ${slot + 1} saved.`);
    } catch {
      if (mounted.current) setPhotoMessage("Photo not added. Try choosing another image.");
    } finally {
      if (pendingCopy) removePhotoCopy(pendingCopy);
      pickerBusy.current = false;
      if (mounted.current) setPicking(false);
    }
  };

  const clearPhoto = (slot: number) => {
    if (pickerBusy.current) return;
    const next = [...photos];
    next[slot] = null;
    savePhotos(next);
    setPhotoMessage(`Photo ${slot + 1} removed.`);
  };

  const resetPhotos = () => {
    if (pickerBusy.current) return;
    savePhotos(photos.map(() => null));
    setConfirmReset(false);
    setPhotoMessage("All saved photos cleared.");
  };

  const cleared = Math.max(0, prog.unlocked - 1);
  const ids = CHARACTER_POOL.map((_, i) => i);
  const owned = ids.filter((i) => cleared >= heroUnlockLevel(i)).length;
  const size = (Math.min(width, 520) - spacing.lg * 2 - spacing.md * 2) / 3;
  const photoSize = Math.min(Math.floor((Math.min(width, 520) - spacing.lg * 2 - spacing.md * 4 - 4) / 3), 104);
  const photoActionsDisabled = !prog.ready || picking;

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
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <GlassPanel blur={false} strong style={styles.photoPanel}>
              <Text style={styles.title} accessibilityRole="header">Play with your photos</Text>
              <Text style={styles.guide}>Tap Add photo, choose a picture, then match it in a level. You can add up to {PIECES.length} photos.</Text>
              <Text style={styles.note}>Festival packs use their own pieces. Your photos stay on this device. Ask permission before using someone else’s photo.</Text>
              <Text style={styles.slotLabel}>{savedCount} of {PIECES.length} photos saved</Text>
              <View style={styles.photoGrid}>
                {photos.map((uri, slot) => (
                  <View key={slot} style={{ width: photoSize }}>
                    <Pressable
                      testID={`custom-character-slot-${slot}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${uri ? "Change" : "Add"} photo ${slot + 1}`}
                      disabled={photoActionsDisabled}
                      onPress={() => choosePhoto(slot)}
                      onLongPress={uri ? () => clearPhoto(slot) : undefined}
                      style={styles.photoAction}
                    >
                      <View style={[styles.photoTile, { backgroundColor: PIECES[slot].from }]}>
                        {uri ? (
                          <Image source={{ uri }} recyclingKey={uri} style={styles.img} contentFit="cover" />
                        ) : (
                          <MaterialDesignIcons name="image-plus" size={30} color={colors.onSurfaceInverse} />
                        )}
                      </View>
                      <Text style={styles.slotLabel}>{uri ? "Change" : "Add photo"}</Text>
                    </Pressable>
                    {uri ? (
                      <Pressable
                        testID={`remove-character-photo-${slot}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove photo ${slot + 1}`}
                        disabled={photoActionsDisabled}
                        onPress={() => clearPhoto(slot)}
                        style={styles.removePhoto}
                      >
                        <Text style={styles.removeLabel}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
              {savedCount > 0 ? (
                <ChunkyButton testID="reset-character-photos" label="Reset photos" icon="restore" variant="plain" disabled={photoActionsDisabled} onPress={() => setConfirmReset(true)} />
              ) : null}
              {photoMessage ? <Text style={styles.guide} accessibilityLiveRegion="polite">{photoMessage}</Text> : null}
            </GlassPanel>
            <GlassPanel blur={false} strong style={styles.collectionTitle}>
              <Text style={styles.title} accessibilityRole="header">Hero Collection</Text>
            </GlassPanel>
          </View>
        }
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
        <ChunkyButton testID="heroes-back-button" icon="chevron-left" accessibilityLabel="Back to the kingdom" variant="plain" onPress={() => router.replace("/")} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Photos &amp; Heroes</Text>
          <Text style={styles.small} testID="heroes-owned">{owned}/{ids.length} heroes collected</Text>
        </View>
      </GlassPanel>
      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.scrim}>
          <View style={styles.resetDialog} accessibilityViewIsModal>
            <Text style={styles.title} accessibilityRole="header">Reset your photos?</Text>
            <Text style={styles.guide}>Remove all saved photos from Kingdom Quest. Standard levels will use the original hero pieces again.</Text>
            <ChunkyButton testID="confirm-reset-character-photos" label="Reset photos" icon="restore" onPress={resetPhotos} />
            <ChunkyButton testID="cancel-reset-character-photos" label="Keep photos" variant="plain" onPress={() => setConfirmReset(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { position: "absolute", top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  photoPanel: { padding: spacing.md, gap: spacing.md },
  guide: { fontFamily: fonts.text, fontSize: 15, lineHeight: 20, color: c.onSurface },
  note: { fontFamily: fonts.text, fontSize: 13, lineHeight: 18, color: c.onSurfaceTertiary },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.md },
  photoAction: { alignItems: "center", gap: spacing.xs },
  photoTile: { width: "100%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.glassBorder },
  slotLabel: { fontFamily: fonts.textBold, fontSize: 14, color: c.onSurface },
  removePhoto: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  removeLabel: { fontFamily: fonts.textBold, fontSize: 13, color: c.onSurfaceTertiary, textDecorationLine: "underline" },
  collectionTitle: { padding: spacing.md },
  scrim: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  resetDialog: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  card: { alignItems: "center", padding: spacing.sm, gap: 4, ...lifted(c) },
  avatar: { borderRadius: radius.lg, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.glassBorder },
  img: { width: "100%", height: "100%" },
  name: { fontFamily: fonts.display, fontSize: 13, color: c.onSurface },
  small: { fontFamily: fonts.textBold, fontSize: 10, color: c.onSurfaceTertiary },
}));
