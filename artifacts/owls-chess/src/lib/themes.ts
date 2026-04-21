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

import { listCustomThemes } from "./custom-assets";

export function getAllThemes(): BoardTheme[] {
  const customs: BoardTheme[] = listCustomThemes().map(c => ({
    id: c.id,
    name: c.name + " (custom)",
    lightSquare: c.lightSquare,
    darkSquare: c.darkSquare,
    highlightColor: c.highlightColor,
    description: "Custom theme defined by your school admin.",
  }));
  return [...BOARD_THEMES, ...customs];
}

export function getTheme(id: string): BoardTheme {
  return getAllThemes().find(t => t.id === id) ?? BOARD_THEMES[0];
}
