// Real App Store / Google Play purchases via RevenueCat (native builds only).
// Keys: EXPO_PUBLIC_RC_APPLE_KEY / EXPO_PUBLIC_RC_GOOGLE_KEY (public SDK keys).
// If a key is missing or running in Expo Go, purchases remain unavailable.
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

export const UNLOCK_ENTITLEMENT = "unlock_all_chapters";
let configured = false;

function mod(): any | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return require("react-native-purchases");
  } catch {
    return null;
  }
}

const apiKey = () => (Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_APPLE_KEY : Platform.OS === "android" ? process.env.EXPO_PUBLIC_RC_GOOGLE_KEY : undefined);

function sdk(): any | null {
  const P = mod();
  const k = apiKey();
  if (!P || !k) return null;
  if (!configured) {
    P.default.configure({ apiKey: k });
    configured = true;
  }
  return P;
}

export const rcAvailable = () => !!mod() && !!apiKey();

// true = paid, false = cancelled, failed, or unavailable
export async function rcBuy(productId: string): Promise<boolean | null> {
  if (!mod()) return false;
  const P = sdk();
  // Native build without store keys: never hand out free items in release.
  if (!P) return false;
  try {
    const [product] = await P.default.getProducts([productId], P.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    if (!product) return false;
    await P.default.purchaseStoreProduct(product);
    return true;
  } catch {
    return false;
  }
}

export async function rcRestoreUnlock(): Promise<boolean | null> {
  const P = sdk();
  if (!P) return null;
  try {
    const info = await P.default.restorePurchases();
    return !!info.entitlements.active[UNLOCK_ENTITLEMENT];
  } catch {
    return false;
  }
}
export async function rcRestorePurchases(): Promise<boolean> {
  const P = sdk();
  if (!P) return false;
  try { await P.default.restorePurchases(); return true; } catch { return false; }
}

