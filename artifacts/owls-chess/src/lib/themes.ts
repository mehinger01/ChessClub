export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  highlightColor: string;
  description: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "royal",
    name: "Royal Owl",
    lightSquare: "#f1f5f9",
    darkSquare: "#1a365d",
    highlightColor: "rgba(255, 235, 100, 0.4)",
    description: "The classic Owls colors — royal blue and parchment.",
  },
  {
    id: "forest",
    name: "Forest",
    lightSquare: "#eee8d5",
    darkSquare: "#3d6b3a",
    highlightColor: "rgba(255, 217, 102, 0.45)",
    description: "Calm green tones — easy on the eyes.",
  },
  {
    id: "slate",
    name: "Slate",
    lightSquare: "#e5e7eb",
    darkSquare: "#374151",
    highlightColor: "rgba(96, 165, 250, 0.45)",
    description: "Neutral charcoal and silver.",
  },
  {
    id: "parchment",
    name: "Parchment",
    lightSquare: "#f5e9c8",
    darkSquare: "#8b5a2b",
    highlightColor: "rgba(255, 235, 100, 0.45)",
    description: "Warm wood tones — old library feel.",
  },
  {
    id: "highContrast",
    name: "High Contrast",
    lightSquare: "#ffffff",
    darkSquare: "#000000",
    highlightColor: "rgba(255, 215, 0, 0.6)",
    description: "Maximum contrast for accessibility and projectors.",
  },
];

export function getTheme(id: string): BoardTheme {
  return BOARD_THEMES.find(t => t.id === id) ?? BOARD_THEMES[0];
}
