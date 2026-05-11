/**
 * GameArchiveModal — local game archive panel.
 *
 * Shows all completed games saved to localStorage (owls_archive_v1) with:
 *  - Date, result, move count per entry
 *  - Copy PGN, Download PGN, Delete per entry
 *  - PGN viewer (expand/collapse) per entry
 *
 * Privacy: all PGN in the archive uses [White "White"] / [Black "Black"].
 * Internal player IDs are never displayed or exported.
 */
import { useState, useEffect } from "react";
import { Trash2, Copy, Download, ChevronDown, ChevronUp, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import { gameArchive, downloadPgn, buildPgnFilename, type ArchivedGame } from "../../lib/gameArchive";

interface GameArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GameArchiveModal({ open, onOpenChange }: GameArchiveModalProps) {
  const [games, setGames] = useState<ArchivedGame[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reload archive whenever the modal opens or the owls-storage event fires
  const reload = () => setGames(gameArchive.list());
  useEffect(() => {
    if (open) reload();
  }, [open]);
  useEffect(() => {
    window.addEventListener("owls-storage", reload);
    return () => window.removeEventListener("owls-storage", reload);
  }, []);

  const handleCopy = async (game: ArchivedGame) => {
    try {
      await navigator.clipboard.writeText(game.pgn);
      toast.success("PGN copied to clipboard");
    } catch {
      toast.error("Could not access clipboard");
    }
  };

  const handleDownload = (game: ArchivedGame) => {
    downloadPgn(game.pgn, buildPgnFilename(game.timestamp));
    toast.success(`Downloading ${buildPgnFilename(game.timestamp)}`);
  };

  const handleDelete = (gameId: string) => {
    gameArchive.delete(gameId);
    setGames(gameArchive.list());
    toast.success("Game removed from archive");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" data-testid="archive-modal">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              Game Archive
            </DialogTitle>
            <DialogDescription>
              Completed games saved on this device. PGN exports use anonymous player names for privacy.
            </DialogDescription>
          </DialogHeader>

          {games.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground italic">
              No archived games yet. Games are saved here automatically when they finish.
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-2 py-1" data-testid="archive-list">
                {games.map(game => (
                  <ArchiveEntry
                    key={game.gameId}
                    game={game}
                    expanded={expandedId === game.gameId}
                    onToggleExpand={() =>
                      setExpandedId(prev => (prev === game.gameId ? null : game.gameId))
                    }
                    onCopy={() => handleCopy(game)}
                    onDownload={() => handleDownload(game)}
                    onDelete={() => setDeleteTarget(game.gameId)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game?</AlertDialogTitle>
            <AlertDialogDescription>
              This game will be permanently removed from the local archive. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="archive-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) handleDelete(deleteTarget); setDeleteTarget(null); }}
              data-testid="archive-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── ArchiveEntry ─────────────────────────────────────────────────────────────

interface ArchiveEntryProps {
  game: ArchivedGame;
  expanded: boolean;
  onToggleExpand: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function ArchiveEntry({ game, expanded, onToggleExpand, onCopy, onDownload, onDelete }: ArchiveEntryProps) {
  const date = new Date(game.timestamp);
  const dateStr = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="rounded-lg border border-border bg-card"
      data-testid={`archive-entry-${game.gameId}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Result badge */}
        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${resultBadgeClass(game.result)}`}>
          {resultLabel(game.result)}
        </span>

        {/* Date + move count */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{dateStr}</div>
          <div className="text-xs text-muted-foreground">{timeStr} &middot; {game.moveCount} moves</div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCopy}
            title="Copy PGN"
            data-testid={`archive-copy-${game.gameId}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDownload}
            title="Download PGN"
            data-testid={`archive-download-${game.gameId}`}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Delete from archive"
            data-testid={`archive-delete-btn-${game.gameId}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onToggleExpand}
            title={expanded ? "Collapse PGN" : "View PGN"}
            data-testid={`archive-expand-${game.gameId}`}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3">
          <pre
            className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words leading-5 max-h-48 overflow-y-auto"
            data-testid={`archive-pgn-${game.gameId}`}
          >
            {game.pgn}
          </pre>
        </div>
      )}
    </div>
  );
}

function resultLabel(result: string): string {
  if (result === "1-0") return "1-0";
  if (result === "0-1") return "0-1";
  if (result === "1/2-1/2") return "½-½";
  return "*";
}

function resultBadgeClass(result: string): string {
  if (result === "1-0") return "bg-primary/10 text-primary";
  if (result === "0-1") return "bg-muted text-muted-foreground";
  if (result === "1/2-1/2") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}
