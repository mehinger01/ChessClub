import { useState, useCallback, useMemo, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useStudents } from "../hooks/use-students";
import { useSettings } from "../hooks/use-settings";
import { getTheme } from "../lib/themes";
import { getPieceSet } from "../lib/piece-sets";
import { getProviders } from "../providers";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { RefreshCw, RotateCcw, RotateCw, Trophy } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";

const DEBUG_KEY = "owls_debug_panel";

export default function Play() {
  const { activeStudent, recordGameResult } = useStudents();
  const { settings } = useSettings();
  const theme = getTheme(settings.activeThemeId);
  const pieceSet = getPieceSet(settings.activePieceSetId);
  const customPieces = useMemo(() => pieceSet.customPieces?.(), [pieceSet.id]);

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState(game.history({ verbose: true }));
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: React.CSSProperties }>({});
  const [optionSquares, setOptionSquares] = useState<{ [square: string]: React.CSSProperties }>({});
  const [debugOn, setDebugOn] = useState<boolean>(() => localStorage.getItem(DEBUG_KEY) === "1");
  const [resultRecorded, setResultRecorded] = useState(false);

  const isGameOver = game.isGameOver();
  const isCheck = game.inCheck();
  const turn = game.turn() === "w" ? "White" : "Black";

  const status = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate. ${turn === "White" ? "Black" : "White"} wins.`;
    if (game.isStalemate()) return "Stalemate.";
    if (game.isInsufficientMaterial()) return "Draw — insufficient material.";
    if (game.isThreefoldRepetition()) return "Draw by threefold repetition.";
    if (game.isDraw()) return "Draw (50-move rule).";
    if (isCheck) return `Check — ${turn} to move`;
    return `${turn} to move`;
  }, [game, turn, isCheck]);

  const winner: "white" | "black" | "draw" | null = useMemo(() => {
    if (game.isCheckmate()) return game.turn() === "w" ? "black" : "white";
    if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return "draw";
    return null;
  }, [game]);

  // King-in-check highlight
  const checkSquares = useMemo(() => {
    if (!game.inCheck()) return {};
    const board = game.board();
    const turn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq && sq.type === "k" && sq.color === turn) {
          const file = "abcdefgh"[c];
          const rank = 8 - r;
          return { [`${file}${rank}`]: { background: "rgba(239, 68, 68, 0.45)" } };
        }
      }
    }
    return {};
  }, [game]);

  useEffect(() => {
    if (!isGameOver) setResultRecorded(false);
  }, [isGameOver, game.fen()]);

  const makeMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      setGame(new Chess(game.fen()));
      setFen(game.fen());
      setHistory(game.history({ verbose: true }));
      return result;
    } catch {
      return null;
    }
  }, [game]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: (piece[1] ?? "q").toLowerCase(),
    });
    if (move === null) return false;
    setMoveSquares({
      [sourceSquare]: { backgroundColor: "rgba(255, 235, 100, 0.4)" },
      [targetSquare]: { backgroundColor: "rgba(255, 235, 100, 0.4)" },
    });
    setOptionSquares({});
    return true;
  };

  const getMoveOptions = (square: string) => {
    const moves = game.moves({ square: square as any, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }
    const newSquares: { [square: string]: React.CSSProperties } = {};
    for (const move of moves as any[]) {
      const target = game.get(move.to);
      const source = game.get(square as any);
      newSquares[move.to] = {
        background: target && source && target.color !== source.color
          ? "radial-gradient(circle, rgba(0,0,0,.18) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,.18) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }
    newSquares[square] = { background: "rgba(255, 235, 100, 0.4)" };
    setOptionSquares(newSquares);
  };

  const onSquareClick = (square: string) => {
    setMoveSquares({});
    getMoveOptions(square);
  };

  const onSquareRightClick = (square: string) => {
    const colour = "rgba(0, 0, 255, 0.4)";
    setMoveSquares(prev => ({
      ...prev,
      [square]: prev[square] && prev[square].backgroundColor === colour ? undefined : { backgroundColor: colour },
    }) as any);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setHistory([]);
    setMoveSquares({});
    setOptionSquares({});
    setResultRecorded(false);
    toast.success("New game started");
  };

  const undoMove = () => {
    game.undo();
    setGame(new Chess(game.fen()));
    setFen(game.fen());
    setHistory(game.history({ verbose: true }));
    setMoveSquares({});
    setOptionSquares({});
    setResultRecorded(false);
  };

  const recordResult = (result: "win" | "loss" | "draw") => {
    if (!activeStudent) {
      toast.error("Select a student first");
      return;
    }
    recordGameResult(result);
    setResultRecorded(true);
    getProviders().audit.log({
      actorUserId: "local-admin",
      actionType: "game.recorded",
      targetType: "student",
      targetId: activeStudent.id,
      details: { result },
    });
    toast.success(`Recorded ${result} for ${activeStudent.displayName}`);
  };

  const toggleDebug = () => {
    const v = !debugOn;
    setDebugOn(v);
    localStorage.setItem(DEBUG_KEY, v ? "1" : "0");
  };

  const darkColor = theme.darkSquare;
  const lightColor = theme.lightSquare;

  // Castling rights and en passant from FEN
  const fenParts = fen.split(" ");
  const castlingRights = fenParts[2] || "-";
  const epTarget = fenParts[3] || "-";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex-1 flex flex-col">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Free Play</h1>
          <p className="text-muted-foreground mt-1">Play a standard game. Both players share the screen.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleDebug}>
          Debug {debugOn ? "On" : "Off"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start flex-1">
        <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col items-center justify-center min-h-[60vh] relative">
          <div className="w-full aspect-square mx-auto" style={{ maxWidth: "min(560px, calc(100vh - 220px))" }}>
            <Chessboard
              id="PlayBoard"
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              onSquareClick={onSquareClick}
              onSquareRightClick={onSquareRightClick}
              customDarkSquareStyle={{ backgroundColor: darkColor }}
              customLightSquareStyle={{ backgroundColor: lightColor }}
              customSquareStyles={{ ...checkSquares, ...moveSquares, ...optionSquares }}
              animationDuration={200}
              customPieces={customPieces}
            />
          </div>

          {/* End of game overlay */}
          {isGameOver && winner && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4">
              <Card className="max-w-md w-full border-border bg-card shadow-xl">
                <CardHeader className="text-center pb-3">
                  <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
                  <CardTitle className="font-serif text-2xl">
                    {winner === "draw" ? "Game drawn" : `${winner === "white" ? "White" : "Black"} wins`}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{status}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeStudent && !resultRecorded && (
                    <>
                      <div className="text-sm text-center text-muted-foreground">
                        Record this game for <span className="font-semibold text-foreground">{activeStudent.displayName}</span>?
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" onClick={() => recordResult("win")}>Win</Button>
                        <Button variant="outline" onClick={() => recordResult("draw")}>Draw</Button>
                        <Button variant="outline" onClick={() => recordResult("loss")}>Loss</Button>
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
                      Select a student in the header to record this game's result.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button variant="outline" onClick={undoMove}>
                      <RotateCcw className="w-4 h-4 mr-1" /> Undo
                    </Button>
                    <Button variant="default" onClick={resetGame} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <RefreshCw className="w-4 h-4 mr-1" /> New Game
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 h-full max-h-[80vh]">
          <Card className="flex flex-col flex-1 shadow-sm border-border/50 bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="flex justify-between items-center text-lg font-serif">
                <span>Status</span>
                <span className={`text-sm px-2 py-1 rounded-md font-sans ${isGameOver ? 'bg-destructive/10 text-destructive' : isCheck ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500' : 'bg-primary/10 text-primary'}`}>
                  {status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-[200px]">
              <ScrollArea className="flex-1 p-4">
                {history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm py-8">
                    No moves yet. White to play.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                      <div key={i} className="contents">
                        <div className="text-muted-foreground pl-2">{i + 1}.</div>
                        <div className="font-medium text-foreground">{history[i * 2]?.san}</div>
                        <div className="font-medium text-foreground">{history[i * 2 + 1]?.san || ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-border/50 bg-muted/20 grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={undoMove} disabled={history.length === 0} className="w-full">
                  <RotateCcw className="w-4 h-4 mr-1" /> Undo
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBoardOrientation(prev => prev === "white" ? "black" : "white")} className="w-full">
                  <RotateCw className="w-4 h-4 mr-1" /> Flip
                </Button>
                <Button variant="default" size="sm" onClick={resetGame} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <RefreshCw className="w-4 h-4 mr-1" /> New
                </Button>
              </div>
            </CardContent>
          </Card>

          {debugOn && (
            <Card className="shadow-sm border-border/50 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">Debug</CardTitle>
              </CardHeader>
              <CardContent className="text-xs font-mono space-y-1">
                <div>turn: {game.turn()}</div>
                <div>inCheck: {String(isCheck)}</div>
                <div>checkmate: {String(game.isCheckmate())}</div>
                <div>stalemate: {String(game.isStalemate())}</div>
                <div>castling: {castlingRights}</div>
                <div>enPassant: {epTarget}</div>
                <div>moves: {history.length}</div>
                <div>legalMoves: {game.moves().length}</div>
                <div>status: {isGameOver ? "ended" : isCheck ? "check" : "active"}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
