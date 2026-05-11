/**
 * Compatibility wrapper over the new studentStore. Existing consumers
 * (layout.tsx, roster.tsx, admin.tsx, puzzles.tsx) keep their import path
 * and API surface unchanged. All read/write goes through one source of truth.
 */
import { useStudentStore } from "../stores/studentStore";
import type { Puzzle } from "../lib/storage";

export function useStudents() {
  const students = useStudentStore(s => s.students);
  const activeStudentId = useStudentStore(s => s.activeStudentId);
  const addStudent = useStudentStore(s => s.addStudent);
  const deleteStudent = useStudentStore(s => s.deleteStudent);
  const setActiveStudent = useStudentStore(s => s.setActiveStudent);
  const recordPuzzleAttemptRaw = useStudentStore(s => s.recordPuzzleAttempt);
  const recordGameResult = useStudentStore(s => s.recordGameResult);
  const resetStudentSession = useStudentStore(s => s.resetStudentSession);
  const refresh = useStudentStore(s => s.refreshFromStorage);

  const activeStudent = students.find(s => s.id === activeStudentId) || null;

  // Preserve legacy signature: returns the attempt record (or null) like before.
  // The new store doesn't return the attempt; we re-fetch from storage if a caller
  // ever needs it. Today no caller relies on the return value.
  const recordPuzzleAttempt = (
    puzzle: Puzzle,
    opts: { correct: boolean; hintsUsed: number }
  ) => {
    if (!activeStudentId) return null;
    recordPuzzleAttemptRaw(puzzle, opts);
    return null;
  };

  return {
    students,
    activeStudent,
    activeStudentId,
    addStudent,
    deleteStudent,
    setActiveStudent,
    recordPuzzleAttempt,
    recordGameResult,
    resetStudentSession,
    triggerUpdate: refresh,
  };
}
