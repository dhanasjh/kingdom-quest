# Kingdom Quest: Match & Rebuild — PRD

## Original problem
Casual match-3 puzzle adventure game (APK + iOS). Swap pieces to match 3+, make specials (Rocket 4-line, Star Bomb L/T, Rainbow Orb 5-line), clear obstacles (crates, ice, vines, locks) within limited moves, earn stars/coins to rebuild a ruined kingdom. State machine: Loading → Ready → Resolving → Checking → Won/Lost → Results → Retry/Kingdom.

## User choices
- MVP: match-3 board, specials, obstacles, Chapter 1 (20 levels), kingdom rebuild screen
- Art: bright storybook fantasy (castle, garden, sunlit ruins)
- Progress on device, no login
- No monetization in MVP (rewarded ads / IAP later)

## Architecture
- Expo Router (stack): `/` Map, `/level/[id]` game, `/kingdom`
- Pure TS engine `src/game/engine.ts`; levels `src/game/levels.ts`; kingdom data `src/game/kingdom.ts`
- Progress context `src/game/progress.tsx` (storage util, key kq_progress_v1): lives (5, +1/20min), coins, stars, best per level, restored tasks, haptics
- Reanimated piece animation, gesture-handler swipe + tap-to-swap, expo-haptics
- No backend used

## Implemented (2026-06)
- 8x8 board, swap/invalid-reverse, cascades, combo banners, auto-shuffle
- Specials + swap combos (rainbow+any, rocket+rocket, bomb+bomb, rocket+bomb)
- Obstacles: ice (1-2 layers), crates (1-2 hp), locks, vines
- 20 levels, objectives, score bar, 1-3 stars, results modal, quit confirm
- Level map with stars/locks, settings (haptics, reset)
- Kingdom: 3 areas × 4 tasks, star costs, sequential unlock, toasts
- Tested: all flows pass (iteration_1)

## Implemented (2026-06, iteration 2)
- Chapters 2 (Royal Garden, L21-40) and 3 (Fairytale Castle, L41-60): 40 harder layouts with 2-layer ice/crates, mixed obstacles, up to 4 objectives
- Map: chapter banners with star totals, header shows current chapter, auto-scroll to current level
- All 60 layouts validated by script; tested (iteration_2) all pass

## Implemented (2026-06, iteration 3)
- Sounds (synthesized SFX + music loop, expo-audio), Settings toggles
- Boosters Hammer/Shuffle (3 free, coins, rewarded ad), glowing hints after 5s idle
- Kingdom: 5 areas / 30 tasks, area completion rewards
- Rewarded ads MOCK (5s placeholder) for +5 moves, +1 life, +1 booster — swap to AdMob in src/ads/RewardedAd.tsx

## Implemented (2026-06, iteration 4)
- 16 chapters × 125 levels = 2000 levels (1-60 handmade, rest deterministic procedural generator with chapter obstacle mixes; every 10th is Hard); all validated by script
- Original AI (Nano Banana) character pieces (boy, strong kid, cat, mouse, princess, dragon) — famous cartoons avoided for copyright
- 16 AI chapter backgrounds; liquid-glass UI (GlassPanel), animated panning backgrounds + sparkles, chunky 3D buttons
- New nav: Home chapter list → /chapter/[id] virtualized level map → /level/[id]
- Tested iteration_4: all pass

## Implemented (2026-06, iteration 5)
- AdMob rewarded ads (react-native-google-mobile-ads, Google TEST IDs in app.json + src/ads/admob.native.ts); falls back to mock in web/Expo Go
- Daily spin wheel (1 free/24h + 1 ad spin/day), auto-opens on home
- Character celebrations on big combos (avatar pop, bubble, piece hop, cheer sfx)
- Coin shop /shop with simulated IAP (src/iap/purchases.ts) incl. Unlock All Chapters; coin-bought boosters
- 18 original characters (3 per color group), roster shuffles per level
- Level board background removed: full animated chapter background visible
- Tested iteration_5: all pass

## Implemented (2026-06, iteration 6)
- RevenueCat IAP (src/iap/rc.native.ts; keys EXPO_PUBLIC_RC_APPLE_KEY / EXPO_PUBLIC_RC_GOOGLE_KEY in .env, empty = simulated in dev only)
- INR prices: ₹50/1000, ₹75/1500, ₹100/2000 coins; booster ₹99; unlock all ₹249; restore purchases
- Hero Collection gallery /heroes (1 hero per 15 levels)
- One-time Starter Pack (₹50) on first loss
- Duolingo-style Daily Quest: streak + win 3 levels + claim 150 coins
- Tested iteration_6: all pass; fixed bottom bar overflow, release free-item fallback, double-claim

## Before publishing (user)
- AdMob: create Android + iOS apps in AdMob (publisher pub-9761067758707256) → put App IDs in app.json plugin and Rewarded unit IDs in src/ads/admob.native.ts
- app-ads.txt: google.com, pub-9761067758707256, DIRECT, f08c47fec0942fa0
- RevenueCat: create products coins_1000, coins_1500, coins_2000, booster_pack, unlock_all, starter_pack + entitlement unlock_all_chapters; add public SDK keys to deployment secrets
- P0 before publish: replace AdMob TEST IDs with real IDs; connect RevenueCat for real IAP
- P1: Real AdMob (needs App IDs + native build)
- P1: Sound effects/music, hint after idle, boosters
- P1: Rewarded ads (extra moves/lives), IAP coin packs
- P2: Cloud save/login, daily rewards, leaderboard, admin level editor

## Launch setup (2026-10)
- Copy `frontend/.env.example` to an ignored local `.env` and provide the AdMob Android/iOS App IDs and rewarded unit IDs, RevenueCat public SDK keys, and deployed backend HTTPS URL.
- Configure App Store Connect and Google Play one-time products matching `coins_1000`, `coins_1500`, `coins_2000`, `booster_pack`, `unlock_all`, and `starter_pack` in RevenueCat. Configure `unlock_all_chapters` entitlement and attach `unlock_all`.
- Build a native development/release client; Expo Go and web do not support real ad views or store charges. Release builds with no live IDs/keys fail closed and grant no ad or purchase rewards.
- Set backend `MONGO_URL` and optional `DB_NAME` before enabling the weekly leaderboard. The leaderboard uses an anonymous device ID and chosen display name; it is competitive by nickname, not an authenticated friends graph.
- Hero powers: each level has one free activation, targeting a row, column, 3×3 blast, or diagonal according to collected hero variant; clears use the board's normal obstacle damage, score, cascades, and objectives.
