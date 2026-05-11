/**
 * GameControls — the row of buttons next to the board:
 *   First / Prev / Next / Last  •  Flip  •  Fullscreen  •  Undo  •  Resign  •  Draw  •  New
 *
 * Phase 5A changes:
 *  - Undo is now enabled after game-over (allows undoing a checkmate, stalemate,
 *    or even a resigned/drawn game). Disabled only at the true starting position
 *    (moveCount === 0).
 *  - canUndo no longer gates on isGameOver; gates only on hasStarted + moveCount.
 */
import { useState } from "react";
import {
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  FlipHorizontal2, Maximize, Minimize, Flag, Handshake, RotateCcw, Undo2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import { useGameStore } from "../../stores/gameStore";

type Confirm = null | "resign-white" | "resign-black" | "draw" | "new";

export interface GameControlsProps {
  onNewGameRequested?: () => void;
}

export function GameControls({ onNewGameRequested }: GameControlsProps) {
  const isFullscreen = useGameStore(s => s.isFullscreen);
  const isGameOver = useGameStore(s => s.isGameOver);
  const isReviewing = useGameStore(s => s.isReviewing);
  const gameMode = useGameStore(s => s.gameMode);
  const hasStarted = useGameStore(s => s.hasStarted);
  const moveCount = useGameStore(s => s.moveHistory.length);

  const navigateFirst = useGameStore(s => s.navigateFirst);
  const navigatePrev = useGameStore(s => s.navigatePrev);
  const navigateNext = useGameStore(s => s.navigateNext);
  const navigateLatest = useGameStore(s => s.navigateLatest);
  const flipBoard = useGameStore(s => s.flipBoard);
  const toggleFullscreen = useGameStore(s => s.toggleFullscreen);
  const resign = useGameStore(s => s.resign);
  const declareDraw = useGameStore(s => s.declareDraw);
  const undo = useGameStore(s => s.undo);

  const [confirm, setConfirm] = useState<Confirm>(null);

  const canNavBack = moveCount > 0;
  const canEndGame = hasStarted && !isGameOver;
  // Undo: enabled in casual mode as long as there are moves — including after game-over.
  // This lets players undo a checkmate/stalemate move to continue the game.
  const canUndo = gameMode === "casual" && hasStarted && moveCount > 0 && !isReviewing;

  const onConfirm = () => {
    switch (confirm) {
      case "resign-white": resign("w"); break;
      case "resign-black": resign("b"); break;
      case "draw": declareDraw(); break;
      case "new": onNewGameRequested?.(); break;
    }
    setConfirm(null);
  };

  const dialog = confirmCopy(confirm);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" data-testid="game-controls">
        <div className="flex items-center gap-1" role="group" aria-label="Move navigation">
          <IconButton label="First move" onClick={navigateFirst} disabled={!canNavBack} testId="nav-first">
            <ChevronFirst className="w-4 h-4" />
          </IconButton>
          <IconButton label="Previous move" onClick={navigatePrev} disabled={!canNavBack} testId="nav-prev">
            <ChevronLeft className="w-4 h-4" />
          </IconButton>
          <IconButton label="Next move" onClick={navigateNext} disabled={!isReviewing} testId="nav-next">
            <ChevronRight className="w-4 h-4" />
          </IconButton>
          <IconButton label="Latest move" onClick={navigateLatest} disabled={!isReviewing} testId="nav-last">
            <ChevronLast className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="h-6 w-px bg-border" aria-hidden />

        <IconButton label="Flip board" onClick={flipBoard} testId="button-flip">
          <FlipHorizontal2 className="w-4 h-4" />
        </IconButton>

        <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} testId="button-fullscreen">
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </IconButton>

        {gameMode === "casual" && (
          <IconButton label="Undo last move" onClick={undo} disabled={!canUndo} testId="button-undo">
            <Undo2 className="w-4 h-4" />
          </IconButton>
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm("draw")}
          disabled={!canEndGame}
          data-testid="button-draw"
        >
          <Handshake className="w-4 h-4 mr-1.5" /> Draw
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm(useGameStore.getState().activeColor === "w" ? "resign-white" : "resign-black")}
          disabled={!canEndGame}
          data-testid="button-resign"
        >
          <Flag className="w-4 h-4 mr-1.5" /> Resign
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setConfirm("new")}
          data-testid="button-new-game"
        >
          <RotateCcw className="w-4 h-4 mr-1.5" /> New game
        </Button>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="confirm-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} data-testid="confirm-ok">{dialog.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function confirmCopy(c: Confirm): { title: string; body: string; confirm: string } {
  switch (c) {
    case "resign-white":
      return { title: "Resign as White?", body: "Black will be awarded the win. This cannot be undone.", confirm: "Resign" };
    case "resign-black":
      return { title: "Resign as Black?", body: "White will be awarded the win. This cannot be undone.", confirm: "Resign" };
    case "draw":
      return { title: "Agree to a draw?", body: "The game will be recorded as a draw. This cannot be undone.", confirm: "Agree to draw" };
    case "new":
      return { title: "Start a new game?", body: "The current game will be discarded. Download or copy the PGN first if you want to keep it.", confirm: "Start new game" };
    default:
      return { title: "", body: "", confirm: "OK" };
  }
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  children: React.ReactNode;
}

function IconButton({ label, onClick, disabled, testId, children }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testId}
      className="h-8 w-8"
    >
      {children}
    </Button>
  );
}
