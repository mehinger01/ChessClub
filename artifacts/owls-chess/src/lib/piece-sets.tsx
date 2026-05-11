import type { CSSProperties, ReactElement } from "react";
import { listCustomPieceSets, PIECE_KEYS } from "./custom-assets";
import { useSettingsStore } from "../stores/settingsStore";

export interface PieceSet {
  id: string;
  name: string;
  description: string;
  customPieces?: () => Record<string, (props: { squareWidth: number }) => ReactElement>;
}

function makeImagePieces(files: Record<string, string>) {
  const pieces: Record<string, (props: { squareWidth: number }) => ReactElement> = {};
  for (const key of PIECE_KEYS) {
    const url = files[key];
    pieces[key] = ({ squareWidth }) => (
      <img
        src={url}
        alt={key}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
        style={{ width: squareWidth * 0.92, height: squareWidth * 0.92, display: "block", margin: "auto", pointerEvents: "none" }}
      />
    );
  }
  return pieces;
}

export function getAllPieceSets(): PieceSet[] {
  const customs: PieceSet[] = listCustomPieceSets().map(c => ({
    id: c.id,
    name: c.name + " (custom)",
    description: "Custom piece set uploaded by your school admin.",
    customPieces: () => makeImagePieces(c.files),
  }));
  return [...PIECE_SETS, ...customs];
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

/**
 * Build piece components from the in-memory customPieceUrls map (object: URLs).
 * Reads from the store synchronously at call time so the board always reflects
 * the latest uploaded images without needing a remount.
 */
function makeCustomPieces() {
  const urls = useSettingsStore.getState().customPieceUrls;
  const pieces: Record<string, (props: { squareWidth: number }) => ReactElement> = {};
  for (const key of PIECE_KEYS) {
    const url = urls[key];
    const capturedKey = key;
    pieces[capturedKey] = ({ squareWidth }) =>
      url ? (
        <img
          src={url}
          alt={capturedKey}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
          style={{ width: squareWidth * 0.92, height: squareWidth * 0.92, display: "block", margin: "auto", pointerEvents: "none" }}
        />
      ) : (
        <span
          style={{
            fontSize: squareWidth * 0.3,
            fontWeight: 700,
            display: "block",
            textAlign: "center",
            lineHeight: `${squareWidth}px`,
            opacity: 0.35,
            fontFamily: "Georgia, serif",
            pointerEvents: "none",
          }}
        >
          {capturedKey}
        </span>
      );
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
  {
    id: "custom",
    name: "Custom",
    description: "Your own uploaded SVG or PNG for each of the 12 piece slots.",
    customPieces: makeCustomPieces,
  },
];

export function getPieceSet(id: string): PieceSet {
  return getAllPieceSets().find(p => p.id === id) ?? PIECE_SETS[0];
}
