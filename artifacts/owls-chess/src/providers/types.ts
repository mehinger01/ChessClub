// Provider interfaces. Application code MUST use these instead of touching
// localStorage / fetch / etc. directly. Implementations live in ./local.ts (and
// later ./hosted.ts when a backend is added).

import type { Student, PuzzleAttempt, Puzzle } from "../lib/storage";

export type DeploymentMode = "hosted" | "school" | "restricted";

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
