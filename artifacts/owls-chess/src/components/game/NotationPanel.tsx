/**
 * NotationPanel — scrollable move list with click-to-navigate.
 *
 * Phase 5A additions:
 *  - Copy PGN button: copies anonymized PGN (White/Black) to clipboard.
 *  - Download PGN button: downloads a dated .pgn file.
 *  Both buttons appear in the panel footer and are enabled as soon as there
 *  is at least one move.
 */
import { useEffect, useRef } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "../../stores/gameStore";
import { formatThinkingTime, thinkingTimeBand } from "../../lib/game/capturedPieces";
import { cn } from "../../lib/utils";
import { AnnotationPopover } from "./AnnotationPopover";
import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { downloadPgn, buildPgnFilename } from "../../lib/gameArchive";

export function NotationPanel() {
  const moveHistory = useGameStore(s => s.moveHistory);
  const currentMoveIndex = useGameStore(s => s.currentMoveIndex);
  const timesPerMove = useGameStore(s => s.timesPerMove);
  const isReviewing = useGameStore(s => s.isReviewing);
  const navigateTo = useGameStore(s => s.navigateTo);
  const navigateLatest = useGameStore(s => s.navigateLatest);
  const violations = useGameStore(s => s.openingViolations);
  const annotations = useGameStore(s => s.annotations);
  const getExportPGN = useGameStore(s => s.getExportPGN);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Map moveIndex → first violation found for that index (one icon max per row).
  const violationByIndex = new Map<number, string>();
  for (const v of violations) {
    if (!violationByIndex.has(v.moveIndex)) violationByIndex.set(v.moveIndex, v.explanation);
  }

  // Keep the latest move visible when not in review mode.
  useEffect(() => {
    if (!isReviewing && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moveHistory.length, isReviewing]);

  // Group half-moves into full move pairs: [white, black?]
  const pairs: { number: number; whiteIdx: number; whiteSan?: string; blackIdx: number; blackSan?: string }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      whiteIdx: i,
      whiteSan: moveHistory[i],
      blackIdx: i + 1,
      blackSan: moveHistory[i + 1],
    });
  }

  const hasMoves = moveHistory.length > 0;

  const handleCopyPGN = async () => {
    try {
      const pgn = getExportPGN();
      await navigator.clipboard.writeText(pgn);
      toast.success("PGN copied to clipboard");
    } catch {
      toast.error("Could not access clipboard");
    }
  };

  const handleDownloadPGN = () => {
    const pgn = getExportPGN();
    const filename = buildPgnFilename(Date.now());
    downloadPgn(pgn, filename);
    toast.success(`Downloading ${filename}`);
  };

  if (moveHistory.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic px-3 py-6 text-center">
        No moves yet. White to play.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {isReviewing && (
        <button
          onClick={navigateLatest}
          className="text-xs font-medium px-3 py-1.5 mb-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          data-testid="button-jump-to-latest"
        >
          Jump to latest move
        </button>
      )}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto pr-1"
        data-testid="notation-list"
      >
        <div className="grid grid-cols-[2.25rem_1fr_1fr] gap-x-1 gap-y-0.5 text-sm font-mono">
          {pairs.map(p => {
            const wTime = timesPerMove[p.whiteIdx];
            const bTime = timesPerMove[p.blackIdx];
            return (
              <div className="contents" key={p.number}>
                <div className="text-muted-foreground text-right pr-1 leading-7">{p.number}.</div>
                <MoveCell
                  san={p.whiteSan}
                  moveIndex={p.whiteIdx}
                  active={currentMoveIndex === p.whiteIdx}
                  thinkingMs={wTime}
                  violation={violationByIndex.get(p.whiteIdx)}
                  hasNote={!!annotations[p.whiteIdx]}
                  onClick={() => navigateTo(p.whiteIdx)}
                  testId={`notation-move-${p.whiteIdx}`}
                />
                <MoveCell
                  san={p.blackSan}
                  moveIndex={p.blackIdx}
                  active={currentMoveIndex === p.blackIdx}
                  thinkingMs={bTime}
                  violation={violationByIndex.get(p.blackIdx)}
                  hasNote={!!annotations[p.blackIdx]}
                  onClick={p.blackSan ? () => navigateTo(p.blackIdx) : undefined}
                  testId={p.blackSan ? `notation-move-${p.blackIdx}` : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* PGN export toolbar — shown once there are moves */}
      {hasMoves && (
        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleCopyPGN}
            data-testid="button-copy-pgn"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy PGN
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleDownloadPGN}
            data-testid="button-download-pgn"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PGN
          </Button>
        </div>
      )}
    </div>
  );
}

interface MoveCellProps {
  san?: string;
  moveIndex: number;
  active: boolean;
  thinkingMs?: number;
  violation?: string;
  hasNote: boolean;
  onClick?: () => void;
  testId?: string;
}

function MoveCell({ san, moveIndex, active, thinkingMs, violation, hasNote, onClick, testId }: MoveCellProps) {
  if (!san) return <div />;
  const band = thinkingMs != null ? thinkingTimeBand(thinkingMs) : "normal";
  return (
    <div
      className={cn(
        "group flex items-center gap-1 leading-7 px-1 rounded transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className="flex-1 flex items-center justify-between gap-1 px-1 text-left min-w-0"
      >
        <span className="flex items-center gap-1 truncate">
          <span className="truncate">{san}</span>
          {violation && (
            <AlertTriangle
              className={cn("w-3 h-3 shrink-0", active ? "text-amber-200" : "text-amber-600 dark:text-amber-400")}
              aria-label="Opening principle warning"
              data-testid={`violation-marker-${moveIndex}`}
            />
          )}
          {hasNote && (
            <span
              className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-primary-foreground" : "bg-primary")}
              aria-label="Has note"
              data-testid={`note-dot-${moveIndex}`}
            />
          )}
        </span>
        {thinkingMs != null && thinkingMs > 0 && (
          <span
            className={cn(
              "flex items-center gap-1 text-[0.65rem] font-sans shrink-0",
              active ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {band !== "normal" && (
              <span
                aria-hidden
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  band === "instant" && "bg-[var(--timer-instant,theme(colors.orange.500))]",
                  band === "long" && "bg-[var(--timer-long,theme(colors.blue.500))]",
                )}
              />
            )}
            {formatThinkingTime(thinkingMs)}
          </span>
        )}
      </button>
      <AnnotationPopover moveIndex={moveIndex} san={san} />
    </div>
  );
}
