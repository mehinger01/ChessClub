// Local-first implementations of every provider interface. These are the only
// implementations that exist today; future hosted/school-server backends slot
// in here without touching app code.

import { storage as localStorageEngine } from "../lib/storage";
import { puzzles as bundledPuzzles } from "../data/puzzles";
import type { Puzzle } from "../lib/storage";
import type {
  AppSettings,
  AuditLogEntry,
  AuthProvider,
  DatabaseProvider,
  FileProvider,
  PuzzleSourceProvider,
  StorageProvider,
} from "./types";

const SETTINGS_KEY = "owls_settings_v1";
const AUDIT_KEY = "owls_audit_v1";
const FILES_KEY = "owls_files_v1";
const PUZZLE_LIB_KEY = "owls_puzzle_library_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  schoolId: "local-school",
  deploymentMode: "school",
  storageProviderId: "local",
  databaseProviderId: "local",
  authProviderId: "local",
  fileProviderId: "local",
  puzzleSourceProviderId: "local",
  allowExternalCalls: false,
  activeThemeId: "royal",
  activePieceSetId: "classic",
  featureFlags: {
    customThemes: false,
    customPieceUploads: false,
    leaderboardEnabled: true,
  },
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed, featureFlags: { ...DEFAULT_SETTINGS.featureFlags, ...(parsed.featureFlags ?? {}) } };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("owls-settings"));
}

// ----- Audit log -----
function readAudit(): AuditLogEntry[] {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) ?? "[]"); } catch { return []; }
}
function writeAudit(entries: AuditLogEntry[]): void {
  // keep last 500
  const trimmed = entries.slice(-500);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new Event("owls-audit"));
}

export const auditService = {
  log(entry: Omit<AuditLogEntry, "id" | "timestamp" | "schoolId">) {
    const settings = loadSettings();
    const full: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      schoolId: settings.schoolId,
      timestamp: Date.now(),
    };
    const list = readAudit();
    list.push(full);
    writeAudit(list);
  },
  list(limit = 100): AuditLogEntry[] {
    return readAudit().slice(-limit).reverse();
  },
  clear() {
    writeAudit([]);
  },
};

