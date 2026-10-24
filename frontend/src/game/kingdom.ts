export type KingdomTask = { id: string; title: string; cost: number; icon: string };
export type KingdomArea = { id: string; name: string; image: string; tasks: KingdomTask[] };

export const AREAS: KingdomArea[] = [
  {
    id: "ruins",
    name: "Sunlit Ruins",
    image: "https://images.unsplash.com/photo-1558009438-08741661aa21?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    tasks: [
      { id: "ruins-rubble", title: "Clear the rubble", cost: 2, icon: "shovel" },
      { id: "ruins-arch", title: "Restore the archway", cost: 2, icon: "gate-arrow-right" },
      { id: "ruins-lantern", title: "Light the old lantern", cost: 3, icon: "lightbulb-on" },
      { id: "ruins-lavender", title: "Plant lavender by the path", cost: 3, icon: "flower-tulip" },
    ],
  },
  {
    id: "garden",
    name: "Royal Garden",
    image: "https://images.pexels.com/photos/38057081/pexels-photo-38057081.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    tasks: [
      { id: "garden-hedges", title: "Trim the wild hedges", cost: 3, icon: "content-cut" },
      { id: "garden-bench", title: "Fix the wooden bench", cost: 3, icon: "seat" },
      { id: "garden-basket", title: "Fill the flower basket", cost: 4, icon: "basket" },
      { id: "garden-gate", title: "Repair the garden gate", cost: 4, icon: "gate" },
      { id: "garden-fountain", title: "Restore the stone fountain", cost: 4, icon: "fountain" },
      { id: "garden-roses", title: "Plant the rose arbor", cost: 5, icon: "flower-poppy" },
      { id: "garden-greenhouse", title: "Rebuild the greenhouse", cost: 5, icon: "greenhouse" },
    ],
  },
  {
    id: "castle",
    name: "Fairytale Castle",
    image: "https://images.unsplash.com/photo-1562937778-deb2b7bf3eb2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    tasks: [
      { id: "castle-bridge", title: "Mend the river bridge", cost: 4, icon: "bridge" },
      { id: "castle-banners", title: "Raise the royal banners", cost: 5, icon: "flag-variant" },
      { id: "castle-towers", title: "Polish the tall towers", cost: 5, icon: "castle" },
      { id: "castle-clock", title: "Wind the great clock", cost: 5, icon: "clock-outline" },
      { id: "castle-throne", title: "Restore the throne room", cost: 6, icon: "sofa-single" },
      { id: "castle-windows", title: "Fix the stained-glass windows", cost: 6, icon: "window-closed-variant" },
      { id: "castle-crown", title: "Crown the castle keep", cost: 7, icon: "crown" },
    ],
  },
  {
    id: "forest",
    name: "Enchanted Forest",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80",
    tasks: [
      { id: "forest-path", title: "Clear the misty path", cost: 5, icon: "pine-tree" },
      { id: "forest-lanterns", title: "Hang the firefly lanterns", cost: 6, icon: "lightbulb-group" },
      { id: "forest-mushrooms", title: "Grow the glowing mushrooms", cost: 6, icon: "mushroom" },
      { id: "forest-treehouse", title: "Build the owl treehouse", cost: 7, icon: "home-variant" },
      { id: "forest-well", title: "Restore the wishing well", cost: 7, icon: "water-well" },
      { id: "forest-shrine", title: "Awaken the ancient shrine", cost: 8, icon: "auto-fix" },
    ],
  },
  {
    id: "lake",
    name: "Crystal Lake",
    image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&q=80",
    tasks: [
      { id: "lake-dock", title: "Repair the wooden dock", cost: 6, icon: "pier" },
      { id: "lake-boats", title: "Paint the rowing boats", cost: 7, icon: "rowing" },
      { id: "lake-lilies", title: "Plant the water lilies", cost: 7, icon: "flower" },
      { id: "lake-lighthouse", title: "Light the lake lighthouse", cost: 8, icon: "lighthouse" },
      { id: "lake-pavilion", title: "Build the crystal pavilion", cost: 8, icon: "diamond-stone" },
      { id: "lake-swans", title: "Welcome back the swans", cost: 9, icon: "bird" },
    ],
  },
];

export const AREA_REWARD = { coins: 200, hammers: 1, shuffles: 1 };

export const areaUnlocked = (index: number, restored: string[]) =>
  index === 0 || AREAS[index - 1].tasks.every((t) => restored.includes(t.id));
