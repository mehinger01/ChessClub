import type { CSSProperties, ReactElement } from "react";

export interface PieceSet {
  id: string;
  name: string;
  description: string;
  customPieces?: () => Record<string, (props: { squareWidth: number }) => ReactElement>;
}

// Letter-based fallback piece set (always available, never broken)
function makeLetterPieces() {
  const colors: Record<string, { fg: string; bg: string }> = {
    w: { fg: "#1f2937", bg: "#ffffff" },
    b: { fg: "#f9fafb", bg: "#1f2937" },
  };
  const labels: Record<string, string> = { K: "K", Q: "Q", R: "R", B: "B", N: "N", P: "P" };
  const pieces: Record<string, (props: { squareWidth: number }) => ReactElement> = {};
  for (const c of ["w", "b"] as const) {
    for (const t of ["K", "Q", "R", "B", "N", "P"] as const) {
      const key = `${c}${t}`;
      pieces[key] = ({ squareWidth }) => {
        const size = squareWidth * 0.78;
        const style: CSSProperties = {
          width: size,
          height: size,
          borderRadius: "50%",
          background: colors[c].bg,
          color: colors[c].fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 700,
          fontSize: size * 0.55,
          border: c === "w" ? "2px solid #1f2937" : "2px solid #f9fafb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          margin: "auto",
        };
        return <div style={style}>{labels[t]}</div>;
      };
    }
  }
  return pieces;
}

export const PIECE_SETS: PieceSet[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The standard piece set bundled with the board.",
    // no customPieces -> uses library default
  },
  {
    id: "letters",
    name: "Letters",
    description: "Letter-based pieces — always available, ideal for printing or low bandwidth.",
    customPieces: makeLetterPieces,
  },
];

export function getPieceSet(id: string): PieceSet {
  return PIECE_SETS.find(p => p.id === id) ?? PIECE_SETS[0];
}
