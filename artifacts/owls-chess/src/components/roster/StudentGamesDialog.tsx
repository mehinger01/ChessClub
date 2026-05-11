/**
 * StudentGamesDialog — per-student PGN history.
 *
 * Lists the saved GameRecords for one student. Each row shows the date,
 * opponent, result, and move count, plus actions to download the PGN as a
 * file or delete the record. The list is read directly from studentStore
 * (which delegates to lib/storage), so it stays in sync as new games are
 * saved from the play page.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useStudentStore } from "../../stores/studentStore";
import type { Student, GameRecord } from "../../types";
import { getProviders } from "../../providers";

export interface StudentGamesDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function resultLabel(
  rec: GameRecord,
  studentDisplayName: string | undefined,
): { text: string; tone: "win" | "loss" | "draw" | "unknown" } {
  // Determine outcome from the perspective of the student whose history we're
  // viewing. Compare the persisted White/Black header values to the student's
  // displayName. If the student doesn't appear on either side (rare — display
  // name was edited after the game), we fall back to the raw PGN result.
  if (rec.result === "1/2-1/2") return { text: "Draw", tone: "draw" };
  const playedWhite = !!studentDisplayName && rec.white === studentDisplayName;
  const playedBlack = !!studentDisplayName && rec.black === studentDisplayName;
  if (rec.result === "1-0") {
    if (playedWhite) return { text: "Win", tone: "win" };
    if (playedBlack) return { text: "Loss", tone: "loss" };
    return { text: "1-0", tone: "unknown" };
  }
  if (rec.result === "0-1") {
    if (playedBlack) return { text: "Win", tone: "win" };
    if (playedWhite) return { text: "Loss", tone: "loss" };
    return { text: "0-1", tone: "unknown" };
  }
  return { text: rec.result || "*", tone: "unknown" };
}

function downloadPgn(rec: GameRecord) {
  const blob = new Blob([rec.pgn], { type: "application/x-chess-pgn;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const datePart = rec.date.slice(0, 10);
  a.href = url;
  a.download = `owls-chess-${rec.white}-vs-${rec.black}-${datePart}.pgn`.replace(/\s+/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function StudentGamesDialog({ student, open, onOpenChange }: StudentGamesDialogProps) {
  const listGameRecords = useStudentStore(s => s.listGameRecords);
  const deleteGameRecord = useStudentStore(s => s.deleteGameRecord);
  // Read once per open via a local revision counter so the list refreshes after
  // each delete without subscribing the dialog to every store change.
  const [rev, setRev] = useState(0);
  const records = useMemo<GameRecord[]>(() => {
    if (!student) return [];
    return [...listGameRecords(student.id)].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [student, listGameRecords, rev]);

  const [pendingDelete, setPendingDelete] = useState<GameRecord | null>(null);

  const onConfirmDelete = () => {
    if (!student || !pendingDelete) return;
    deleteGameRecord(student.id, pendingDelete.id);
    getProviders().audit.log({
      actorUserId: "local-admin",
      actionType: "game.deleted",
      targetType: "student",
      targetId: student.id,
      details: { recordId: pendingDelete.id },
    });
    setPendingDelete(null);
    setRev(r => r + 1);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="games-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {student ? `${student.displayName}'s games` : "Games"}
            </DialogTitle>
            <DialogDescription>
              Every completed game saved on this device. Download the PGN to open in Lichess, ChessBase, or any chess tool.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {records.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground" data-testid="games-empty">
                <p className="text-sm">No saved games yet.</p>
                <p className="text-xs mt-1">Games are saved automatically when they end on the Play page.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border" data-testid="games-list">
                {records.map(rec => {
                  const r = resultLabel(rec, student?.displayName);
                  const opponent = rec.white === student?.displayName ? rec.black : rec.white;
                  const playedAs = rec.white === student?.displayName ? "White" : "Black";
                  const toneClass =
                    r.tone === "win" ? "text-green-600 dark:text-green-400" :
                    r.tone === "loss" ? "text-red-600 dark:text-red-400" :
                    r.tone === "draw" ? "text-amber-600 dark:text-amber-400" :
                    "text-muted-foreground";
                  return (
                    <li key={rec.id} className="py-3 flex items-center gap-3" data-testid={`game-row-${rec.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-semibold ${toneClass}`}>{r.text}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium truncate">{opponent || "Opponent"}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{playedAs}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(rec.date), "MMM d, yyyy 'at' h:mm a")} · {rec.moveCount} moves
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadPgn(rec)}
                        title="Download PGN"
                        data-testid={`game-download-${rec.id}`}
                      >
                        <Download className="w-4 h-4" />
                        <span className="sr-only">Download PGN</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(rec)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete game"
                        data-testid={`game-delete-${rec.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game?</AlertDialogTitle>
            <AlertDialogDescription>
              The PGN will be permanently removed from this device. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="game-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} data-testid="game-delete-confirm">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
