/**
 * PlayerBar — name + captured pieces + material advantage for one side.
 *
 * Captured pieces are derived from the current FEN, never tracked separately,
 * so review-mode navigation shows the correct captures for each historical
 * position without any state-sync code.
 */
import { useMemo } from "react";
import { useGameStore } from "../../stores/gameStore";
import { deriveCapturedPieces, type PieceCounts } from "../../lib/game/capturedPieces";
import { cn } from "../../lib/utils";

export interface PlayerBarProps {
  side: "white" | "black";
}

const PIECE_GLYPH: Record<keyof PieceCounts, { white: string; black: string }> = {
  P: { white: "♙", black: "♟" },
  N: { white: "♘", black: "♞" },
  B: { white: "♗", black: "♝" },
  R: { white: "♖", black: "♜" },
  Q: { white: "♕", black: "♛" },
  K: { white: "♔", black: "♚" },
};

const ORDER: (keyof PieceCounts)[] = ["P", "N", "B", "R", "Q"];

export function PlayerBar({ side }: PlayerBarProps) {
  const fen = useGameStore(s => s.fen);
  const whitePlayer = useGameStore(s => s.whitePlayer);
  const blackPlayer = useGameStore(s => s.blackPlayer);
  const activeColor = useGameStore(s => s.activeColor);
  const isGameOver = useGameStore(s => s.isGameOver);

  const captured = useMemo(() => deriveCapturedPieces(fen), [fen]);
  const name = side === "white" ? whitePlayer : blackPlayer;
  const isOnMove = !isGameOver && activeColor === (side === "white" ? "w" : "b");

  // The opponent's side is what THIS side has captured. e.g. white's bar shows
  // black pieces white has taken, plus the material advantage from white's POV.
  const piecesIveCaptured = side === "white" ? captured.capturedFromBlack : captured.capturedFromWhite;
  const glyphSide: "white" | "black" = side === "white" ? "black" : "white";
  const advantageForMe = side === "white" ? captured.materialAdvantage : -captured.materialAdvantage;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg border",
        isOnMove ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
      data-testid={`player-bar-${side}`}
    >
      <div
        className={cn(
          "w-3 h-3 rounded-full flex-shrink-0 border",
          side === "white" ? "bg-white border-zinc-400" : "bg-zinc-900 border-zinc-700",
          isOnMove && "ring-2 ring-primary",
        )}
        aria-hidden
      />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="font-semibold truncate" data-testid={`player-name-${side}`}>{name}</div>
        <CapturedRow pieces={piecesIveCaptured} glyphSide={glyphSide} advantage={advantageForMe} />
      </div>
    </div>
  );
}

interface CapturedRowProps {
  pieces: PieceCounts;
  glyphSide: "white" | "black";
  advantage: number;
}

function CapturedRow({ pieces, glyphSide, advantage }: CapturedRowProps) {
  const items = ORDER.flatMap(p => Array.from({ length: pieces[p] }, () => PIECE_GLYPH[p][glyphSide]));
  if (items.length === 0 && advantage === 0) {
    return <div className="text-xs text-muted-foreground italic">No captures</div>;
  }
  return (
    <div className="flex items-center gap-1 text-base leading-none">
      <span className="flex items-center flex-wrap text-foreground/80 leading-none">
        {items.map((g, i) => <span key={i}>{g}</span>)}
      </span>
      {advantage > 0 && (
        <span className="text-xs font-medium text-foreground/70 ml-1">+{advantage}</span>
      )}
    </div>
  );
}
