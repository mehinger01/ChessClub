/**
 * ScholarForge Chess — game store.
 *
 * Pure session state for the live game on the play page. The engine itself
 * (chessEngine.ts) is the source of truth for legal positions; this store
 * mirrors derived state for fast reactive UI rendering and tracks Phase 1+
 * teaching-feature data (timesPerMove, openingViolations, annotations).
 *
 * Phase 5A additions:
 *  - completedGame: frozen snapshot set the moment a game ends; cleared only
 *    by startGame/resetToNewBoard. Provides stable export data even while the
 *    UI is still showing the game-over overlay.
 *  - getExportPGN(): returns an anonymized PGN ([White "White"]/[Black "Black"])
 *    for clipboard/download. Internal player names are NEVER in exports.
 *  - undo() overhauled to use engine.undoLastMove() (chess.js built-in) so
 *    fenHistory/sanList are kept coherent. Works after game-over.
 */

import { create } from "zustand";
import { ChessEngine, STARTING_POSITION_FEN } from "../engine/chessEngine";
import type { OpeningViolation, MoveAnnotation } from "../types";
import { detectOpeningViolations } from "../lib/game/openingViolations";

export type GameMode = "casual" | "tournament";

export interface GameStartOptions {
  whitePlayer: string;
  blackPlayer: string;
  mode?: GameMode;
  studentId?: string | null;       // student playing (for game-end save)
  flipForBlack?: boolean;
}

/** Frozen snapshot of a finished game — set once on game-end, cleared on New Game. */
export interface CompletedGame {
  gameId: string;
  timestamp: number;
  result: string;                  // "1-0" | "0-1" | "1/2-1/2" | "*"
  /** Anonymized PGN — [White "White"] / [Black "Black"] */
  pgn: string;
  moveCount: number;
  /** Internal tracking only — never written to exports */
  whitePlayerId: string;
  blackPlayerId: string;
}

interface GameState {
  // Engine + derived board state
  fen: string;
  fenHistory: string[];
  moveHistory: string[];
  currentMoveIndex: number;        // -1 = at starting position; equals moveHistory.length-1 when at latest
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  isGameOver: boolean;
  gameResult: string | null;       // "1-0" | "0-1" | "1/2-1/2" | null while playing

  // Players
  whitePlayer: string;
  blackPlayer: string;
  activeColor: "w" | "b";
  studentId: string | null;        // student bound to this game (for save)

  // UI
  isFullscreen: boolean;
  isBoardFlipped: boolean;
  isReviewing: boolean;            // true when navigating history (not at latest)

  // Teaching features
  timesPerMove: number[];          // ms per half-move
  openingViolations: OpeningViolation[];
  annotations: Record<number, MoveAnnotation>;
  lastMoveAt: number;              // ms timestamp of last commit (for thinking timer)

  // Game metadata
  gameStartTime: number;
  gameMode: GameMode;
  hasStarted: boolean;             // true after startGame(); false on initial mount

  // Phase 5A: completed game snapshot (anonymized)
  completedGame: CompletedGame | null;

  // Actions
  startGame: (opts: GameStartOptions) => void;
  resetToNewBoard: () => void;
  selectSquare: (square: string | null) => void;
  tryMove: (from: string, to: string, promotion?: "q" | "r" | "b" | "n") => boolean;
  navigateTo: (moveIndex: number) => void;        // -1 = start, history.length-1 = latest
  navigateFirst: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  navigateLatest: () => void;
  setFullscreen: (on: boolean) => void;
  toggleFullscreen: () => void;
  flipBoard: () => void;
  resign: (loser: "w" | "b") => void;
  declareDraw: () => void;
  /** Undo the last half-move. Works in casual mode during play AND after game-over.
   *  Disabled only when there are no moves to undo (starting position). */
  undo: () => void;
  setAnnotation: (moveIndex: number, ann: MoveAnnotation) => void;
  setOpeningViolations: (v: OpeningViolation[]) => void;
  getEngine: () => ChessEngine;
  /** Full PGN with real player names (for internal use / student records). */
  getCurrentPGN: () => string;
  /** Anonymized PGN with [White "White"] / [Black "Black"] — safe for export. */
  getExportPGN: () => string;
  /** Build a GameRecord snapshot of the current game (for studentStore.saveGameRecord). */
  buildGameRecord: () => import("../types").GameRecord | null;
}

// Module-level engine singleton — the gameStore owns one Chess instance for
// the lifetime of the page. Held outside Zustand state so chess.js (which is
// mutable) doesn't get put through Zustand's shallow equality.
let engine = new ChessEngine();

