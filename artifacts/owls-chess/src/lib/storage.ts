// Lightweight per-skill performance record. Kept inline (no cross-file import)
// to avoid circular dependencies between lib/storage and types/index.
export interface StoredSkillData {
  attempts: number;
  solved: number;
  rating: number;       // simple rating, defaults to 1200
  lastSeen?: string;    // ISO timestamp
}

export interface Student {
  id: string;
  firstName: string;
  lastInitial: string;
  displayName: string;
  puzzlesAttempted: number;
  puzzlesCorrect: number;
  puzzlesIncorrect: number;
  puzzleScore: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  lessonsCompleted: string[];
  currentLevel: number;
  usedPuzzleIds: string[];
  notes?: string;
  lastActive: number;
  // ScholarForge Phase 2+ additive fields. Optional so legacy persisted data
  // stays valid; defaulted in migrateStudent below so reads see consistent shape.
  createdAt?: string;                                    // ISO
  active?: boolean;                                      // soft-deactivate flag
  skillProfile?: Record<string, StoredSkillData>;        // SkillTag → record
}

export interface PuzzleAttempt {
  id: string;
  puzzleId: string;
  studentId: string;
  correct: boolean;
  hintsUsed: number;
  score: number;
  theme: string;
  difficulty: number;
  timestamp: number;
}

export interface Puzzle {
  id: string;
  title: string;
  theme: string;
  difficulty: number; // 1-5
  sideToMove: "white" | "black";
  fen: string;
  solution: string[]; // SAN moves; odd indices are auto-played opponent replies
  hints: [string, string, string];
  explanation: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
}

const STUDENTS_KEY = "owls_students_v2";
const ATTEMPTS_KEY = "owls_attempts_v2";
const ACTIVE_STUDENT_KEY = "owls_active_student";
const LEGACY_STUDENTS_KEY = "owls_students";
const LEGACY_ATTEMPTS_KEY = "owls_attempts";

function migrateStudent(raw: any): Student {
  return {
    id: raw.id ?? crypto.randomUUID(),
    firstName: raw.firstName ?? "",
    lastInitial: raw.lastInitial ?? "",
    displayName: raw.displayName ?? `${raw.firstName ?? ""} ${raw.lastInitial ?? ""}.`,
    puzzlesAttempted: raw.puzzlesAttempted ?? raw.attempts ?? 0,
    puzzlesCorrect: raw.puzzlesCorrect ?? raw.solved ?? 0,
    puzzlesIncorrect: raw.puzzlesIncorrect ?? Math.max(0, (raw.attempts ?? 0) - (raw.solved ?? 0)),
    puzzleScore: raw.puzzleScore ?? (raw.solved ?? 0) * 2,
    gamesPlayed: raw.gamesPlayed ?? 0,
    wins: raw.wins ?? 0,
    losses: raw.losses ?? 0,
    draws: raw.draws ?? 0,
    lessonsCompleted: raw.lessonsCompleted ?? [],
    currentLevel: raw.currentLevel ?? 1,
    usedPuzzleIds: raw.usedPuzzleIds ?? [],
    notes: raw.notes,
    lastActive: raw.lastActive ?? Date.now(),
    createdAt: raw.createdAt ?? new Date(raw.lastActive ?? Date.now()).toISOString(),
    active: raw.active ?? true,
    skillProfile: raw.skillProfile ?? {},
  };
}

// ─── Game records (ScholarForge Phase 1+) ──────────────────────────────────
// Persisted PGN history per student. fenHistory is intentionally NOT persisted —
// it's rebuilt from PGN on review to keep localStorage flat as game count grows.
export interface StoredGameRecord {
  id: string;
  studentId: string;
  pgn: string;
  white: string;
  black: string;
  result: string;             // "1-0" | "0-1" | "1/2-1/2" | "*"
  date: string;               // ISO
  moveCount: number;
  duration: number;           // ms total
  timesPerMove: number[];
  openingViolations: { moveIndex: number; violation: string; explanation: string }[];
  annotations: Record<number, unknown>;
}

const GAME_RECORDS_KEY = "owls_game_records_v1";

