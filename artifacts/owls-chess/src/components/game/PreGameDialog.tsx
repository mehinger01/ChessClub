/**
 * PreGameDialog — name + side selection before a game starts.
 *
 * Rendered while gameStore.hasStarted === false. If an active student is
 * selected in the global header, their displayName auto-fills the chosen side;
 * the other side defaults to "Opponent" but is editable so two ad-hoc players
 * can also play without registering. Calls gameStore.startGame on submit.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useGameStore } from "../../stores/gameStore";
import { useStudents } from "../../hooks/use-students";

export interface PreGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreGameDialog({ open, onOpenChange }: PreGameDialogProps) {
  const { activeStudent } = useStudents();
  const startGame = useGameStore(s => s.startGame);

  const [studentSide, setStudentSide] = useState<"white" | "black">("white");
  const [whiteName, setWhiteName] = useState(activeStudent?.displayName ?? "");
  const [blackName, setBlackName] = useState("Opponent");
  const [mode, setMode] = useState<"casual" | "tournament">("casual");

  // Auto-fill when student or side changes (only if user hasn't typed something custom).
  const studentName = activeStudent?.displayName ?? "";
  const handleSideChange = (next: "white" | "black") => {
    setStudentSide(next);
    if (studentName) {
      if (next === "white") {
        setWhiteName(studentName);
        if (blackName === studentName) setBlackName("Opponent");
      } else {
        setBlackName(studentName);
        if (whiteName === studentName) setWhiteName("Opponent");
      }
    }
  };

  const onStart = () => {
    const w = (whiteName || "White").trim();
    const b = (blackName || "Black").trim();
    startGame({
      whitePlayer: w,
      blackPlayer: b,
      mode,
      studentId: activeStudent?.id ?? null,
      flipForBlack: !!activeStudent && studentSide === "black",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="pregame-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Start a new game</DialogTitle>
          <DialogDescription>
            {activeStudent
              ? `Playing as ${activeStudent.displayName}. Pick a side, name your opponent, choose a mode.`
              : "Enter both players' names below. Pick a student in the header to track stats."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {activeStudent && (
            <div className="space-y-2">
              <Label>Your side</Label>
              <RadioGroup value={studentSide} onValueChange={v => handleSideChange(v as "white" | "black")} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="white" id="side-white" data-testid="radio-side-white" />
                  <Label htmlFor="side-white" className="font-normal cursor-pointer">White</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="black" id="side-black" data-testid="radio-side-black" />
                  <Label htmlFor="side-black" className="font-normal cursor-pointer">Black</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="white-name">White player</Label>
              <Input
                id="white-name"
                value={whiteName}
                onChange={e => setWhiteName(e.target.value)}
                placeholder="White"
                data-testid="input-white-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="black-name">Black player</Label>
              <Input
                id="black-name"
                value={blackName}
                onChange={e => setBlackName(e.target.value)}
                placeholder="Black"
                data-testid="input-black-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Game mode</Label>
            <RadioGroup value={mode} onValueChange={v => setMode(v as "casual" | "tournament")} className="grid grid-cols-2 gap-2">
              <Label
                htmlFor="mode-casual"
                className="flex items-start gap-2 p-3 rounded-md border border-border hover:border-primary/50 cursor-pointer has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
              >
                <RadioGroupItem value="casual" id="mode-casual" className="mt-0.5" data-testid="radio-mode-casual" />
                <div className="text-sm">
                  <div className="font-medium">Casual</div>
                  <div className="text-xs text-muted-foreground">Undo allowed.</div>
                </div>
              </Label>
              <Label
                htmlFor="mode-tournament"
                className="flex items-start gap-2 p-3 rounded-md border border-border hover:border-primary/50 cursor-pointer has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
              >
                <RadioGroupItem value="tournament" id="mode-tournament" className="mt-0.5" data-testid="radio-mode-tournament" />
                <div className="text-sm">
                  <div className="font-medium">Tournament</div>
                  <div className="text-xs text-muted-foreground">No undo. Final.</div>
                </div>
              </Label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="pregame-cancel">Cancel</Button>
          <Button onClick={onStart} data-testid="pregame-start">Start game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
