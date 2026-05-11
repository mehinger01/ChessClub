/**
 * NovicePanel — shown below the board when Novice Mode is ON and a piece is selected.
 * Displays the piece name, a beginner-friendly move tip, and any threat information.
 */
import { AlertTriangle } from "lucide-react";
import { getPieceCode, PIECE_NAMES, PIECE_MOVE_TIPS } from "../../lib/novice";

interface NovicePanelProps {
  fen: string;
  selectedSquare: string | null;
  attackerSquares: string[];
}

export function NovicePanel({ fen, selectedSquare, attackerSquares }: NovicePanelProps) {
  if (!selectedSquare) return null;

  const pieceCode = getPieceCode(fen, selectedSquare);
  if (!pieceCode) return null;

  const pieceName = PIECE_NAMES[pieceCode] ?? pieceCode;
  const pieceTypeLetter = pieceCode[1] ?? "";
  const moveTip = PIECE_MOVE_TIPS[pieceTypeLetter] ?? "";
  const isUnderThreat = attackerSquares.length > 0;

  const attackerNames = attackerSquares
    .map(sq => getPieceCode(fen, sq))
    .filter((c): c is string => c !== null)
    .map(c => PIECE_NAMES[c] ?? c);

  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{pieceName}</span>
        {isUnderThreat && (
          <span className="flex items-center gap-1 text-xs text-destructive font-medium shrink-0">
            <AlertTriangle className="w-3 h-3" />
            Under attack
          </span>
        )}
      </div>
      {moveTip && (
        <p className="text-xs text-muted-foreground leading-relaxed">{moveTip}</p>
      )}
      {isUnderThreat && attackerNames.length > 0 && (
        <p className="text-xs text-destructive/80">
          Attacked by: {attackerNames.join(", ")}
        </p>
      )}
    </div>
  );
}
