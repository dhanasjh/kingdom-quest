import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { File, Paths } from "expo-file-system";

import { ChapterBackground } from "@/src/components/ChapterBackground";
import { ChunkyButton } from "@/src/components/ChunkyButton";
import { CurrencyPill } from "@/src/components/CurrencyPill";
import { GlassPanel } from "@/src/components/GlassPanel";
import { BOOSTER_INFO, BoosterKind } from "@/src/components/BoosterShop";
import { PRODUCTS, Product, purchase } from "@/src/iap/purchases";
import { rcAvailable, rcRestorePurchases, rcRestoreUnlock } from "@/src/iap/rc";
import { chapterOf } from "@/src/game/levels";
import { todayKey, useProgress } from "@/src/game/progress";
import { playSfx } from "@/src/game/sound";
import { fonts, lifted, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { FESTIVAL_PACKS, FestivalId } from "@/src/game/festivals";
import { useRewardedAd } from "@/src/ads/RewardedAd";
import { CUSTOM_MUSIC_UNLOCK_COST, MUSIC_PACKS, SOUND_PACKS } from "@/src/game/musicPacks";

export default function ShopScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prog = useProgress();
  const showAd = useRewardedAd();
  const [pending, setPending] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [rewardBusy, setRewardBusy] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const rewardLock = useRef(false);
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
    prog.grant(k === "hammer" ? { hammers: 1 } : k === "shuffle" ? { shuffles: 1 } : { snakes: 1 });
    playSfx("coin");
    setToast(`+1 ${BOOSTER_INFO[k].name}`);
  };

  const buyFestivalPack = (id: FestivalId, cost: number) => {
    if (prog.unlockedFestivals.includes(id)) {
      prog.update({ activeFestival: prog.activeFestival === id ? null : id });
      setToast(prog.activeFestival === id ? "Default tiles restored" : "Festival tiles equipped");
      return;
    }
    if (!prog.spendCoins(cost)) { setToast("Not enough coins for this festival pack"); return; }
    prog.update({ unlockedFestivals: [...prog.unlockedFestivals, id], activeFestival: id });
    playSfx("jackpot");
    setToast("Festival pack unlocked and equipped!");
  };

  const chooseMusicPack = (id: string, track: number, cost: number) => {
    const unlocked = prog.unlockedMusicPacks.includes(id);
    if (!unlocked) {
      if (!prog.spendCoins(cost)) { setToast("Not enough coins for this music pack"); return; }
      prog.update({ unlockedMusicPacks: [...prog.unlockedMusicPacks, id], musicTrack: track, customMusicUri: null, customMusicName: "" });
      playSfx("jackpot");
      setToast("Music pack unlocked and playing!");
      return;
    }
    prog.update({ musicTrack: track, customMusicUri: null, customMusicName: "" });
    playSfx("tap");
    setToast("Music changed");
  };

  const chooseSoundPack = (id: string, cost: number) => {
    if (!prog.unlockedSoundPacks.includes(id)) {
      if (!prog.spendCoins(cost)) { setToast("Not enough coins for this sound pack"); return; }
      prog.update({ unlockedSoundPacks: [...prog.unlockedSoundPacks, id], activeSoundPack: id });
      playSfx("jackpot");
      setToast("Match sound pack unlocked!");
      return;
    }
    prog.update({ activeSoundPack: id });
    playSfx(id === "sparkle" ? "festivalChime" : "pop");
    setToast("Match sounds changed");
  };

  const unlockCustomMusic = () => {
    if (prog.customMusicUnlocked) return;
    if (!prog.spendCoins(CUSTOM_MUSIC_UNLOCK_COST)) { setToast("Not enough coins to unlock your music player"); return; }
    prog.update({ customMusicUnlocked: true });
    playSfx("jackpot");
    setToast("Your music player is unlocked");
  };

  const pickCustomMusic = async () => {
    if (!prog.customMusicUnlocked || musicBusy) return;
    setMusicBusy(true);
    try {
      const selected = await File.pickFileAsync({ mimeTypes: ["audio/*"] });
      if (selected.canceled) return;
      const source = selected.result;
      const ext = source.extension.toLowerCase();
      if (![".mp3", ".m4a", ".wav", ".aac", ".ogg"].includes(ext)) {
        setToast("Choose an MP3, M4A, WAV, AAC, or OGG audio file");
        return;
      }
      if (source.size > 20 * 1024 * 1024) {
        setToast("Choose a music file under 20 MB");
        return;
      }
      const destination = new File(Paths.document, `kingdom-quest-custom-music${ext}`);
      await source.copy(destination, { overwrite: true });
      prog.update({ customMusicUri: destination.uri, customMusicName: source.name, musicTrack: 0 });
      setToast("Your music is saved only on this device");
    } catch {
      setToast("Could not import that audio file. Try another file.");
    } finally {
      setMusicBusy(false);
    }
  };

  const useBundledMusic = () => {
    prog.update({ customMusicUri: null, customMusicName: "" });
    setToast("Kingdom Quest music restored");
  };

  const earnByAd = async (kind: "coins" | "booster") => {
    const available = kind === "coins" ? prog.adCoinsReady : prog.adBoosterReady;
    if (!available || rewardLock.current) return;
    rewardLock.current = true;
    setRewardBusy(true);
    try {
      const watched = await showAd(kind === "coins" ? "shop-coins" : "shop-booster");
      if (!watched) {
        setToast("No rewarded ad completed. Try again later.");
        return;
      }
      prog.markAdReward(kind);
      if (kind === "coins") {
        prog.grant({ coins: 100 });
        setToast("You earned 100 coins!");
      } else {
        prog.grant({ hammers: 1, shuffles: 1 });
        setToast("You earned a Hammer and a Shuffle!");
      }
    } finally {
      rewardLock.current = false;
      setRewardBusy(false);
    }
  };

  const today = todayKey();
  const streakRewardReady = prog.streak >= 3 && prog.lastPlayDay === today && prog.streakRewardDay !== today;
  const streakRewardClaimed = prog.streakRewardDay === today;

  return (
    <View style={styles.root}>
      <ChapterBackground chapter={chapterOf(Math.max(1, prog.unlocked))} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 96, paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Text style={styles.section}>Coins & Packs</Text>
        {!rcAvailable() ? <Text style={styles.purchaseInfo} testID="purchase-setup-note">Real-money purchases need a native Android build with the RevenueCat key and matching Play products. Finish setup in Play Console and RevenueCat, then install the internal-test build from Google Play.</Text> : null}
        <GlassPanel blur={false} strong style={styles.earnCard} testID="rewarded-ads-card">
          <Text style={styles.title}>Free rewards</Text>
          <Text style={styles.desc}>Watch an optional rewarded ad to earn coins for festival packs or a pair of boosters. Ads do not unlock paid chapters.</Text>
          <View style={styles.row}>
            <ChunkyButton testID="earn-coins-ad" label={rewardBusy ? "Loading ad…" : prog.adCoinsReady ? "+100 coins" : "Coins claimed today"} icon="play-box" variant="secondary" disabled={rewardBusy || !prog.adCoinsReady} onPress={() => earnByAd("coins")} />
            <ChunkyButton testID="earn-booster-ad" label={rewardBusy ? "Loading ad…" : prog.adBoosterReady ? "Boosters" : "Boosters claimed"} icon="play-box" variant="primary" disabled={rewardBusy || !prog.adBoosterReady} onPress={() => earnByAd("booster")} />
          </View>
        </GlassPanel>
        <GlassPanel blur={false} strong style={styles.earnCard} testID="streak-reward-card">
          <View style={styles.row}>
            <MaterialDesignIcons name="fire" size={27} color={colors.brand} />
            <Text style={styles.title}>Play streak bonus</Text>
          </View>
          <Text style={styles.desc}>Keep a 3-day streak and win a level today to claim 50 bonus coins once per day. Your streak reward is free.</Text>
          <ChunkyButton
            testID="claim-streak-bonus"
            label={streakRewardClaimed ? "Claimed today" : streakRewardReady ? "+50 streak coins" : `Current streak · ${prog.streak} days`}
            icon={streakRewardClaimed ? "check-circle" : "circle-multiple"}
            variant="secondary"
            disabled={!streakRewardReady}
            onPress={() => {
              if (prog.claimStreakBonus()) {
                playSfx("jackpot");
                prog.haptic("success");
                setToast("You earned 50 streak coins!");
              }
            }}
          />
        </GlassPanel>
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
                <ChunkyButton testID={`buy-${p.id}`} label={owned ? "Owned" : rcAvailable() ? p.price : "Unavailable"} variant={owned || !rcAvailable() ? "plain" : "brand"} disabled={!!owned || !rcAvailable()} onPress={() => setPending(p)} />
              </GlassPanel>
            </Animated.View>
          );
        })}
        <Text style={styles.section}>Festival Tile Packs</Text>
        <Text style={styles.desc}>Unlock each celebration with coins, then equip it whenever you like.</Text>
        {FESTIVAL_PACKS.map((pack) => {
          const unlocked = prog.unlockedFestivals.includes(pack.id);
          const active = prog.activeFestival === pack.id;
          return <GlassPanel key={pack.id} blur={false} strong style={styles.festivalCard} testID={`festival-pack-${pack.id}`}>
            <Text style={styles.festivalPreview}>{pack.tiles.slice(0, 4).join("  ")}</Text>
            <View style={{ flex: 1 }}><Text style={styles.title}>{pack.title}</Text><Text style={styles.desc}>{pack.cost} coins · {unlocked ? active ? "Equipped" : "Unlocked" : "One-time unlock"}</Text></View>
            <ChunkyButton label={active ? "Equipped" : unlocked ? "Equip" : `${pack.cost}`} variant={active ? "plain" : "secondary"} icon={unlocked && !active ? "check" : undefined} onPress={() => buyFestivalPack(pack.id, pack.cost)} disabled={!unlocked && prog.coins < pack.cost} />
          </GlassPanel>;
        })}
        <Text style={styles.section}>Music & Match Sounds</Text>
        <Text style={styles.desc}>Unlock original music and sound themes with coins. Imported music is copied into private app storage and is never uploaded.</Text>
        {MUSIC_PACKS.map((pack) => {
          const unlocked = prog.unlockedMusicPacks.includes(pack.id);
          const active = !prog.customMusicUri && prog.musicTrack === pack.track;
          return <GlassPanel key={pack.id} blur={false} strong style={styles.festivalCard} testID={`music-pack-${pack.id}`}>
            <Text style={styles.musicIcon}>{pack.icon}</Text>
            <View style={{ flex: 1 }}><Text style={styles.title}>{pack.title}</Text><Text style={styles.desc}>{pack.mood}</Text></View>
            <ChunkyButton label={active ? "Playing" : unlocked ? "Play" : `${pack.cost} coins`} variant={active ? "plain" : "secondary"} disabled={active || (!unlocked && prog.coins < pack.cost)} onPress={() => chooseMusicPack(pack.id, pack.track, pack.cost)} />
          </GlassPanel>;
        })}
        {SOUND_PACKS.map((pack) => {
          const unlocked = prog.unlockedSoundPacks.includes(pack.id);
          const active = prog.activeSoundPack === pack.id;
          return <GlassPanel key={pack.id} blur={false} strong style={styles.festivalCard} testID={`sound-pack-${pack.id}`}>
            <Text style={styles.musicIcon}>{pack.id === "sparkle" ? "🔔" : "🎵"}</Text>
            <View style={{ flex: 1 }}><Text style={styles.title}>{pack.title}</Text><Text style={styles.desc}>{pack.description}</Text></View>
            <ChunkyButton label={active ? "Active" : unlocked ? "Use" : `${pack.cost} coins`} variant={active ? "plain" : "secondary"} disabled={active || (!unlocked && prog.coins < pack.cost)} onPress={() => chooseSoundPack(pack.id, pack.cost)} />
          </GlassPanel>;
        })}
        <GlassPanel blur={false} strong style={styles.earnCard} testID="custom-music-card">
          <Text style={styles.title}>Use your own music</Text>
          <Text style={styles.desc}>Unlock once for {CUSTOM_MUSIC_UNLOCK_COST} coins, then choose one audio file stored privately on this device.</Text>
          {prog.customMusicName ? <Text style={styles.desc} numberOfLines={1}>Selected: {prog.customMusicName}</Text> : null}
          <View style={styles.row}>
            {!prog.customMusicUnlocked ? <ChunkyButton label={`${CUSTOM_MUSIC_UNLOCK_COST} coins`} icon="lock-open-variant" variant="secondary" disabled={prog.coins < CUSTOM_MUSIC_UNLOCK_COST} onPress={unlockCustomMusic} /> : <ChunkyButton label={musicBusy ? "Opening…" : "Choose audio file"} icon="music-note-plus" variant="secondary" disabled={musicBusy} onPress={pickCustomMusic} />}
            {prog.customMusicUri ? <ChunkyButton label="Use game music" icon="music-note" variant="plain" onPress={useBundledMusic} /> : null}
          </View>
        </GlassPanel>
        <Text style={styles.section}>Spend Coins</Text>
        {(["hammer", "shuffle", "snake"] as BoosterKind[]).map((k) => (
          <GlassPanel key={k} blur={false} strong style={styles.card} testID={`coin-item-${k}`}>
            <View style={[styles.icon, { backgroundColor: colors.brandPrimary }]}>
              <MaterialDesignIcons name={BOOSTER_INFO[k].icon as any} size={30} color={colors.onSurfaceInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{BOOSTER_INFO[k].name}</Text>
              <Text style={styles.desc}>You have {k === "hammer" ? prog.hammers : k === "shuffle" ? prog.shuffles : prog.snakes}{k === "snake" ? " · hard levels only" : ""}</Text>
            </View>
            <ChunkyButton testID={`coin-buy-${k}`} label={`${BOOSTER_INFO[k].cost}`} icon="circle-multiple" variant="secondary" disabled={prog.coins < BOOSTER_INFO[k].cost} onPress={() => buyBooster(k)} />
          </GlassPanel>
        ))}
        <ChunkyButton testID="restore-purchases-button" label="Restore purchases" icon="restore" variant="plain" onPress={restore} />
      </ScrollView>

      <GlassPanel style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="shop-header">
        <ChunkyButton testID="shop-back-button" icon="chevron-left" variant="plain" onPress={() => router.replace("/")} />
        <Text style={[styles.title, { flex: 1, fontSize: 26 }]}>Shop</Text>
        <CurrencyPill testID="shop-coins" icon="circle-multiple" iconColor={colors.gold} value={prog.coins} />
      </GlassPanel>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => !busy && setPending(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modal} testID="purchase-confirm-modal">
            <Text style={styles.title}>{pending?.title}</Text>
            <Text style={styles.desc}>{pending?.desc}</Text>
            {!rcAvailable() ? (
              <Text style={[styles.desc, { color: colors.brand }]} testID="purchase-test-note">This build cannot make store purchases yet. Configure the Android key and active matching products in RevenueCat and Play Console, then install the internal-test build from Google Play.</Text>
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
  purchaseInfo: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.onSurface, backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md },
  earnCard: { padding: spacing.md, gap: spacing.sm },
  festivalCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, ...lifted(c) },
  festivalPreview: { fontSize: 23, width: 92, textAlign: "center" },
  musicIcon: { fontSize: 32, width: 48, textAlign: "center" },
  badge: { fontFamily: fonts.textBold, fontSize: 11, color: c.onError, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden" },
  backdrop: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, alignItems: "center" },
  toast: { position: "absolute", left: spacing.lg, right: spacing.lg, backgroundColor: c.surfaceInverse, borderRadius: radius.md, padding: spacing.lg },
  toastText: { fontFamily: fonts.textBold, fontSize: 15, color: c.onSurfaceInverse, textAlign: "center" },
}));
