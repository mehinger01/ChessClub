/**
 * Play — assembled live-game page.
 *
 * Board appearance is driven entirely by UIPreferences overrides + active theme:
 *  - Square colours from ui.boardLight / ui.boardDark (theme fallback when empty).
 *  - All highlight colours from ui.highlight* / ui.dotLegal (theme fallback).
 *  - Optional centered watermark from theme.watermarkImage at ui.watermarkOpacity.
 *  - Custom coordinate overlay (BoardCoords) replaces showBoardNotation.
 *  - Board border from ui.borderColor.
 *
 * Game logic (move validation, drag/drop, undo, PGN, archive) is UNCHANGED.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Archive, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "../stores/gameStore";
import { useSettings } from "../hooks/use-settings";
import { useStudents } from "../hooks/use-students";
import { getTheme } from "../lib/themes";
import { getPieceSet } from "../lib/piece-sets";
import { getProviders } from "../providers";
import { gameArchive } from "../lib/gameArchive";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PlayerBar } from "../components/game/PlayerBar";
import { NotationPanel } from "../components/game/NotationPanel";
import { GameControls } from "../components/game/GameControls";
import { PreGameDialog } from "../components/game/PreGameDialog";
import { GameArchiveModal } from "../components/game/GameArchiveModal";
import { BoardCoords } from "../components/game/BoardCoords";
import { NovicePanel } from "../components/game/NovicePanel";
import { getAttackers, getPieceCode, PIECE_NAMES, squareToPercent } from "../lib/novice";
import { useStudentStore } from "../stores/studentStore";

export default function Play() {
  const { activeStudent, recordGameResult } = useStudents();
  const { settings } = useSettings();
  const theme = getTheme(settings.activeThemeId);
  const ui = settings.uiPreferences;
  const pieceSet = getPieceSet(settings.activePieceSetId);
  const customPieces = useMemo(() => pieceSet.customPieces?.(), [pieceSet.id]);

  // ─── Effective board colours (UIPreferences override > theme default) ─────
  const lightColor = ui.boardLight || theme.lightSquare;
  const darkColor  = ui.boardDark  || theme.darkSquare;
  const borderColor = ui.borderColor || "";

  // Highlight colours
  const lastMoveHighlight = ui.highlightMove   || theme.highlightColor;
  const selectHighlight   = ui.highlightSelect || "rgba(255,235,100,0.55)";
  const checkHighlight    = ui.highlightCheck  || "rgba(239,68,68,0.45)";
  const legalDotColor     = ui.dotLegal        || "rgba(0,0,0,0.18)";

  // Coordinate appearance
  const showCoordinates = ui.showCoordinates;
  const coordPosition   = ui.coordinatePosition ?? "inside";
  const coordColor      = ui.coordinateColor   || "#94a3b8";
  const coordOpacity    = ui.coordinateOpacity  ?? 0.9;
  const coordFontSize   = ui.coordinateFontSize ?? 11;
  const coordsOutside   = showCoordinates && coordPosition === "outside";

  // ─── Watermark ────────────────────────────────────────────────────────────
  const watermarkImage   = theme.watermarkImage ?? null;
  const watermarkOpacity = ui.watermarkOpacity ?? 0.12;
  const [watermarkFailed, setWatermarkFailed] = useState(false);
  useEffect(() => { setWatermarkFailed(false); }, [watermarkImage]);

  // ─── Game state ───────────────────────────────────────────────────────────
  const fen = useGameStore(s => s.fen);
  const selectedSquare = useGameStore(s => s.selectedSquare);
  const legalMoves = useGameStore(s => s.legalMoves);
  const lastMove = useGameStore(s => s.lastMove);
  const isCheck = useGameStore(s => s.isCheck);
  const isGameOver = useGameStore(s => s.isGameOver);
  const isReviewing = useGameStore(s => s.isReviewing);
  const isFullscreen = useGameStore(s => s.isFullscreen);
  const isBoardFlipped = useGameStore(s => s.isBoardFlipped);
  const gameResult = useGameStore(s => s.gameResult);
  const whitePlayer = useGameStore(s => s.whitePlayer);
  const blackPlayer = useGameStore(s => s.blackPlayer);
  const hasStarted = useGameStore(s => s.hasStarted);
  const studentId = useGameStore(s => s.studentId);
  const moveCount = useGameStore(s => s.moveHistory.length);
  const completedGame = useGameStore(s => s.completedGame);

  const trySelect = useGameStore(s => s.selectSquare);
  const tryMove   = useGameStore(s => s.tryMove);
  const setFullscreen = useGameStore(s => s.setFullscreen);
  const resetToNewBoard = useGameStore(s => s.resetToNewBoard);

  const showLegalMoves = ui.showLegalMoves;
  const autoQueen = ui.autoQueen;
  const noviceMode = ui.noviceMode ?? false;
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  // Pre-game dialog
  const [pregameOpen, setPregameOpen] = useState(!hasStarted);
  useEffect(() => { if (!hasStarted) setPregameOpen(true); }, [hasStarted]);

  // Archive modal
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Game-over result-record state
  const [resultRecorded, setResultRecorded] = useState(false);
  useEffect(() => { if (!isGameOver) setResultRecorded(false); }, [isGameOver]);

  // Auto-save the full PGN GameRecord exactly once when the game ends.
  const saveGameRecord = useStudentStore(s => s.saveGameRecord);
  const buildGameRecord = useGameStore(s => s.buildGameRecord);
  const [gameRecordSaved, setGameRecordSaved] = useState(false);
  useEffect(() => { if (!isGameOver) setGameRecordSaved(false); }, [isGameOver]);
  useEffect(() => {
    if (!isGameOver || gameRecordSaved) return;
    const rec = buildGameRecord();
    if (!rec) return;
    if (rec.moveCount === 0) return;
    saveGameRecord(rec);
    setGameRecordSaved(true);
    getProviders().audit.log({
      actorUserId: "local-admin",
      actionType: "game.saved",
      targetType: "student",
      targetId: rec.studentId,
      details: { result: rec.result, moveCount: rec.moveCount, pgnBytes: rec.pgn.length },
    });
  }, [isGameOver, gameRecordSaved, buildGameRecord, saveGameRecord]);

  // Phase 5A: auto-save completed game to local archive once per game-end.
  const [archivedGameId, setArchivedGameId] = useState<string | null>(null);
  useEffect(() => { if (!isGameOver) setArchivedGameId(null); }, [isGameOver]);
  useEffect(() => {
    if (!completedGame) return;
    if (completedGame.moveCount === 0) return;
    if (archivedGameId === completedGame.gameId) return;
    gameArchive.save(completedGame);
    setArchivedGameId(completedGame.gameId);
  }, [completedGame, archivedGameId]);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, setFullscreen]);

  // ─── Highlight square style maps ─────────────────────────────────────────
  const checkSquares: Record<string, React.CSSProperties> = useMemo(() => {
    if (!isCheck) return {};
    const board = fen.split(" ")[0] ?? "";
    const ranks = board.split("/");
    const turn = fen.split(" ")[1] ?? "w";
    for (let r = 0; r < 8; r++) {
      let file = 0;
      for (const ch of ranks[r] ?? "") {
        if (ch >= "1" && ch <= "8") { file += parseInt(ch, 10); continue; }
        const isWhiteKing = ch === "K";
        const isBlackKing = ch === "k";
        if ((turn === "w" && isWhiteKing) || (turn === "b" && isBlackKing)) {
          const sq = `${"abcdefgh"[file]}${8 - r}`;
          return { [sq]: { background: checkHighlight } };
        }
        file += 1;
      }
    }
    return {};
  }, [fen, isCheck, checkHighlight]);

  const lastMoveSquares: Record<string, React.CSSProperties> = useMemo(() => {
    if (!lastMove) return {};
    return {
      [lastMove.from]: { backgroundColor: lastMoveHighlight },
      [lastMove.to]:   { backgroundColor: lastMoveHighlight },
    };
  }, [lastMove, lastMoveHighlight]);

  const selectionSquares: Record<string, React.CSSProperties> = useMemo(() => {
    if (!selectedSquare || !showLegalMoves) return {};
    const out: Record<string, React.CSSProperties> = {
      [selectedSquare]: { background: selectHighlight },
    };
    for (const sq of legalMoves) {
      out[sq] = {
        background: `radial-gradient(circle, ${legalDotColor} 25%, transparent 25%)`,
        borderRadius: "50%",
      };
    }
    return out;
  }, [selectedSquare, legalMoves, showLegalMoves, selectHighlight, legalDotColor]);

  // ─── Novice Mode derived state ────────────────────────────────────────────
  const hoveredPiece = useMemo(() => {
    if (!noviceMode || !hoveredSquare) return null;
    return getPieceCode(fen, hoveredSquare);
  }, [noviceMode, hoveredSquare, fen]);

  const attackerSquares = useMemo(() => {
    if (!noviceMode || !selectedSquare || !hasStarted) return [];
    return getAttackers(fen, selectedSquare);
  }, [noviceMode, selectedSquare, fen, hasStarted]);

  const threatHighlight = ui.threatHighlight || "rgba(239, 68, 68, 0.35)";

  const threatSquares: Record<string, React.CSSProperties> = useMemo(() => {
    if (!noviceMode || attackerSquares.length === 0) return {};
    return Object.fromEntries(attackerSquares.map(sq => [sq, { background: threatHighlight }]));
  }, [noviceMode, attackerSquares, threatHighlight]);

  // ─── Board callbacks ──────────────────────────────────────────────────────
  const onPieceDrop = useCallback((from: string, to: string, piece: string) => {
    if (isReviewing || isGameOver || !hasStarted) return false;
    const promo = autoQueen ? "q" : ((piece[1] ?? "q").toLowerCase() as "q" | "r" | "b" | "n");
    return tryMove(from, to, promo);
  }, [tryMove, isReviewing, isGameOver, hasStarted, autoQueen]);

  const onSquareClick = useCallback((square: string) => {
    const s = useGameStore.getState();
    if (s.isReviewing || s.isGameOver || !s.hasStarted) return;
    if (s.selectedSquare && s.legalMoves.includes(square)) {
      const ok = tryMove(s.selectedSquare, square, "q");
      if (ok) return;
    }
    trySelect(square);
  }, [tryMove, trySelect]);

  // Game-end stat record
  const recordResult = (result: "win" | "loss" | "draw") => {
    if (!activeStudent) { toast.error("Select a student first"); return; }
    recordGameResult(result);
    setResultRecorded(true);
    getProviders().audit.log({
      actorUserId: "local-admin",
      actionType: "game.recorded",
      targetType: "student",
      targetId: activeStudent.id,
      details: { result, studentBoundToGame: studentId },
    });
    toast.success(`Recorded ${result} for ${activeStudent.displayName}`);
  };

  const onNewGameRequested = useCallback(() => {
    resetToNewBoard();
    setPregameOpen(true);
  }, [resetToNewBoard]);

  const suggestedResult: "win" | "loss" | "draw" | null = useMemo(() => {
    if (!isGameOver || !gameResult || !activeStudent) return null;
    if (gameResult === "1/2-1/2") return "draw";
    const studentPlayedWhite = activeStudent.id === studentId && whitePlayer === activeStudent.displayName;
    const studentPlayedBlack = activeStudent.id === studentId && blackPlayer === activeStudent.displayName;
    if (gameResult === "1-0") return studentPlayedWhite ? "win" : studentPlayedBlack ? "loss" : null;
    if (gameResult === "0-1") return studentPlayedBlack ? "win" : studentPlayedWhite ? "loss" : null;
    return null;
  }, [isGameOver, gameResult, activeStudent, studentId, whitePlayer, blackPlayer]);

  // ─── Shared board inner elements ─────────────────────────────────────────
  const orientation = isBoardFlipped ? "black" : "white";

  const boardInner = (
    <>
      <Chessboard
        id="PlayBoard"
        position={fen}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        boardOrientation={orientation}
        customDarkSquareStyle={{ backgroundColor: darkColor }}
        customLightSquareStyle={{ backgroundColor: lightColor }}
        customSquareStyles={{ ...threatSquares, ...checkSquares, ...lastMoveSquares, ...selectionSquares }}
        animationDuration={200}
        customPieces={customPieces}
        showBoardNotation={false}
        arePiecesDraggable={hasStarted && !isReviewing && !isGameOver}
        onMouseOverSquare={noviceMode ? (sq: string) => setHoveredSquare(sq) : undefined}
        onMouseOutSquare={noviceMode ? () => setHoveredSquare(null) : undefined}
      />
      {/* Watermark — centered, non-interactive, above squares, beneath pieces */}
      {watermarkImage && !watermarkFailed && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 2 }}
        >
          <img
            src={watermarkImage}
            alt=""
            aria-hidden="true"
            onError={() => setWatermarkFailed(true)}
            style={{
              width: "25%",
              height: "25%",
              objectFit: "contain",
              opacity: watermarkOpacity,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
      {/* Custom coordinate labels */}
      <BoardCoords
        orientation={orientation}
        position={coordPosition}
        color={coordColor}
        opacity={coordOpacity}
        fontSize={coordFontSize}
        show={showCoordinates}
      />
      {/* Novice Mode: floating piece-name tooltip on hover */}
      {noviceMode && hoveredPiece && hoveredSquare && (() => {
        const pos = squareToPercent(hoveredSquare, orientation);
        const showBelow = pos.y < 12.5;
        return (
          <div
            className="pointer-events-none"
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: showBelow ? `${pos.y + 6.25}%` : `${pos.y - 6.25}%`,
              transform: showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
              zIndex: 20,
            }}
          >
            <div className="bg-background/95 border border-border rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-md text-foreground">
              {PIECE_NAMES[hoveredPiece] ?? hoveredPiece}
            </div>
          </div>
        );
      })()}
    </>
  );

  // Board wrapper styling shared by both layouts
  const boardInnerStyle: React.CSSProperties = {
    position: "relative",
    overflow: coordsOutside ? "visible" : "hidden",
    border: borderColor ? `2px solid ${borderColor}` : undefined,
  };

  const board = (
    <div className="w-full aspect-square" style={boardInnerStyle}>
      {boardInner}
    </div>
  );

  const gameOverOverlay = isGameOver && (
    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4 z-10">
      <Card className="max-w-md w-full border-border bg-card shadow-xl">
        <div className="pt-6 pb-2 text-center">
          <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
          <h2 className="font-serif text-2xl font-semibold" data-testid="game-over-title">
            {gameResult === "1-0" && `${whitePlayer} wins`}
            {gameResult === "0-1" && `${blackPlayer} wins`}
            {gameResult === "1/2-1/2" && "Game drawn"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{moveCount} moves played.</p>
        </div>
        <CardContent className="space-y-3 pt-2 pb-5">
          {activeStudent && !resultRecorded && (
            <>
              <div className="text-sm text-center text-muted-foreground">
                Record this result for <span className="font-semibold text-foreground">{activeStudent.displayName}</span>?
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={suggestedResult === "win"  ? "default" : "outline"} onClick={() => recordResult("win")}  data-testid="record-win">Win</Button>
                <Button variant={suggestedResult === "draw" ? "default" : "outline"} onClick={() => recordResult("draw")} data-testid="record-draw">Draw</Button>
                <Button variant={suggestedResult === "loss" ? "default" : "outline"} onClick={() => recordResult("loss")} data-testid="record-loss">Loss</Button>
              </div>
            </>
          )}
          {activeStudent && resultRecorded && (
            <div className="text-sm text-center text-green-600 dark:text-green-400">
              Recorded for {activeStudent.displayName}.
            </div>
          )}
          {!activeStudent && (
            <div className="text-xs text-center text-muted-foreground">
              Select a student in the header to record this game.
            </div>
          )}
          <Button className="w-full" onClick={onNewGameRequested} data-testid="game-over-new">
            New game
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Fullscreen layout ────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="play-fullscreen">
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card/50">
          <PlayerBar side={isBoardFlipped ? "white" : "black"} />
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)} aria-label="Exit fullscreen" data-testid="exit-fullscreen">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div
            style={{
              position: "relative",
              maxWidth: "min(85vh,90vw)",
              width: "100%",
              paddingLeft: coordsOutside ? `${coordFontSize * 2}px` : undefined,
              paddingBottom: coordsOutside ? `${coordFontSize * 2}px` : undefined,
            }}
          >
            {board}
          </div>
          {gameOverOverlay}
        </div>
        <div className="px-4 py-2 border-t border-border bg-card/50">
          <PlayerBar side={isBoardFlipped ? "black" : "white"} />
        </div>
        <div className="px-4 py-2 border-t border-border">
          <GameControls onNewGameRequested={onNewGameRequested} />
        </div>
        {noviceMode && selectedSquare && (
          <div className="px-4 pb-3">
            <NovicePanel fen={fen} selectedSquare={selectedSquare} attackerSquares={attackerSquares} />
          </div>
        )}
        <PreGameDialog open={pregameOpen} onOpenChange={setPregameOpen} />
        <GameArchiveModal open={archiveOpen} onOpenChange={setArchiveOpen} />
      </div>
    );
  }

  // ─── Default layout ───────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 flex-1 flex flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Free Play</h1>
          <p className="text-muted-foreground mt-1">Play a standard game. Both players share the screen.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start flex-1">
        <div className="flex flex-col gap-3">
          <PlayerBar side={isBoardFlipped ? "white" : "black"} />

          <div className="bg-card p-4 rounded-2xl shadow-sm border border-border/50 flex items-center justify-center relative">
            {/* Outer wrapper — provides padding room for outside coordinates */}
            <div
              style={{
                position: "relative",
                maxWidth: "min(560px, calc(100vh - 280px))",
                width: "100%",
                paddingLeft: coordsOutside ? `${coordFontSize * 2}px` : undefined,
                paddingBottom: coordsOutside ? `${coordFontSize * 2}px` : undefined,
              }}
            >
              {board}
            </div>
            {gameOverOverlay}
          </div>

          <PlayerBar side={isBoardFlipped ? "black" : "white"} />
          <div className="bg-card p-2 rounded-xl border border-border/50">
            <GameControls onNewGameRequested={onNewGameRequested} />
          </div>
          {noviceMode && (
            <NovicePanel fen={fen} selectedSquare={selectedSquare} attackerSquares={attackerSquares} />
          )}
        </div>

        <Card className="flex flex-col shadow-sm border-border/50 bg-card overflow-hidden h-[min(80vh,42rem)]">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-serif">Moves</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setArchiveOpen(true)}
                data-testid="button-open-archive"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-1 min-h-0 flex flex-col">
            <NotationPanel />
          </CardContent>
        </Card>
      </div>

      <PreGameDialog open={pregameOpen} onOpenChange={setPregameOpen} />
      <GameArchiveModal open={archiveOpen} onOpenChange={setArchiveOpen} />
    </div>
  );
}
