/**
 * Derive captured pieces from a FEN string.
 *
 * Single source of truth: count what's on the board, subtract from the starting
 * count. No separate captured-list state to keep in sync — recomputes on every
 * navigation step automatically.
 */

export type PieceCounts = {
  P: number; N: number; B: number; R: number; Q: number; K: number;
};

const STARTING_COUNT_PER_SIDE: PieceCounts = {
  P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1,
};

const EMPTY_COUNT: PieceCounts = { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 };

export interface CapturedPieces {
  /** White pieces captured by Black (i.e. missing from White's side). */
  capturedFromWhite: PieceCounts;
  /** Black pieces captured by White (i.e. missing from Black's side). */
  capturedFromBlack: PieceCounts;
  /** Material balance: positive = white ahead in points, negative = black ahead. */
  materialAdvantage: number;
}

const PIECE_VALUES: Record<keyof PieceCounts, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0,
};

export function deriveCapturedPieces(fen: string): CapturedPieces {
  const board = fen.split(" ")[0] ?? "";
  const white: PieceCounts = { ...EMPTY_COUNT };
  const black: PieceCounts = { ...EMPTY_COUNT };

  for (const ch of board) {
    if (ch === "/" || (ch >= "1" && ch <= "8")) continue;
    const upper = ch.toUpperCase() as keyof PieceCounts;
    if (!(upper in white)) continue;
    if (ch === upper) white[upper] += 1;
    else black[upper] += 1;
  }

  const capturedFromWhite: PieceCounts = {
    P: STARTING_COUNT_PER_SIDE.P - white.P,
    N: STARTING_COUNT_PER_SIDE.N - white.N,
    B: STARTING_COUNT_PER_SIDE.B - white.B,
    R: STARTING_COUNT_PER_SIDE.R - white.R,
    Q: STARTING_COUNT_PER_SIDE.Q - white.Q,
    K: STARTING_COUNT_PER_SIDE.K - white.K,
  };
  const capturedFromBlack: PieceCounts = {
    P: STARTING_COUNT_PER_SIDE.P - black.P,
    N: STARTING_COUNT_PER_SIDE.N - black.N,
    B: STARTING_COUNT_PER_SIDE.B - black.B,
    R: STARTING_COUNT_PER_SIDE.R - black.R,
    Q: STARTING_COUNT_PER_SIDE.Q - black.Q,
    K: STARTING_COUNT_PER_SIDE.K - black.K,
  };

  // Material advantage: white pieces still on board, minus black pieces.
  let advantage = 0;
  (Object.keys(PIECE_VALUES) as (keyof PieceCounts)[]).forEach(p => {
    advantage += white[p] * PIECE_VALUES[p];
    advantage -= black[p] * PIECE_VALUES[p];
  });

  return { capturedFromWhite, capturedFromBlack, materialAdvantage: advantage };
}

/** Format ms thinking-time as "M:SS" or "SSs". */
export function formatThinkingTime(ms: number): string {
  if (ms < 1000) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Color band for the thinking-time dot per the brief: ≤ 5s instant, ≥ 180s long. */
export function thinkingTimeBand(ms: number): "instant" | "long" | "normal" {
  if (ms <= 5_000) return "instant";
  if (ms >= 180_000) return "long";
  return "normal";
}
