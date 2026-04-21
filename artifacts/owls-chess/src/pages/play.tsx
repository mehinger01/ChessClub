import { useState, useEffect, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { RefreshCw, RotateCcw, RotateCw } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";

export default function Play() {
  // Use a ref or state for the game instance
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState(game.history({ verbose: true }));
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: React.CSSProperties }>({});
  const [optionSquares, setOptionSquares] = useState<{ [square: string]: React.CSSProperties }>({});

  const isGameOver = game.isGameOver();
  const isCheck = game.inCheck();
  const turn = game.turn() === "w" ? "White" : "Black";

  const status = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate! ${turn === "White" ? "Black" : "White"} wins.`;
    if (game.isDraw()) return "Draw (50-move rule or insufficient material).";
    if (game.isStalemate()) return "Stalemate.";
    if (game.isThreefoldRepetition()) return "Draw by threefold repetition.";
    if (isCheck) return "Check!";
    return `${turn} to move`;
  }, [game, turn, isCheck]);

  const makeMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      setGame(new Chess(game.fen())); // Force re-render with new instance if needed, or just update fen
      setFen(game.fen());
      setHistory(game.history({ verbose: true }));
      return result;
    } catch (e) {
      return null;
    }
  }, [game]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase() ?? "q"
    });

    if (move === null) return false;
    
    setMoveSquares({
      [sourceSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
      [targetSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" }
    });
    return true;
  };

  const getMoveOptions = (square: string) => {
    const moves = game.moves({
      square,
      verbose: true
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: { [square: string]: React.CSSProperties } = {};
    moves.map((move: any) => {
      newSquares[move.to] = {
        background: game.get(move.to as any) && game.get(move.to as any).color !== game.get(square as any).color
          ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%"
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)"
    };
    setOptionSquares(newSquares);
    return true;
  };

  const onSquareClick = (square: string) => {
    setMoveSquares({});
    getMoveOptions(square);
  };

  const onSquareRightClick = (square: string) => {
    const colour = "rgba(0, 0, 255, 0.4)";
    setMoveSquares({
      ...moveSquares,
      [square]: moveSquares[square] && moveSquares[square].backgroundColor === colour ? undefined : { backgroundColor: colour }
    } as any);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setHistory([]);
    setMoveSquares({});
    setOptionSquares({});
    toast.success("New game started");
  };

  const undoMove = () => {
    game.undo();
    setGame(new Chess(game.fen()));
    setFen(game.fen());
    setHistory(game.history({ verbose: true }));
    setMoveSquares({});
    setOptionSquares({});
  };

  // Custom colors for Owls theme: Deep Royal Blue & Warm Silver/Cream
  const darkSquareStyle = { backgroundColor: "var(--color-primary)" }; 
  // wait, react-chessboard expects valid CSS color string. Let's use hardcoded colors that match the theme.
  const darkColor = "#1a365d"; // royal blue
  const lightColor = "#f1f5f9"; // warm silver/cream

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-foreground">Free Play</h1>
        <p className="text-muted-foreground mt-1">Play a standard game. Both players share the screen.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start flex-1">
        <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-[640px] aspect-square">
            <Chessboard 
              id="PlayBoard"
              position={fen} 
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              onSquareClick={onSquareClick}
              onSquareRightClick={onSquareRightClick}
              customDarkSquareStyle={{ backgroundColor: darkColor }}
              customLightSquareStyle={{ backgroundColor: lightColor }}
              customSquareStyles={{ ...moveSquares, ...optionSquares }}
              animationDuration={200}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 h-full max-h-[80vh]">
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
        </div>
      </div>
    </div>
  );
}
