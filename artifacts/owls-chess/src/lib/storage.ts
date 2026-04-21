export interface Student {
  id: string;
  firstName: string;
  lastInitial: string;
  displayName: string;
  attempts: number;
  solved: number;
  lastActive: number; // timestamp
}

export interface PuzzleAttempt {
  id: string;
  puzzleId: string;
  studentId: string;
  correct: boolean;
  timestamp: number;
}

export interface Puzzle {
  id: string;
  title: string;
  fen: string;
  sideToMove: "w" | "b";
  solution: string[]; // SAN moves
  difficulty: "easy" | "medium" | "hard";
}

const STUDENTS_KEY = "owls_students";
const ATTEMPTS_KEY = "owls_attempts";
const ACTIVE_STUDENT_KEY = "owls_active_student";

export const storage = {
  getStudents: (): Student[] => {
    try {
      const data = localStorage.getItem(STUDENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  saveStudents: (students: Student[]) => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  },
  
  addStudent: (firstName: string, lastInitial: string) => {
    const students = storage.getStudents();
    const newStudent: Student = {
      id: crypto.randomUUID(),
      firstName,
      lastInitial,
      displayName: `${firstName} ${lastInitial}.`,
      attempts: 0,
      solved: 0,
      lastActive: Date.now()
    };
    storage.saveStudents([...students, newStudent]);
    return newStudent;
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
      const students = storage.getStudents();
      const updated = students.map(s => s.id === id ? { ...s, lastActive: Date.now() } : s);
      storage.saveStudents(updated);
    } else {
      localStorage.removeItem(ACTIVE_STUDENT_KEY);
    }
  },
  
  getAttempts: (): PuzzleAttempt[] => {
    try {
      const data = localStorage.getItem(ATTEMPTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  saveAttempts: (attempts: PuzzleAttempt[]) => {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  },
  
  recordAttempt: (studentId: string, puzzleId: string, correct: boolean) => {
    const attempts = storage.getAttempts();
    const newAttempt: PuzzleAttempt = {
      id: crypto.randomUUID(),
      puzzleId,
      studentId,
      correct,
      timestamp: Date.now()
    };
    storage.saveAttempts([...attempts, newAttempt]);
    
    // Update student stats
    const students = storage.getStudents();
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          attempts: s.attempts + 1,
          solved: s.solved + (correct ? 1 : 0),
          lastActive: Date.now()
        };
      }
      return s;
    });
    storage.saveStudents(updatedStudents);
    
    return newAttempt;
  },
  
  getTopSolvers: (limit = 3): Student[] => {
    const students = storage.getStudents();
    return students
      .filter(s => s.solved > 0)
      .sort((a, b) => b.solved - a.solved)
      .slice(0, limit);
  }
};