// ----- Storage provider -----
export const localStorageProvider: StorageProvider = {
  id: "local",
  async saveStructuredData<T>(key: string, value: T) {
    localStorage.setItem(`owls_data_${key}`, JSON.stringify(value));
  },
  async loadStructuredData<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(`owls_data_${key}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async exportData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      students: localStorageEngine.getStudents(),
      attempts: localStorageEngine.getAttempts(),
      settings: loadSettings(),
      audit: readAudit(),
      activeStudentId: localStorageEngine.getActiveStudentId(),
    };
  },
  async importData(payload) {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const p = payload as any;
    if (Array.isArray(p.students)) localStorage.setItem("owls_students_v2", JSON.stringify(p.students));
    if (Array.isArray(p.attempts)) localStorage.setItem("owls_attempts_v2", JSON.stringify(p.attempts));
    if (p.settings && typeof p.settings === "object") saveSettings({ ...DEFAULT_SETTINGS, ...p.settings });
    if (Array.isArray(p.audit)) writeAudit(p.audit);
    if (typeof p.activeStudentId === "string") localStorage.setItem("owls_active_student", p.activeStudentId);
    window.dispatchEvent(new Event("owls-storage"));
  },
};

// ----- Database provider (delegates to existing storage layer) -----
export const localDatabaseProvider: DatabaseProvider = {
  id: "local",
  async listStudents() { return localStorageEngine.getStudents(); },
  async saveStudents(s) { localStorageEngine.saveStudents(s); },
  async listAttempts() { return localStorageEngine.getAttempts(); },
  async saveAttempts(a) { localStorageEngine.saveAttempts(a); },
};

// ----- Auth provider (no-login local placeholder) -----
export const localAuthProvider: AuthProvider = {
  id: "local",
  getCurrentRole() { return "admin"; }, // single-link classroom mode = local admin
  async login() { /* no-op in local mode */ },
  async logout() { /* no-op in local mode */ },
  async createUser() { throw new Error("User creation requires hosted auth provider (Phase 6)"); },
  async resetPassword() { throw new Error("Password reset requires hosted auth provider (Phase 6)"); },
  async requirePasswordReset() { throw new Error("Password reset requires hosted auth provider (Phase 6)"); },
};

// ----- File provider (in-memory + localStorage map of base64 blobs) -----
function readFileMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(FILES_KEY) ?? "{}"); } catch { return {}; }
}
function writeFileMap(m: Record<string, string>) {
  localStorage.setItem(FILES_KEY, JSON.stringify(m));
}

export const localFileProvider: FileProvider = {
  id: "local",
  async saveFile(name, blob) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const map = readFileMap();
    map[name] = `${blob.type || "application/octet-stream"};${b64}`;
    writeFileMap(map);
  },
  async loadFile(name) {
    const map = readFileMap();
    const entry = map[name];
    if (!entry) return null;
    const [type, b64] = entry.split(";");
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type });
  },
  async listFiles() { return Object.keys(readFileMap()); },
};

// ----- Puzzle source provider -----
function readImportedLibrary(): Puzzle[] | null {
  try {
    const raw = localStorage.getItem(PUZZLE_LIB_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeImportedLibrary(lib: Puzzle[]) {
  localStorage.setItem(PUZZLE_LIB_KEY, JSON.stringify(lib));
  window.dispatchEvent(new Event("owls-puzzles"));
}

export function clearImportedLibrary() {
  localStorage.removeItem(PUZZLE_LIB_KEY);
  window.dispatchEvent(new Event("owls-puzzles"));
}

function validatePuzzleShape(p: any): string[] {
  const errs: string[] = [];
  if (!p || typeof p !== "object") return ["not an object"];
  if (typeof p.id !== "string") errs.push("missing id");
  if (typeof p.title !== "string") errs.push("missing title");
  if (typeof p.theme !== "string") errs.push("missing theme");
  if (typeof p.difficulty !== "number") errs.push("missing difficulty");
  if (p.sideToMove !== "white" && p.sideToMove !== "black") errs.push("sideToMove must be white|black");
  if (typeof p.fen !== "string") errs.push("missing fen");
  if (!Array.isArray(p.solution) || p.solution.some((m: any) => typeof m !== "string")) errs.push("solution must be string[]");
  if (!Array.isArray(p.hints) || p.hints.length !== 3) errs.push("hints must be [string,string,string]");
  if (typeof p.explanation !== "string") errs.push("missing explanation");
  if (typeof p.feedbackCorrect !== "string") errs.push("missing feedbackCorrect");
  if (typeof p.feedbackIncorrect !== "string") errs.push("missing feedbackIncorrect");
  return errs;
}

export const localPuzzleSourceProvider: PuzzleSourceProvider = {
  id: "local",
  async loadLibrary() {
    const imported = readImportedLibrary();
    return imported && imported.length > 0 ? imported : bundledPuzzles;
  },
  async importLibrary(json) {
    const validation = this.validateLibrary(json);
    if (!validation.ok) {
      return { added: 0, rejected: Array.isArray(json) ? json.length : 1, errors: validation.errors };
    }
    const lib = json as Puzzle[];
    writeImportedLibrary(lib);
    return { added: lib.length, rejected: 0, errors: [] };
  },
  validateLibrary(json) {
    if (!Array.isArray(json)) return { ok: false, errors: ["root must be an array of puzzles"] };
    const errors: string[] = [];
    for (let i = 0; i < json.length; i++) {
      const errs = validatePuzzleShape(json[i]);
      for (const e of errs) errors.push(`puzzle[${i}]: ${e}`);
    }
    return { ok: errors.length === 0, errors };
  },
};