function snapshot(): Pick<
  GameState,
  "fen" | "fenHistory" | "moveHistory" | "isCheck" | "isGameOver" | "gameResult" | "activeColor"
> {
  return {
    fen: engine.getBoardState(),
    fenHistory: engine.getFENHistory(),
    moveHistory: engine.getHistory(),
    isCheck: engine.isCheck(),
    isGameOver: engine.isGameOver(),
    gameResult: engine.isGameOver() ? engine.getResult() : null,
    activeColor: engine.turn(),
  };
}

function buildCompletedGame(
  whitePlayer: string,
  blackPlayer: string,
  result: string,
  moveCount: number,
): CompletedGame {
  return {
    gameId: crypto.randomUUID(),
    timestamp: Date.now(),
    result,
    pgn: engine.getPGN("White", "Black", "OHS Chess Club", result),
    moveCount,
    whitePlayerId: whitePlayer,
    blackPlayerId: blackPlayer,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state — board ready but game not "started" until startGame() is called.
  fen: STARTING_POSITION_FEN,
  fenHistory: [STARTING_POSITION_FEN],
  moveHistory: [],
  currentMoveIndex: -1,
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  isCheck: false,
  isGameOver: false,
  gameResult: null,
  whitePlayer: "White",
  blackPlayer: "Black",
  activeColor: "w",
  studentId: null,
  isFullscreen: false,
  isBoardFlipped: false,
  isReviewing: false,
  timesPerMove: [],
  openingViolations: [],
  annotations: {},
  lastMoveAt: 0,
  gameStartTime: 0,
  gameMode: "casual",
  hasStarted: false,
  completedGame: null,

  startGame: (opts) => {
    engine = new ChessEngine();
    const now = Date.now();
    set({
      ...snapshot(),
      currentMoveIndex: -1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      whitePlayer: opts.whitePlayer || "White",
      blackPlayer: opts.blackPlayer || "Black",
      studentId: opts.studentId ?? null,
      gameMode: opts.mode ?? "casual",
      isBoardFlipped: !!opts.flipForBlack,
      isReviewing: false,
      timesPerMove: [],
      openingViolations: [],
      annotations: {},
      lastMoveAt: now,
      gameStartTime: now,
      hasStarted: true,
      completedGame: null,
    });
  },

  resetToNewBoard: () => {
    engine = new ChessEngine();
    set({
      ...snapshot(),
      currentMoveIndex: -1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      isReviewing: false,
      timesPerMove: [],
      openingViolations: [],
      annotations: {},
      hasStarted: false,
      completedGame: null,
    });
  },

  selectSquare: (square) => {
    const state = get();
    // After game-over: allow history navigation clicks but disable piece selection.
    if (state.isGameOver) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }
    if (state.isReviewing) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }
    if (!square) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }
    const piece = engine.pieceOn(square);
    // Only select pieces of the side to move
    if (!piece || piece.color !== engine.turn()) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }
    set({ selectedSquare: square, legalMoves: engine.getLegalMoves(square) });
  },

  tryMove: (from, to, promotion) => {
    const state = get();
    if (state.isReviewing || state.isGameOver) return false;
    const move = engine.makeMove(from, to, promotion);
    if (!move) return false;
    const now = Date.now();
    const elapsed = state.lastMoveAt > 0 ? now - state.lastMoveAt : 0;
    const newHistory = engine.getHistory();
    const snap = snapshot();

    // Freeze a completed-game snapshot the moment the game ends so the data
    // is stable for export/archive even while the UI shows the game-over overlay.
    const completedGame: CompletedGame | null = snap.isGameOver
      ? buildCompletedGame(state.whitePlayer, state.blackPlayer, snap.gameResult ?? "*", newHistory.length)
      : null;

    set({
      ...snap,
      currentMoveIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: { from: move.from, to: move.to },
      isReviewing: false,
      timesPerMove: [...state.timesPerMove, elapsed],
      openingViolations: detectOpeningViolations(newHistory),
      lastMoveAt: now,
      ...(completedGame ? { completedGame } : {}),
    });
    return true;
  },

  navigateTo: (moveIndex) => {
    const state = get();
    const max = state.moveHistory.length - 1;
    const clamped = Math.max(-1, Math.min(moveIndex, max));
    const fen = state.fenHistory[clamped + 1] ?? STARTING_POSITION_FEN;
    set({
      currentMoveIndex: clamped,
      isReviewing: clamped < max,
      selectedSquare: null,
      legalMoves: [],
      // Don't touch the engine — it stays at the latest position. We just show fen at index.
      fen,
    });
  },

  navigateFirst: () => get().navigateTo(-1),
  navigatePrev: () => get().navigateTo(get().currentMoveIndex - 1),
  navigateNext: () => get().navigateTo(get().currentMoveIndex + 1),
  navigateLatest: () => {
    const state = get();
    const max = state.moveHistory.length - 1;
    set({
      currentMoveIndex: max,
      isReviewing: false,
      fen: engine.getBoardState(),
      selectedSquare: null,
      legalMoves: [],
    });
  },

  setFullscreen: (on) => set({ isFullscreen: on }),
  toggleFullscreen: () => set(s => ({ isFullscreen: !s.isFullscreen })),
  flipBoard: () => set(s => ({ isBoardFlipped: !s.isBoardFlipped })),

  resign: (loser) => {
    const state = get();
    const result = loser === "w" ? "0-1" : "1-0";
    const completedGame = buildCompletedGame(
      state.whitePlayer,
      state.blackPlayer,
      result,
      state.moveHistory.length,
    );
    set({
      isGameOver: true,
      gameResult: result,
      selectedSquare: null,
      legalMoves: [],
      completedGame,
    });
  },

  declareDraw: () => {
    const state = get();
    const result = "1/2-1/2";
    const completedGame = buildCompletedGame(
      state.whitePlayer,
      state.blackPlayer,
      result,
      state.moveHistory.length,
    );
    set({
      isGameOver: true,
      gameResult: result,
      selectedSquare: null,
      legalMoves: [],
      completedGame,
    });
  },

  /**
   * Undo the last half-move.
   *
   * Phase 5A overhaul:
   *  - Uses engine.undoLastMove() (chess.js undo()) instead of loadFEN().
   *    chess.js undo() correctly pops the move history and restores all game
   *    state including castling rights and en passant — loadFEN() wiped the
   *    engine's sanList causing the notation panel to go blank.
   *  - Works after checkmate/stalemate/resign/draw game-over.
   *  - Disabled only at the true starting position (no moves to undo).
   *  - Clears completedGame so the game-over overlay is dismissed.
   */
  undo: () => {
    const state = get();
    if (!state.hasStarted) return;
    if (state.moveHistory.length === 0) return;

    const ok = engine.undoLastMove();
    if (!ok) {
      // chess.js has no move to undo (e.g. store out of sync) — clear game-over
      // state if it was set by resign/draw without touching engine.
      if (state.isGameOver) {
        set({ isGameOver: false, gameResult: null, completedGame: null, selectedSquare: null, legalMoves: [] });
      }
      return;
    }

    const newHistory = engine.getHistory();
    set({
      ...snapshot(),
      currentMoveIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      timesPerMove: state.timesPerMove.slice(0, -1),
      isReviewing: false,
      completedGame: null,   // undo dismisses the completed-game state
      // snapshot() provides isGameOver: false after undoing checkmate/stalemate
      // and gameResult: null. For resign/draw the engine never set game-over so
      // snapshot() also returns false correctly.
    });
  },

  setAnnotation: (moveIndex, ann) => {
    set(s => ({ annotations: { ...s.annotations, [moveIndex]: ann } }));
  },

  setOpeningViolations: (v) => set({ openingViolations: v }),

  getEngine: () => engine,

  getCurrentPGN: () => {
    const state = get();
    return engine.getPGN(state.whitePlayer, state.blackPlayer, "OHS Chess Club", state.gameResult ?? undefined);
  },

  getExportPGN: () => {
    const state = get();
    // Always anonymize: "White" / "Black" regardless of player names.
    return engine.getPGN("White", "Black", "OHS Chess Club", state.gameResult ?? undefined);
  },

  buildGameRecord: () => {
    const state = get();
    if (!state.studentId) return null;
    const result = state.gameResult ?? "*";
    const pgn = engine.getPGN(state.whitePlayer, state.blackPlayer, "OHS Chess Club", result);
    return {
      id: crypto.randomUUID(),
      studentId: state.studentId,
      pgn,
      white: state.whitePlayer,
      black: state.blackPlayer,
      result,
      date: new Date().toISOString(),
      moveCount: state.moveHistory.length,
      duration: state.gameStartTime > 0 ? Date.now() - state.gameStartTime : 0,
      timesPerMove: [...state.timesPerMove],
      openingViolations: [...state.openingViolations],
      annotations: { ...state.annotations },
    };
  },
}));
