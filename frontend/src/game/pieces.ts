// Piece art: original AI-generated characters (fixed colors, identical across themes by design).
export type PieceStyle = { name: string; icon: string; from: string; to: string };

export const PIECES: PieceStyle[] = [
  { name: "Cheeky Boy", icon: "emoticon-tongue", from: "#F04A3E", to: "#B8231B" },
  { name: "Strong Kid", icon: "arm-flex", from: "#FF8A1F", to: "#D35F00" },
  { name: "Cat", icon: "cat", from: "#FFC61A", to: "#D89A00" },
  { name: "Mouse", icon: "rodent", from: "#43C82E", to: "#23901A" },
  { name: "Princess", icon: "crown", from: "#FF8A8A", to: "#E0525A" },
  { name: "Dragon", icon: "dragon", from: "#3A3A3A", to: "#1B1B1B" },
];

export const RAINBOW = ["#FF6B6B", "#FFD166", "#06D6A0", "#FF9F1C", "#FF7A59"] as const;

export const SPECIAL_ICON: Record<string, string> = {
  rocketH: "arrow-left-right-bold",
  rocketV: "arrow-up-down-bold",
  bomb: "bomb",
  rainbow: "creation",
};

export const OBJECTIVE_ICON: Record<string, string> = {
  ice: "snowflake",
  crate: "package-variant-closed",
  lock: "lock",
  vine: "grass",
  score: "star",
};
