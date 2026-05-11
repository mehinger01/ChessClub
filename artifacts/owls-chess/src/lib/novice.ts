/**
 * Novice Mode helpers — pure logic, no React dependencies.
 *
 * Exports:
 *  - PIECE_NAMES      piece code ("wK") → display name ("White King")
 *  - PIECE_MOVE_TIPS  piece type letter → beginner-friendly movement description
 *  - getAttackers     squares of enemy pieces that can capture on a given square
 *  - getPieceCode     "wK" | "bN" | … for a FEN + square pair, or null
 *  - squareToPercent  square → { x, y } percentage position inside the board container
 */

import { Chess } from "chess.js";
import type { Square } from "chess.js";

export const PIECE_NAMES: Record<string, string> = {
  wK: "White King",
  wQ: "White Queen",
  wR: "White Rook",
  wB: "White Bishop",
  wN: "White Knight",
  wP: "White Pawn",
  bK: "Black King",
  bQ: "Black Queen",
  bR: "Black Rook",
  bB: "Black Bishop",
  bN: "Black Knight",
  bP: "Black Pawn",
};

export const PIECE_MOVE_TIPS: Record<string, string> = {
  K: "The King moves one square in any direction. Guard it carefully — if your King can't escape check, the game is over.",
  Q: "The Queen can move any number of squares in any direction (straight lines or diagonals). It is the most powerful piece on the board.",
  R: "Rooks slide any number of squares in a straight line — up, down, left, or right. They thrive in open files with no pawns blocking them.",
  B: "Bishops slide any number of squares diagonally. Each bishop stays on its starting color for the whole game.",
  N: "Knights move in an L-shape: two squares one way, then one square sideways. They are the only pieces that can jump over other pieces.",
  P: "Pawns move one square forward but capture one square diagonally. On their very first move they may advance two squares.",
};

/**
 * Returns all squares containing enemy pieces that attack `square`.
 * Delegates entirely to chess.js chess.attackers(square, color) — rules-correct
 * and consistent with the rest of the engine; no custom geometry needed.
 */
export function getAttackers(fen: string, square: string): string[] {
  try {
    const chess = new Chess(fen);
    const target = square as Square;
    const piece = chess.get(target);
    if (!piece) return [];
    const enemyColor = piece.color === "w" ? "b" : "w";
    return chess.attackers(target, enemyColor) as string[];
  } catch {
    return [];
  }
}

/** Returns a piece code like "wK" or "bN" for the piece on `square` in `fen`, or null. */
export function getPieceCode(fen: string, square: string): string | null {
  try {
    const chess = new Chess(fen);
    const p = chess.get(square as Square);
    if (!p) return null;
    return `${p.color}${p.type.toUpperCase()}`;
  } catch {
    return null;
  }
}

/**
 * Convert a board square (e.g. "e4") to a % position inside the board container
 * (origin = top-left, 100% = full board width/height).
 * Used to position the hover tooltip over the correct square.
 */
export function squareToPercent(
  square: string,
  orientation: "white" | "black",
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;             // a=0 … h=7
  const rank = parseInt(square[1] ?? "1", 10) - 1;   // 1=0 … 8=7
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return { x: (col + 0.5) * 12.5, y: (row + 0.5) * 12.5 };
}
