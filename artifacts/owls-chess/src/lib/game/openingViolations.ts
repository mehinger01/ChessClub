/**
 * Opening-principle violation detector.
 *
 * Pure function over a SAN move list. Runs after every committed move (during
 * the opening phase only) and returns the *full* list of detected violations
 * for the game so far — the gameStore replaces, never appends. Keeping it
 * idempotent means re-detecting after navigating history doesn't duplicate
 * warnings.
 *
 * Heuristics (deliberately small / explainable to a beginner):
 *   - "queen_too_early": Queen makes its second move (or any move beyond the
 *     opening square) before all four minor pieces have moved at least once.
 *   - "no_center_by_4": Side hasn't played any of e/d/c-pawn moves to the
 *     4th/5th rank by their second move (ply 4 for white, ply 5 for black).
 *   - "no_castle_by_15": King hasn't castled by move 15 (ply 30) and is not
 *     already on a safe square via castling rights spent.
 */
import type { OpeningViolation } from "../../types";

const OPENING_PLY_LIMIT = 30; // 15 full moves

interface SideTracker {
  minorMoves: { N: number; B: number };   // count of moves by knights, bishops
  queenMoves: number;
  kingMoved: boolean;
  castled: boolean;
  centerPawnAdvanced: boolean;            // e/d/c pawn pushed 2 squares
}

function emptyTracker(): SideTracker {
  return { minorMoves: { N: 0, B: 0 }, queenMoves: 0, kingMoved: false, castled: false, centerPawnAdvanced: false };
}

export function detectOpeningViolations(sanList: string[]): OpeningViolation[] {
  const out: OpeningViolation[] = [];
  const tracker: Record<"w" | "b", SideTracker> = { w: emptyTracker(), b: emptyTracker() };

  const limit = Math.min(sanList.length, OPENING_PLY_LIMIT);
  for (let i = 0; i < limit; i++) {
    const san = sanList[i];
    const side: "w" | "b" = i % 2 === 0 ? "w" : "b";
    const t = tracker[side];

    // Castling first — clears king safety concerns.
    if (san === "O-O" || san === "O-O-O") {
      t.castled = true;
      t.kingMoved = true;
      continue;
    }

    const piece = san[0];
    if (piece === "K") t.kingMoved = true;
    else if (piece === "Q") {
      t.queenMoves += 1;
      // Flag the queen sortie if minors aren't out yet (need 2N+2B = 4 minor moves
      // total; we approximate: at least 2 minor moves before the queen leaves home).
      const minorMoveCount = t.minorMoves.N + t.minorMoves.B;
      if (t.queenMoves >= 1 && minorMoveCount < 2) {
        out.push({
          moveIndex: i,
          violation: "queen_too_early",
          explanation: "Bringing the queen out before developing knights and bishops gives the opponent free tempi attacking it.",
        });
      }
    } else if (piece === "N") t.minorMoves.N += 1;
    else if (piece === "B") t.minorMoves.B += 1;
    else if (piece >= "a" && piece <= "h") {
      // Pawn move: SAN like "e4", "d5", "exd5". Detect a 2-square central push to rank 4/5.
      const file = san[0];
      const targetRank = san.match(/[1-8]/)?.[0];
      if ((file === "c" || file === "d" || file === "e") &&
          ((side === "w" && targetRank === "4") || (side === "b" && targetRank === "5"))) {
        t.centerPawnAdvanced = true;
      }
    }

    // Check the "no center by ply 4/5" rule once the window passes.
    // We file the violation on the side's *second* move slot if no center push by then.
    if (side === "w" && i === 2 && !tracker.w.centerPawnAdvanced) {
      out.push({
        moveIndex: i,
        violation: "no_center_by_4",
        explanation: "By move 2, White should claim the center with a pawn (e4, d4, or c4). Controlling the middle squares lets your pieces work.",
      });
    }
    if (side === "b" && i === 3 && !tracker.b.centerPawnAdvanced) {
      out.push({
        moveIndex: i,
        violation: "no_center_by_4",
        explanation: "By move 2, Black should contest the center with a pawn (e5, d5, or c5). Letting the opponent occupy the center hands them space.",
      });
    }
  }

  // King-safety check at the end of the opening window. We flag any side that
  // has NOT castled by ply 30 — even if the king has already moved (in fact,
  // a king walk *without* castling is exactly the failure mode we want to call
  // out, since it permanently forfeits castling rights).
  if (sanList.length >= OPENING_PLY_LIMIT) {
    (["w", "b"] as const).forEach(side => {
      const t = tracker[side];
      if (!t.castled) {
        const moveIndex = side === "w" ? OPENING_PLY_LIMIT - 2 : OPENING_PLY_LIMIT - 1;
        const detail = t.kingMoved
          ? "the king has already moved without castling — castling rights are now spent and the king is stuck in the centre"
          : "the king is still on the starting square";
        out.push({
          moveIndex,
          violation: "no_castle_by_15",
          explanation: `${side === "w" ? "White" : "Black"} hasn't castled by move 15 — ${detail}. Tucking the king safely away before launching attacks is one of the highest-value opening priorities.`,
        });
      }
    });
  }

  return out;
}
