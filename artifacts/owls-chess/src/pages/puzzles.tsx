import { useState, useEffect, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useStudents } from "../hooks/use-students";
import { storage } from "../lib/storage";
import { puzzles } from "../data/puzzles";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { BookOpen, CheckCircle2, XCircle, ArrowRight, RefreshCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Puzzles() {
  const { activeStudent } = useStudents();
  
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const currentPuzzle = puzzles[currentPuzzleIndex];
  
  const [game, setGame] = useState(new Chess(currentPuzzle.fen));
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [puzzleState, setPuzzleState] = useState<"playing" | "correct" | "incorrect">("playing");
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: React.CSSProperties }>({});

  useEffect(() => {
    // Reset when puzzle changes
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(newGame.fen());
    setMoveIndex(0);
    setPuzzleState("playing");
    setMoveSquares({});
  }, [currentPuzzleIndex, currentPuzzle.fen]);

  const makeMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      setGame(new Chess(game.fen()));
      setFen(game.fen());
      return result;
    } catch (e) {
      return null;
    }
  }, [game]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (puzzleState !== "playing") return false;
    if (game.turn() !== currentPuzzle.sideToMove) return false;

    // Try move
    const testGame = new Chess(game.fen());
    let moveObj = null;
    try {
      moveObj = testGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1].toLowerCase() ?? "q"
      });
    } catch (e) {}

    if (!moveObj) return false;

    const expectedSan = currentPuzzle.solution[moveIndex];
    if (moveObj.san === expectedSan) {
      // Correct move
      makeMove(moveObj);
      setMoveSquares({
        [sourceSquare]: { backgroundColor: "rgba(0, 255, 0, 0.4)" },
        [targetSquare]: { backgroundColor: "rgba(0, 255, 0, 0.4)" }
      });
      
      if (moveIndex + 1 === currentPuzzle.solution.length) {
        // Puzzle completed
        setPuzzleState("correct");
        if (activeStudent) {
          storage.recordAttempt(activeStudent.id, currentPuzzle.id, true);
        }
        toast.success("Puzzle solved!");
      } else {
        // Correct move, but puzzle not over. Opponent replies.
        setMoveIndex(moveIndex + 1);
        setTimeout(() => {
          const replyGame = new Chess(game.fen());
          replyGame.move(currentPuzzle.solution[moveIndex + 1]);
          setGame(new Chess(replyGame.fen()));
          setFen(replyGame.fen());
          setMoveIndex(moveIndex + 2);
          
          if (moveIndex + 2 === currentPuzzle.solution.length) {
            setPuzzleState("correct");
            if (activeStudent) {
              storage.recordAttempt(activeStudent.id, currentPuzzle.id, true);
            }
            toast.success("Puzzle solved!");
          }
        }, 500);
      }
      return true;
    } else {
      // Incorrect move
      setPuzzleState("incorrect");
      setMoveSquares({
        [sourceSquare]: { backgroundColor: "rgba(255, 0, 0, 0.4)" },
        [targetSquare]: { backgroundColor: "rgba(255, 0, 0, 0.4)" }
      });
      if (activeStudent) {
        storage.recordAttempt(activeStudent.id, currentPuzzle.id, false);
      }
      return false; // don't make the move visually on the board
    }
  };

  const resetPuzzle = () => {
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(newGame.fen());
    setMoveIndex(0);
    setPuzzleState("playing");
    setMoveSquares({});
  };

  const nextPuzzle = () => {
    setCurrentPuzzleIndex((prev) => (prev + 1) % puzzles.length);
  };

  const darkColor = "#1a365d"; 
  const lightColor = "#f1f5f9"; 

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex-1 flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Tactics Trainer</h1>
          <p className="text-muted-foreground mt-1">Sharpen your vision with curated puzzles.</p>
        </div>
        
        {!activeStudent && (
          <Alert variant="default" className="sm:max-w-md bg-primary/10 border-primary/20 text-primary">
            <Info className="h-4 w-4" />
            <AlertTitle>No student selected</AlertTitle>
            <AlertDescription>
              Select a student in the header to track your progress and accuracy.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start flex-1">
        <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col items-center justify-center min-h-[60vh] relative">
          <div className="w-full max-w-[640px] aspect-square">
            <Chessboard 
              id="PuzzleBoard"
              position={fen} 
              onPieceDrop={onDrop}
              boardOrientation={currentPuzzle.sideToMove === "w" ? "white" : "black"}
              customDarkSquareStyle={{ backgroundColor: darkColor }}
              customLightSquareStyle={{ backgroundColor: lightColor }}
              customSquareStyles={moveSquares}
              animationDuration={200}
              arePiecesDraggable={puzzleState === "playing" && game.turn() === currentPuzzle.sideToMove}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="shadow-sm border-border/50 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif">{currentPuzzle.title}</CardTitle>
                <div className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold ${
                  currentPuzzle.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500' :
                  currentPuzzle.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500'
                }`}>
                  {currentPuzzle.difficulty}
                </div>
              </div>
              <CardDescription className="text-base font-medium text-foreground">
                {currentPuzzle.sideToMove === "w" ? "White to move" : "Black to move"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-6">
                Find the best move sequence. The opponent will reply automatically if multiple moves are required.
              </div>

              {puzzleState === "correct" && (
                <div className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800/30">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <div className="font-bold text-lg mb-1">Excellent!</div>
                  <div className="text-sm">You found the correct sequence.</div>
                </div>
              )}

              {puzzleState === "incorrect" && (
                <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/30">
                  <XCircle className="w-8 h-8 mb-2" />
                  <div className="font-bold text-lg mb-1">Not quite right</div>
                  <div className="text-sm text-center">That move doesn't lead to the best outcome.</div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 bg-muted/20 border-t border-border/50 pt-4">
              {puzzleState === "playing" && (
                <Button variant="outline" className="w-full" onClick={resetPuzzle}>
                  <RefreshCcw className="w-4 h-4 mr-2" /> Reset Position
                </Button>
              )}
              {puzzleState === "incorrect" && (
                <Button variant="default" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={resetPuzzle}>
                  <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
                </Button>
              )}
              {puzzleState === "correct" && (
                <Button variant="default" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={nextPuzzle}>
                  Next Puzzle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardFooter>
          </Card>

          {activeStudent && (
            <Card className="shadow-sm border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">{activeStudent.solved}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Solved</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">
                      {activeStudent.attempts > 0 ? Math.round((activeStudent.solved / activeStudent.attempts) * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
