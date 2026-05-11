/**
 * ScholarForge Chess — shared types.
 *
 * Phase 1 defines the full vocabulary even when most fields are only consumed
 * in Phases 2–5, so data structures never need a breaking refactor later.
 *
 * Student / SkillData / GameRecord are re-exported from lib/storage so the
 * persisted shape (the one in localStorage) and the in-memory shape (the one
 * Zustand stores expose) stay in lockstep — single source of truth.
 */

import type { Student as StoredStudent, StoredSkillData, StoredGameRecord } from "../lib/storage";

// ─── Chess primitives ──────────────────────────────────────────────────────
export type Color = "w" | "b";
export type PieceSymbol = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceKey =
  | "wP" | "wN" | "wB" | "wR" | "wQ" | "wK"
  | "bP" | "bN" | "bB" | "bR" | "bQ" | "bK";
export type Square =
  | "a1" | "b1" | "c1" | "d1" | "e1" | "f1" | "g1" | "h1"
  | "a2" | "b2" | "c2" | "d2" | "e2" | "f2" | "g2" | "h2"
  | "a3" | "b3" | "c3" | "d3" | "e3" | "f3" | "g3" | "h3"
  | "a4" | "b4" | "c4" | "d4" | "e4" | "f4" | "g4" | "h4"
  | "a5" | "b5" | "c5" | "d5" | "e5" | "f5" | "g5" | "h5"
  | "a6" | "b6" | "c6" | "d6" | "e6" | "f6" | "g6" | "h6"
  | "a7" | "b7" | "c7" | "d7" | "e7" | "f7" | "g7" | "h7"
  | "a8" | "b8" | "c8" | "d8" | "e8" | "f8" | "g8" | "h8";

// ─── Skill taxonomy (full enum, used Phase 2+) ─────────────────────────────
export type SkillTag =
  // Tactical
  | "forks" | "pins" | "skewers" | "discovered_attacks" | "double_checks"
  | "deflections" | "decoys" | "interference" | "clearance"
  | "back_rank_threats" | "checkmate_patterns"
  // Calculation
  | "forcing_moves" | "candidate_evaluation" | "move_counting" | "defensive_calculation"
  // Vision
  | "board_vision" | "coordinate_training" | "piece_awareness"
  | "threat_detection" | "checks" | "captures"
  // Positional
  | "center_control" | "piece_activity" | "open_files" | "weak_squares" | "pawn_structure"
  // Opening
  | "center_occupation" | "piece_development" | "king_safety" | "tempo"
  // Endgame
  | "king_activation" | "pawn_endgames" | "rook_endgames" | "opposition";

// ─── Mistake taxonomy (Phase 2+) ───────────────────────────────────────────
export type ErrorType =
  | "vision"          // Didn't see the piece/square/threat
  | "calculation"     // Saw it but miscounted moves
  | "evaluation"      // Calculated correctly, assessed position wrong
  | "knowledge_gap"   // Pattern never seen before
  | "psychological";  // Time pressure, fear, overconfidence

// ─── Lichess-compatible puzzle schema ──────────────────────────────────────
export interface ScholarPuzzle {
  puzzleId: string;
  fen: string;
  solution: string[];                       // SAN array — multi-move
  difficulty: 1 | 2 | 3 | 4 | 5;
  skillTags: SkillTag[];
  errorType: ErrorType;
  title: string;
  hints: string[];
  explanation: string;
  source: "lichess" | "custom";
  lichessRating?: number;
  lichessPopularity?: number;
}

// Lichess theme → ScholarForge SkillTag mapping (Phase 2 import tool).
export const LICHESS_THEME_TO_SKILL: Record<string, SkillTag> = {
  fork: "forks",
  pin: "pins",
  skewer: "skewers",
  discoveredAttack: "discovered_attacks",
  doubleCheck: "double_checks",
  deflection: "deflections",
  decoy: "decoys",
  backRankMate: "back_rank_threats",
  mateIn1: "checkmate_patterns",
  mateIn2: "checkmate_patterns",
  mateIn3: "checkmate_patterns",
  endgame: "king_activation",
  opening: "piece_development",
};

// ─── Teaching feature payloads ─────────────────────────────────────────────
export interface OpeningViolation {
  moveIndex: number;        // 0-based half-move index
  violation: string;        // short label, e.g. "queen_too_early"
  explanation: string;      // student-facing sentence
}

export interface MoveAnnotation {
  moveIndex: number;
  studentText?: string;            // freeform student note
  prompts?: {
    intent?: string;               // "What were you trying to do here?"
    worry?: string;                // "What were you worried about?"
    retro?: string;                // "Looking at it now, what went wrong?"
  };
  candidateMoves?: string[];       // SAN list captured pre-move (Phase 2)
  errorType?: ErrorType;           // Phase 2 classification
}

// ─── Re-exports from the persisted storage layer ──────────────────────────
// One canonical Student/SkillData/GameRecord shape across the whole app.
export type Student = StoredStudent;
export type SkillData = StoredSkillData;
export type GameRecord = StoredGameRecord;
