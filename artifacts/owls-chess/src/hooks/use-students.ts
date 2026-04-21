import { useState, useEffect } from "react";
import { storage, Student, Puzzle } from "../lib/storage";

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents());
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => storage.getActiveStudentId());

  useEffect(() => {
    const handleStorageChange = () => {
      setStudents(storage.getStudents());
      setActiveStudentId(storage.getActiveStudentId());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("owls-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("owls-storage", handleStorageChange);
    };
  }, []);

  const triggerUpdate = () => {
    setStudents(storage.getStudents());
    window.dispatchEvent(new Event("owls-storage"));
  };

  const addStudent = (firstName: string, lastInitial: string) => {
    const newStudent = storage.addStudent(firstName, lastInitial);
    if (!activeStudentId) {
      storage.setActiveStudentId(newStudent.id);
      setActiveStudentId(newStudent.id);
    }
    triggerUpdate();
    return newStudent;
  };

  const deleteStudent = (id: string) => {
    storage.deleteStudent(id);
    if (activeStudentId === id) {
      setActiveStudentId(null);
    }
    triggerUpdate();
  };

  const setActiveStudent = (id: string | null) => {
    storage.setActiveStudentId(id);
    setActiveStudentId(id);
    triggerUpdate();
  };

  const recordPuzzleAttempt = (
    puzzle: Puzzle,
    opts: { correct: boolean; hintsUsed: number }
  ) => {
    if (!activeStudentId) return null;
    const a = storage.recordPuzzleAttempt(activeStudentId, puzzle, opts);
    triggerUpdate();
    return a;
  };

  const recordGameResult = (result: "win" | "loss" | "draw") => {
    if (!activeStudentId) return;
    storage.recordGameResult(activeStudentId, result);
    triggerUpdate();
  };

  const resetStudentSession = (id: string) => {
    storage.resetStudentSession(id);
    triggerUpdate();
  };

  const activeStudent = students.find(s => s.id === activeStudentId) || null;

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
    triggerUpdate,
  };
}
