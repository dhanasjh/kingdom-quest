// Real Google AdMob rewarded ads (native builds only).
// Real unit IDs come from EXPO_PUBLIC_ADMOB_*_REWARDED_ID; development builds use Google test units.
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const TEST_UNIT = Platform.select({
  ios: "ca-app-pub-3940256099942544/1712485313",
  default: "ca-app-pub-3940256099942544/5224354917",
});
const REAL_UNIT = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID || undefined,
  default: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID || "ca-app-pub-9761067758707256/1063963280",
});
const REWARDED_UNIT_ID = __DEV__ ? TEST_UNIT : REAL_UNIT;

let initialized: Promise<unknown> | null = null;

function nativeModule(): any | null {
  // Expo Go does not include the native module.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

// Resolves true if reward earned, false if dismissed/failed, null if AdMob unavailable.
export async function showNativeRewarded(): Promise<boolean | null> {
  if (!REWARDED_UNIT_ID) return null;
  const ads = nativeModule();
  if (!ads) return null;
  try {
    initialized ??= ads.default().initialize();
    await initialized;
    const rewarded = ads.RewardedAd.createForAdRequest(REWARDED_UNIT_ID);
    const { AdEventType, RewardedAdEventType } = ads;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let earned = false;
      const subs: (() => void)[] = [];
      const finish = (v: boolean) => {
        if (settled) return;
        settled = true;
        subs.forEach((u) => u());
        resolve(v);
      };
      subs.push(
        rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
          rewarded.show().catch(() => finish(false));
        }),
        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        rewarded.addAdEventListener(AdEventType.CLOSED, () => finish(earned)),
        rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false)),
      );
      rewarded.load();
      setTimeout(() => finish(earned), 45000);
    });
  } catch {
    return null;
  }
}
