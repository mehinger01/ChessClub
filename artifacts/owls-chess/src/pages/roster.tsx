import { useState } from "react";
import { useStudents } from "../hooks/use-students";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { UserPlus, Trash2, Download, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Roster() {
  const { students, addStudent, deleteStudent, activeStudentId } = useStudents();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");

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

  const handleExport = () => {
    if (students.length === 0) {
      toast.error("No students to export");
      return;
    }

    const headers = ["ID", "Name", "Attempts", "Solved", "Accuracy", "Last Active"];
    const rows = students.map(s => [
      s.id,
      s.displayName,
      s.attempts,
      s.solved,
      `${s.attempts > 0 ? Math.round((s.solved / s.attempts) * 100) : 0}%`,
      new Date(s.lastActive).toISOString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `owls-chess-roster-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Club Roster</h1>
          <p className="text-muted-foreground mt-1">Manage students and track puzzle performance.</p>
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
                    <label htmlFor="firstName" className="text-right text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      className="col-span-3"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="lastInitial" className="text-right text-sm font-medium">
                      Last Initial
                    </label>
                    <Input
                      id="lastInitial"
                      value={lastInitial}
                      onChange={(e) => setLastInitial(e.target.value)}
                      placeholder="P"
                      maxLength={1}
                      className="col-span-3"
                    />
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
            <p className="max-w-sm mb-6">Add your club members to start tracking their progress on tactical puzzles.</p>
            <Button onClick={() => setIsAddOpen(true)} variant="outline">
              <UserPlus className="w-4 h-4 mr-2" /> Add First Student
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px]">Student Name</TableHead>
                  <TableHead className="text-right">Puzzles Attempted</TableHead>
                  <TableHead className="text-right">Solved</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const accuracy = student.attempts > 0 
                    ? Math.round((student.solved / student.attempts) * 100) 
                    : 0;
                    
                  const isActive = student.id === activeStudentId;
                  
                  return (
                    <TableRow key={student.id} className={isActive ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                            {student.firstName.charAt(0)}{student.lastInitial}
                          </div>
                          {student.displayName}
                          {isActive && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Active</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{student.attempts}</TableCell>
                      <TableCell className="text-right">{student.solved}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : 'bg-primary'}`} 
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs font-medium">{accuracy}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(student.lastActive, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
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
    </div>
  );
}
