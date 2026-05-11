// Provider interfaces. Application code MUST use these instead of touching
// localStorage / fetch / etc. directly. Implementations live in ./local.ts (and
// later ./hosted.ts when a backend is added).

import type { Student, PuzzleAttempt, Puzzle } from "../lib/storage";

export type DeploymentMode = "hosted" | "school" | "restricted";

// ScholarForge UI preferences. Stored alongside deployment settings so they
// flow through the existing updateSettings() audit log and provider write path.
// Custom piece blobs and custom board image live in IndexedDB (idb-keyval),
// NOT here — only their reference keys are kept in this object.
export interface UIPreferences {
  // Piece set
  pieceSetId: string;              // "cburnett" | "merida" | "alpha" | "maestro" | "custom" | <legacy id>
  customPieceKeys: PieceKey[];     // which piece slots have custom uploads in IndexedDB
  // Board square colors — CSS color strings. Empty string = use the active theme default.
  boardLight: string;
  boardDark: string;
  // Board border color. Empty string = no border.
  borderColor: string;
  // Highlight colors — CSS rgba strings. Empty string = use built-in default.
  highlightMove: string;           // last-move squares
  highlightSelect: string;         // selected-square highlight
  highlightCheck: string;          // king-in-check square
  dotLegal: string;                // legal-move dot colour
  threatHighlight: string;         // threat squares (novice mode)
  // Custom board image (IndexedDB key) — kept for potential future use
  customBoardImageKey: string | null;
  // Watermark
  watermarkOpacity: number;        // 0..1, default 0.12 — for themes with a watermarkImage
  // Interface toggles
  showCoordinates: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean;
  soundEnabled: boolean;
  soundVolume: number;             // 0..1
  darkMode: "light" | "dark" | "system";
  autoFlip: boolean;
  // Learning mode
  noviceMode: boolean;           // beginner aids: piece name tooltips, move tips, threat indicators
  // Class focus — skill tags the teacher has prioritised for this class session
  classFocusTags: string[];      // subset of SKILL_CATEGORIES tags; empty = no filter active
  // Coordinate appearance
  coordinateColor: string;         // CSS color, "" = auto (contrasts with dark square)
  coordinateOpacity: number;       // 0..1, default 0.9
  coordinateFontSize: number;      // px, 8-16, default 11
  coordinatePosition: "inside" | "outside"; // default "inside"
}

export type PieceKey =
  | "wP" | "wN" | "wB" | "wR" | "wQ" | "wK"
  | "bP" | "bN" | "bB" | "bR" | "bQ" | "bK";

export interface AppSettings {
  schoolId: string;
  deploymentMode: DeploymentMode;
  storageProviderId: string;        // "local" | "hosted"
  databaseProviderId: string;       // "local" | "hosted"
  authProviderId: string;           // "local" | "hosted"
  fileProviderId: string;           // "local" | "hosted"
  puzzleSourceProviderId: string;   // "local" | "imported" | "hosted"
  allowExternalCalls: boolean;
  activeThemeId: string;
  activePieceSetId: string;
  featureFlags: {
    customThemes: boolean;
    customPieceUploads: boolean;
    leaderboardEnabled: boolean;
  };
  uiPreferences: UIPreferences;
}

export interface AuditLogEntry {
  id: string;
  schoolId: string;
  actorUserId: string;          // "local-admin" for the no-login model
  actionType: string;           // e.g. "student.created", "settings.updated", "data.imported"
  targetType: string;           // e.g. "student", "puzzle", "settings"
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

// === Provider interfaces ===

export interface StorageProvider {
  id: string;
  saveStructuredData<T>(key: string, value: T): Promise<void>;
  loadStructuredData<T>(key: string): Promise<T | null>;
  exportData(): Promise<Record<string, unknown>>;
  importData(payload: Record<string, unknown>): Promise<void>;
}

export interface DatabaseProvider {
  id: string;
  // High-level helpers used by the app today
  listStudents(): Promise<Student[]>;
  saveStudents(students: Student[]): Promise<void>;
  listAttempts(): Promise<PuzzleAttempt[]>;
  saveAttempts(attempts: PuzzleAttempt[]): Promise<void>;
}

export interface AuthProvider {
  id: string;
  getCurrentRole(): "admin" | "teacher" | "student";
  login(_email: string, _password: string): Promise<void>;
  logout(): Promise<void>;
  createUser(_email: string, _role: "teacher" | "student"): Promise<void>;
  resetPassword(_email: string): Promise<void>;
  requirePasswordReset(_userId: string): Promise<void>;
}

export interface FileProvider {
  id: string;
  saveFile(name: string, blob: Blob): Promise<void>;
  loadFile(name: string): Promise<Blob | null>;
  listFiles(): Promise<string[]>;
}

export interface PuzzleSourceProvider {
  id: string;
  loadLibrary(): Promise<Puzzle[]>;
  importLibrary(json: unknown): Promise<{ added: number; rejected: number; errors: string[] }>;
  validateLibrary(json: unknown): { ok: boolean; errors: string[] };
}

export interface ProviderRegistry {
  settings: AppSettings;
  storage: StorageProvider;
  database: DatabaseProvider;
  auth: AuthProvider;
  file: FileProvider;
  puzzleSource: PuzzleSourceProvider;
  audit: {
    log(entry: Omit<AuditLogEntry, "id" | "timestamp" | "schoolId">): void;
    list(limit?: number): AuditLogEntry[];
    clear(): void;
  };
}
