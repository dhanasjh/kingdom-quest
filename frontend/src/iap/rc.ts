// Web preview has no native store, so purchases are unavailable.
export const rcAvailable = () => false;
export async function rcBuy(_id: string): Promise<boolean | null> {
  return null;
}
export async function rcRestoreUnlock(): Promise<boolean | null> {
  return null;
}
export async function rcRestorePurchases(): Promise<boolean> {
  return false;
}
