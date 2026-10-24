// In-app purchases use App Store / Google Play products through RevenueCat.
export type Product = {
  id: string;
  title: string;
  desc: string;
  price: string;
  icon: string;
  badge?: string;
  coins?: number;
  hammers?: number;
  shuffles?: number;
  lives?: number;
  unlockAll?: boolean;
};

// Store product IDs below must match App Store Connect / Google Play Console + RevenueCat.
// Prices shown are defaults; the store charges the price configured in its console.
import { rcBuy } from "@/src/iap/rc";

export const PRODUCTS: Product[] = [
  { id: "coins_1000", title: "Pouch of Coins", desc: "1,000 coins", price: "₹50", icon: "circle-multiple", coins: 1000 },
  { id: "coins_1500", title: "Bag of Coins", desc: "1,500 coins", price: "₹75", icon: "sack", coins: 1500, badge: "Popular" },
  { id: "coins_2000", title: "Chest of Coins", desc: "2,000 coins", price: "₹100", icon: "treasure-chest", coins: 2000, badge: "Best value" },
  { id: "booster_pack", title: "Hero Booster Pack", desc: "5 Hammers, 5 Shuffles, 5 Lives", price: "₹99", icon: "gift", hammers: 5, shuffles: 5, lives: 5 },
  { id: "unlock_all", title: "Unlock All Chapters", desc: "Jump into all 16 chapters right away", price: "₹249", icon: "lock-open-variant", unlockAll: true, badge: "Forever" },
];

export const STARTER_PACK: Product = {
  id: "starter_pack", title: "Starter Pack", desc: "1,000 coins + 3 Hammers + 3 Shuffles + 3 Lives", price: "₹50", icon: "rocket-launch", coins: 1000, hammers: 3, shuffles: 3, lives: 3, badge: "80% OFF",
};

export async function purchase(product: Product): Promise<boolean> {
  return (await rcBuy(product.id)) === true;
}