function readGameRecords(): Record<string, StoredGameRecord[]> {
  try {
    const raw = localStorage.getItem(GAME_RECORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeGameRecords(map: Record<string, StoredGameRecord[]>) {
  localStorage.setItem(GAME_RECORDS_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("owls-storage"));
}

function recomputeLevel(s: Student): number {
  // Every 5 correct puzzles unlocks the next level, capped at 5.
  return Math.min(5, 1 + Math.floor(s.puzzlesCorrect / 5));
}

export const storage = {
  getStudents: (): Student[] => {
    try {
      const data = localStorage.getItem(STUDENTS_KEY);
      if (data) return (JSON.parse(data) as any[]).map(migrateStudent);
      // migrate from legacy
      const legacy = localStorage.getItem(LEGACY_STUDENTS_KEY);
      if (legacy) {
        const migrated = (JSON.parse(legacy) as any[]).map(migrateStudent);
        localStorage.setItem(STUDENTS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return [];
    } catch {
      return [];
    }
  },

  saveStudents: (students: Student[]) => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  },

  addStudent: (firstName: string, lastInitial: string) => {
    const students = storage.getStudents();
    const newStudent: Student = migrateStudent({
      id: crypto.randomUUID(),
      firstName,
      lastInitial,
      displayName: `${firstName} ${lastInitial}.`,
      lastActive: Date.now(),
    });
    storage.saveStudents([...students, newStudent]);
    return newStudent;
  },

  updateStudent: (id: string, updater: (s: Student) => Student) => {
    const students = storage.getStudents();
    const next = students.map(s => (s.id === id ? updater(s) : s));
    storage.saveStudents(next);
  },

  deleteStudent: (id: string) => {
    const students = storage.getStudents();
    storage.saveStudents(students.filter(s => s.id !== id));
    if (storage.getActiveStudentId() === id) {
      storage.setActiveStudentId(null);
    }
  },

  getActiveStudentId: (): string | null => {
    return localStorage.getItem(ACTIVE_STUDENT_KEY);
  },

  setActiveStudentId: (id: string | null) => {
    if (id) {
      localStorage.setItem(ACTIVE_STUDENT_KEY, id);
      storage.updateStudent(id, s => ({ ...s, lastActive: Date.now() }));
    } else {
      localStorage.removeItem(ACTIVE_STUDENT_KEY);
    }
  },

  getAttempts: (): PuzzleAttempt[] => {
    try {
      const data = localStorage.getItem(ATTEMPTS_KEY);
      if (data) return JSON.parse(data);
      const legacy = localStorage.getItem(LEGACY_ATTEMPTS_KEY);
      if (legacy) {
        const arr = JSON.parse(legacy) as any[];
        const migrated: PuzzleAttempt[] = arr.map(a => ({
          id: a.id ?? crypto.randomUUID(),
          puzzleId: a.puzzleId,
          studentId: a.studentId,
          correct: !!a.correct,
          hintsUsed: a.hintsUsed ?? 0,
          score: a.score ?? (a.correct ? 2 : 0),
          theme: a.theme ?? "unknown",
          difficulty: a.difficulty ?? 1,
          timestamp: a.timestamp ?? Date.now(),
        }));
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return [];
    } catch {
      return [];
    }
  },

  saveAttempts: (attempts: PuzzleAttempt[]) => {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  },

  recordPuzzleAttempt: (
    studentId: string,
    puzzle: Puzzle,
    opts: { correct: boolean; hintsUsed: number }
  ) => {
    const score = !opts.correct ? 0 : opts.hintsUsed === 0 ? 2 : 1;
    const attempt: PuzzleAttempt = {
      id: crypto.randomUUID(),
      puzzleId: puzzle.id,
      studentId,
      correct: opts.correct,
      hintsUsed: opts.hintsUsed,
      score,
      theme: puzzle.theme,
      difficulty: puzzle.difficulty,
      timestamp: Date.now(),
    };
    const attempts = storage.getAttempts();
    storage.saveAttempts([...attempts, attempt]);

    storage.updateStudent(studentId, s => {
      const usedPuzzleIds = opts.correct && !s.usedPuzzleIds.includes(puzzle.id)
        ? [...s.usedPuzzleIds, puzzle.id]
        : s.usedPuzzleIds;
      const next: Student = {
        ...s,
        puzzlesAttempted: s.puzzlesAttempted + 1,
        puzzlesCorrect: s.puzzlesCorrect + (opts.correct ? 1 : 0),
        puzzlesIncorrect: s.puzzlesIncorrect + (opts.correct ? 0 : 1),
        puzzleScore: s.puzzleScore + score,
        usedPuzzleIds,
        lastActive: Date.now(),
      };
      next.currentLevel = recomputeLevel(next);
      return next;
    });
    return attempt;
  },

  recordGameResult: (studentId: string, result: "win" | "loss" | "draw") => {
    storage.updateStudent(studentId, s => ({
      ...s,
      gamesPlayed: s.gamesPlayed + 1,
      wins: s.wins + (result === "win" ? 1 : 0),
      losses: s.losses + (result === "loss" ? 1 : 0),
      draws: s.draws + (result === "draw" ? 1 : 0),
      lastActive: Date.now(),
    }));
  },

  resetStudentSession: (studentId: string) => {
    storage.updateStudent(studentId, s => ({ ...s, usedPuzzleIds: [] }));
  },

  // ─── Game record CRUD ───────────────────────────────────────────────────
  listGameRecords: (studentId: string): StoredGameRecord[] => {
    const all = readGameRecords();
    return all[studentId] ?? [];
  },

  saveGameRecord: (record: StoredGameRecord) => {
    const all = readGameRecords();
    const list = all[record.studentId] ?? [];
    all[record.studentId] = [...list, record];
    writeGameRecords(all);
  },

  deleteGameRecord: (studentId: string, recordId: string) => {
    const all = readGameRecords();
    const list = all[studentId] ?? [];
    all[studentId] = list.filter(r => r.id !== recordId);
    writeGameRecords(all);
  },

  getTopSolvers: (limit = 3): Student[] => {
    const students = storage.getStudents();
    return students
      .filter(s => s.puzzlesCorrect > 0)
      .sort((a, b) => b.puzzleScore - a.puzzleScore || b.puzzlesCorrect - a.puzzlesCorrect)
      .slice(0, limit);
  },
};
