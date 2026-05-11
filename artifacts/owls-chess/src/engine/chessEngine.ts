/**
 * ScholarForge Chess — typed wrapper around chess.js.
 *
 * This is the ONLY place the app constructs a `Chess` instance for live games.
 * gameStore.ts holds a singleton instance and mirrors derived state into the
 * Zustand store; UI components read from the store, never from chess.js
 * directly. (Puzzles use their own short-lived Chess instances for one-move
 * validation — a different lifecycle that doesn't need this wrapper.)
 *
 * The engine owns its own FEN history per half-move so navigation is O(1)
 * (no replay required to jump to move N). FEN history is in-memory only —
 * it's rebuilt from PGN on review to keep localStorage flat as game count grows.
 */

import { Chess } from "chess.js";
import type { Move, Square as ChessSquare } from "chess.js";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export class ChessEngine {
  private chess: Chess;
  private fenList: string[];
  private sanList: string[];

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.fenList = [this.chess.fen()];
    this.sanList = [];
  }

  /**
   * Attempt a move. Returns the Move object on success, null if illegal.
   * Never throws on illegal input — chess.js v1 throws by default but we swallow.
   */
  makeMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n"): Move | null {
    try {
      const move = this.chess.move({
        from: from as ChessSquare,
        to: to as ChessSquare,
        promotion,
      });
      if (move) {
        this.fenList.push(this.chess.fen());
        this.sanList.push(move.san);
      }
      return move ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Undo the last half-move using chess.js's built-in undo().
   *
   * Unlike loadFEN(), this correctly restores castling rights, en passant
   * state, and check/checkmate state without clearing the engine's history.
   * Works after checkmate/stalemate — chess.js undo() does not gate on
   * isGameOver(). Returns true if a move was undone, false if no moves exist.
   */
  undoLastMove(): boolean {
    const move = this.chess.undo();
    if (move !== null) {
      this.fenList.pop();
      this.sanList.pop();
      return true;
    }
    return false;
  }

  /** Legal destination squares for the piece on `square`. Empty if no piece or no legal moves. */
  getLegalMoves(square: string): string[] {
    try {
      const moves = this.chess.moves({ square: square as ChessSquare, verbose: true });
      return moves.map(m => m.to);
    } catch {
      return [];
    }
  }

  /** Current FEN string. */
  getBoardState(): string {
    return this.chess.fen();
  }

  /** SAN history (one entry per half-move). */
  getHistory(): string[] {
    return [...this.sanList];
  }

  /** FEN per half-move including the starting position at index 0. */
  getFENHistory(): string[] {
    return [...this.fenList];
  }

  isCheck(): boolean {
    return this.chess.inCheck();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /** Returns "1-0" | "0-1" | "1/2-1/2" | "*". */
  getResult(): string {
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === "w" ? "0-1" : "1-0";
    }
    if (this.chess.isDraw() || this.chess.isStalemate()) return "1/2-1/2";
    return "*";
  }

  /** Whose turn it is. */
  turn(): "w" | "b" {
    return this.chess.turn();
  }

  /** Piece on a square (for click-to-select gating). */
  pieceOn(square: string): { type: string; color: "w" | "b" } | null {
    const p = this.chess.get(square as ChessSquare);
    return p ?? null;
  }

  /**
   * Replace the current position with `fen`. Clears history (this is a hard
   * reset to a new starting state, not a move).
   */
  loadFEN(fen: string): void {
    this.chess.load(fen);
    this.fenList = [fen];
    this.sanList = [];
  }

  /**
   * Format the game as a PGN string with ScholarForge headers.
   *
   * `resultOverride` lets the caller record an off-board termination (resign,
   * agreed draw) that the engine wouldn't otherwise know about. When omitted
   * we fall back to engine.getResult() so checkmates / stalemates label
   * themselves correctly.
   */
  getPGN(
    white: string,
    black: string,
    event = "ScholarForge Chess",
    resultOverride?: string,
  ): string {
    this.chess.header(
      "Event", event,
      "Site", "Owls Chess Club",
      "Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      "White", white,
      "Black", black,
      "Result", resultOverride ?? this.getResult(),
    );
    return this.chess.pgn();
  }

  /** New game from the standard starting position. */
  reset(): void {
    this.chess.reset();
    this.fenList = [this.chess.fen()];
    this.sanList = [];
  }

  /**
   * Rebuild engine state from PGN. Used on review to lazily reconstruct
   * fenHistory from a saved GameRecord (we don't persist fenHistory).
   */
  loadPGN(pgn: string): boolean {
    try {
      const fresh = new Chess();
      fresh.loadPgn(pgn);
      const moves = fresh.history({ verbose: true });
      this.chess = new Chess();
      this.fenList = [this.chess.fen()];
      this.sanList = [];
      for (const m of moves) {
        this.chess.move({ from: m.from, to: m.to, promotion: m.promotion });
        this.fenList.push(this.chess.fen());
        this.sanList.push(m.san);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const STARTING_POSITION_FEN = STARTING_FEN;
