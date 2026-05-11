/**
 * ScholarForge Chess — student store.
 *
 * Reactive Zustand mirror over the existing storage layer. The store is the
 * canonical in-memory student list; lib/storage is the canonical persistence
 * layer. The legacy useStudents hook now delegates here so layout.tsx and
 * other consumers stay on their existing API while we route all writes through
 * one place.
 */

import { create } from "zustand";
import { storage } from "../lib/storage";
import type { Student, GameRecord } from "../types";
import type { Puzzle as LegacyPuzzle } from "../lib/storage";

interface StudentState {
  students: Student[];
  activeStudentId: string | null;

  refreshFromStorage: () => void;

  // CRUD
  addStudent: (firstName: string, lastInitial: string) => Student;
  deleteStudent: (id: string) => void;
  setActiveStudent: (id: string | null) => void;

  // Puzzle / game stats (Phase 1 puzzle UI keeps using these)
  recordPuzzleAttempt: (puzzle: LegacyPuzzle, opts: { correct: boolean; hintsUsed: number }) => void;
  recordGameResult: (result: "win" | "loss" | "draw") => void;
  resetStudentSession: (id: string) => void;

  // Game records (PGN history) — new in Phase 1
  saveGameRecord: (record: GameRecord) => void;
  listGameRecords: (studentId: string) => GameRecord[];
  deleteGameRecord: (studentId: string, recordId: string) => void;
}

function broadcastStorage() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("owls-storage"));
  }
}

export const useStudentStore = create<StudentState>((set, get) => {
  if (typeof window !== "undefined") {
    const handler = () => get().refreshFromStorage();
    window.addEventListener("owls-storage", handler);
    window.addEventListener("storage", handler);
  }

  return {
    students: storage.getStudents(),
    activeStudentId: storage.getActiveStudentId(),

    refreshFromStorage: () => {
      set({
        students: storage.getStudents(),
        activeStudentId: storage.getActiveStudentId(),
      });
    },

    addStudent: (firstName, lastInitial) => {
      const created = storage.addStudent(firstName, lastInitial);
      // Auto-activate the first student added if none is active.
      if (!get().activeStudentId) {
        storage.setActiveStudentId(created.id);
      }
      get().refreshFromStorage();
      broadcastStorage();
      return created;
    },

    deleteStudent: (id) => {
      storage.deleteStudent(id);
      get().refreshFromStorage();
      broadcastStorage();
    },

    setActiveStudent: (id) => {
      storage.setActiveStudentId(id);
      get().refreshFromStorage();
      broadcastStorage();
    },

    recordPuzzleAttempt: (puzzle, opts) => {
      const id = get().activeStudentId;
      if (!id) return;
      storage.recordPuzzleAttempt(id, puzzle, opts);
      get().refreshFromStorage();
      broadcastStorage();
    },

    recordGameResult: (result) => {
      const id = get().activeStudentId;
      if (!id) return;
      storage.recordGameResult(id, result);
      get().refreshFromStorage();
      broadcastStorage();
    },

    resetStudentSession: (id) => {
      storage.resetStudentSession(id);
      get().refreshFromStorage();
      broadcastStorage();
    },

    saveGameRecord: (record) => {
      storage.saveGameRecord(record);
      // The persisted shape matches in-memory shape, so no projection needed.
      broadcastStorage();
    },

    listGameRecords: (studentId) => {
      return storage.listGameRecords(studentId) as GameRecord[];
    },

    deleteGameRecord: (studentId, recordId) => {
      storage.deleteGameRecord(studentId, recordId);
      broadcastStorage();
    },
  };
});
