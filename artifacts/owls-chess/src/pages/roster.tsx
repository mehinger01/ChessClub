import { useState } from "react";
import { useStudents } from "../hooks/use-students";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { UserPlus, Trash2, Download, Users, RefreshCcw, History } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { StudentGamesDialog } from "../components/roster/StudentGamesDialog";
import type { Student } from "../types";
import { useStudentStore } from "../stores/studentStore";

export default function Roster() {
  const { students, addStudent, deleteStudent, activeStudentId, resetStudentSession } = useStudents();
  const listGameRecords = useStudentStore(s => s.listGameRecords);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [gamesFor, setGamesFor] = useState<Student | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastInitial.trim()) {
      toast.error("Please provide both first name and last initial");
      return;
    }
    addStudent(firstName.trim(), lastInitial.trim().charAt(0).toUpperCase());
    setFirstName("");
    setLastInitial("");
    setIsAddOpen(false);
    toast.success("Student added successfully");
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the roster?`)) {
      deleteStudent(id);
      toast.success(`${name} removed from roster`);
    }
  };

  const handleResetSession = (id: string, name: string) => {
    resetStudentSession(id);
    toast.success(`Session puzzles reset for ${name}`);
  };

  const handleExport = () => {
    if (students.length === 0) {
      toast.error("No students to export");
      return;
    }

    const headers = [
      "ID", "Name", "Level",
      "PuzzlesAttempted", "PuzzlesCorrect", "PuzzlesIncorrect",
      "PuzzleScore", "Accuracy",
      "GamesPlayed", "Wins", "Losses", "Draws",
      "LastActive",
    ];
    const rows = students.map(s => [
      s.id, s.displayName, s.currentLevel,
      s.puzzlesAttempted, s.puzzlesCorrect, s.puzzlesIncorrect,
      s.puzzleScore,
      `${s.puzzlesAttempted > 0 ? Math.round((s.puzzlesCorrect / s.puzzlesAttempted) * 100) : 0}%`,
      s.gamesPlayed, s.wins, s.losses, s.draws,
      new Date(s.lastActive).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `owls-chess-roster-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Club Roster</h1>
          <p className="text-muted-foreground mt-1">Manage students and track puzzle and game performance.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90">
                <UserPlus className="w-4 h-4 mr-2" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Add a student to track their puzzle progress. We use first name and last initial for privacy.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="firstName" className="text-right text-sm font-medium">First Name</label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Alex" className="col-span-3" autoFocus />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="lastInitial" className="text-right text-sm font-medium">Last Initial</label>
                    <Input id="lastInitial" value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} placeholder="P" maxLength={1} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-primary text-primary-foreground">Save Student</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="flex-1 border-border/50 shadow-sm bg-card overflow-hidden flex flex-col">
        {students.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-serif text-foreground font-medium mb-2">No students yet</h3>
            <p className="max-w-sm mb-6">Add your club members to start tracking their progress.</p>
            <Button onClick={() => setIsAddOpen(true)} variant="outline">
              <UserPlus className="w-4 h-4 mr-2" /> Add First Student
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[220px]">Student</TableHead>
                  <TableHead className="text-center">Level</TableHead>
                  <TableHead className="text-right">Puzzles</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Games (W-L-D)</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const accuracy = student.puzzlesAttempted > 0
                    ? Math.round((student.puzzlesCorrect / student.puzzlesAttempted) * 100)
                    : 0;
                  const isActive = student.id === activeStudentId;

                  return (
                    <TableRow key={student.id} className={isActive ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            {student.firstName.charAt(0)}{student.lastInitial}
                          </div>
                          <div>
                            <div>{student.displayName}</div>
                            {isActive && <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">Active</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">L{student.currentLevel}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span className="font-medium">{student.puzzlesCorrect}</span>
                        <span className="text-muted-foreground"> / {student.puzzlesAttempted}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{student.puzzleScore}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${accuracy >= 80 ? "bg-green-500" : accuracy >= 50 ? "bg-yellow-500" : "bg-primary"}`}
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs font-medium">{accuracy}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {student.gamesPlayed}
                        <span className="text-muted-foreground ml-1">({student.wins}-{student.losses}-{student.draws})</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(student.lastActive, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setGamesFor(student)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="View saved games"
                          data-testid={`button-games-${student.id}`}
                        >
                          <History className="w-4 h-4" />
                          <span className="sr-only">View games</span>
                          {(() => {
                            const n = listGameRecords(student.id).length;
                            return n > 0 ? (
                              <span className="ml-0.5 text-[10px] font-bold tabular-nums" aria-label={`${n} games`}>{n}</span>
                            ) : null;
                          })()}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetSession(student.id, student.displayName)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Reset session puzzles"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          <span className="sr-only">Reset session</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student.id, student.displayName)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <StudentGamesDialog
        student={gamesFor}
        open={!!gamesFor}
        onOpenChange={open => { if (!open) setGamesFor(null); }}
      />
    </div>
  );
}
