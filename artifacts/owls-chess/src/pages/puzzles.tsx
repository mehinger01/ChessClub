import { useState, useEffect, useMemo, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useStudents } from "../hooks/use-students";
import { useSettings } from "../hooks/use-settings";
import { usePuzzleLibrary } from "../hooks/use-puzzle-library";
import { getTheme } from "../lib/themes";
import { getPieceSet } from "../lib/piece-sets";
import { getProviders } from "../providers";
import { PUZZLE_THEMES } from "../data/puzzles";
import type { Puzzle } from "../lib/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CheckCircle2, XCircle, ArrowRight, RefreshCcw, Info, Lightbulb, Eye, Settings, BookOpen } from "lucide-react";
import { toast } from "sonner";

type Mode = "puzzle" | "guided";
const DEBUG_KEY = "owls_debug_panel";

function buildQueue(library: Puzzle[], filterDifficulty: string, filterTheme: string, usedIds: string[]): Puzzle[] {
  let pool = library.slice();
  if (filterDifficulty !== "all") {
    pool = pool.filter(p => String(p.difficulty) === filterDifficulty);
  }
  if (filterTheme !== "all") {
    pool = pool.filter(p => p.theme === filterTheme);
  }
  if (pool.length === 0) return [];
  const fresh = pool.filter(p => !usedIds.includes(p.id));
  const used = pool.filter(p => usedIds.includes(p.id));
  // Shuffle fresh, then append used at the end (review)
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  return [...fresh, ...used];
}

export default function Puzzles() {
  const { activeStudent, recordPuzzleAttempt, resetStudentSession } = useStudents();
  const { settings } = useSettings();
  const { library, loading: libraryLoading } = usePuzzleLibrary();
  const theme = getTheme(settings.activeThemeId);
  const pieceSet = getPieceSet(settings.activePieceSetId);
  const customPieces = useMemo(() => pieceSet.customPieces?.(), [pieceSet.id]);

  const [mode, setMode] = useState<Mode>("puzzle");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterTheme, setFilterTheme] = useState<string>("all");
  const [debugOn, setDebugOn] = useState<boolean>(() => localStorage.getItem(DEBUG_KEY) === "1");
  const [teacherOpen, setTeacherOpen] = useState(false);

  const [queue, setQueue] = useState<Puzzle[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const fallback: Puzzle = useMemo(() => library[0] ?? {
    id: "empty", title: "No puzzles", theme: "n/a", difficulty: 1, sideToMove: "white",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution: [], hints: ["", "", ""], explanation: "",
    feedbackCorrect: "", feedbackIncorrect: "",
  }, [library]);
  const currentPuzzle = queue[queueIndex] ?? fallback;

  const [game, setGame] = useState(() => new Chess(currentPuzzle.fen));
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [puzzleState, setPuzzleState] = useState<"playing" | "correct" | "incorrect" | "revealed">("playing");
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: React.CSSProperties }>({});
  const [optionSquares, setOptionSquares] = useState<{ [square: string]: React.CSSProperties }>({});
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [scoreEarned, setScoreEarned] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);

  // Rebuild queue when filters, student, or library changes
  useEffect(() => {
    if (libraryLoading) return;
    const next = buildQueue(library, filterDifficulty, filterTheme, activeStudent?.usedPuzzleIds ?? []);
    setQueue(next);
    setQueueIndex(0);
  }, [filterDifficulty, filterTheme, activeStudent?.id, activeStudent?.usedPuzzleIds.length, library, libraryLoading]);

  // Reset puzzle state when puzzle changes
  useEffect(() => {
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(newGame.fen());
    setMoveIndex(0);
    setPuzzleState("playing");
    setMoveSquares({});
    setOptionSquares({});
    setHintsRevealed(0);
    setScoreEarned(null);
    setRecorded(false);
  }, [currentPuzzle.id, currentPuzzle.fen]);

  const sideChar: "w" | "b" = currentPuzzle.sideToMove === "white" ? "w" : "b";

  const finishPuzzle = useCallback((correct: boolean, hintsUsed: number) => {
    if (recorded) return;
    setRecorded(true);
    const score = !correct ? 0 : hintsUsed === 0 ? 2 : 1;
    setScoreEarned(score);
    if (activeStudent) {
      recordPuzzleAttempt(currentPuzzle, { correct, hintsUsed });
      getProviders().audit.log({
        actorUserId: "local-admin",
        actionType: correct ? "puzzle.solved" : "puzzle.failed",
        targetType: "puzzle",
        targetId: currentPuzzle.id,
        details: { studentId: activeStudent.id, hintsUsed },
      });
    }
  }, [recorded, activeStudent, currentPuzzle, recordPuzzleAttempt]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (puzzleState !== "playing") return false;
    if (game.turn() !== sideChar) return false;

    const testGame = new Chess(game.fen());
    let moveObj: ReturnType<Chess["move"]> | null = null;
    try {
      moveObj = testGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: (piece[1] ?? "q").toLowerCase(),
      });
    } catch {
      moveObj = null;
    }
    if (!moveObj) return false;

    const expectedSan = currentPuzzle.solution[moveIndex];
    if (moveObj.san === expectedSan) {
      // Apply correct move
      const next = new Chess(game.fen());
      next.move(expectedSan);
      setGame(next);
      setFen(next.fen());
      setMoveSquares({
        [sourceSquare]: { backgroundColor: "rgba(34, 197, 94, 0.45)" },
        [targetSquare]: { backgroundColor: "rgba(34, 197, 94, 0.45)" },
      });
      setOptionSquares({});

      const newMoveIndex = moveIndex + 1;
      if (newMoveIndex >= currentPuzzle.solution.length) {
        setPuzzleState("correct");
        finishPuzzle(true, hintsRevealed);
        toast.success("Puzzle solved");
        return true;
      }
      // Auto-reply
      setMoveIndex(newMoveIndex);
      setTimeout(() => {
        const reply = new Chess(next.fen());
        try {
          reply.move(currentPuzzle.solution[newMoveIndex]);
          setGame(reply);
          setFen(reply.fen());
          setMoveIndex(newMoveIndex + 1);
          if (newMoveIndex + 1 >= currentPuzzle.solution.length) {
            setPuzzleState("correct");
            finishPuzzle(true, hintsRevealed);
            toast.success("Puzzle solved");
          }
        } catch {
          // shouldn't happen — solutions are validated
        }
      }, 600);
      return true;
    } else {
      // Wrong move
      setPuzzleState("incorrect");
      setMoveSquares({
        [sourceSquare]: { backgroundColor: "rgba(239, 68, 68, 0.45)" },
        [targetSquare]: { backgroundColor: "rgba(239, 68, 68, 0.45)" },
      });
      finishPuzzle(false, hintsRevealed);
      // Guided practice auto-reveals the next hint
      if (mode === "guided" && hintsRevealed < 3) {
        setHintsRevealed(h => h + 1);
      }
      return false;
    }
  };

  const onSquareClick = (square: string) => {
    if (mode !== "guided" || puzzleState !== "playing") {
      setOptionSquares({});
      return;
    }
    const moves = game.moves({ square: square as any, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }
    const next: { [sq: string]: React.CSSProperties } = {};
    for (const m of moves as any[]) {
      const target = game.get(m.to);
      next[m.to] = {
        background: target
          ? "radial-gradient(circle, rgba(0,0,0,.18) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,.18) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }
    next[square] = { background: "rgba(255, 235, 100, 0.4)" };
    setOptionSquares(next);
  };

  const resetPuzzle = () => {
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(newGame.fen());
    setMoveIndex(0);
    setPuzzleState("playing");
    setMoveSquares({});
    setOptionSquares({});
  };

  const nextPuzzle = () => {
    if (queue.length === 0) return;
    setQueueIndex(i => (i + 1) % queue.length);
  };

  const showHint = () => {
    if (hintsRevealed < 3) {
      setHintsRevealed(h => h + 1);
    }
  };

  const revealAnswer = () => {
    // Mark as incorrect with all hints used, then animate the solution
    finishPuzzle(false, 3);
    setPuzzleState("revealed");
    setHintsRevealed(3);
    let i = 0;
    let g = new Chess(currentPuzzle.fen);
    setGame(g);
    setFen(g.fen());
    const playStep = () => {
      if (i >= currentPuzzle.solution.length) return;
      const san = currentPuzzle.solution[i];
      const next = new Chess(g.fen());
      try { next.move(san); } catch { return; }
      g = next;
      setGame(next);
      setFen(next.fen());
      i++;
      setTimeout(playStep, 700);
    };
    setTimeout(playStep, 400);
  };

  const toggleDebug = () => {
    const v = !debugOn;
    setDebugOn(v);
    localStorage.setItem(DEBUG_KEY, v ? "1" : "0");
  };

  const handleResetSession = () => {
    if (!activeStudent) {
      toast.error("Select a student first");
      return;
    }
    resetStudentSession(activeStudent.id);
    toast.success("Session puzzles reset for " + activeStudent.displayName);
  };

  const darkColor = theme.darkSquare;
  const lightColor = theme.lightSquare;

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

  const usedCount = activeStudent?.usedPuzzleIds.length ?? 0;
  const availableCount = library.length - usedCount;
  const totalScore = activeStudent?.puzzleScore ?? 0;

  const visibleHints = currentPuzzle.hints.slice(0, hintsRevealed);

  const sideToMoveBadge = currentPuzzle.sideToMove === "white" ? (
    <span className="inline-block px-3 py-1 rounded-md bg-white text-slate-900 border border-slate-300 font-bold tracking-wider uppercase text-xs">White to move</span>
  ) : (
    <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white border border-slate-700 font-bold tracking-wider uppercase text-xs">Black to move</span>
  );

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
              Select a student in the header to track puzzles, scoring, and progress.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Mode + filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center bg-card border border-border/50 rounded-xl p-3">
        <div className="inline-flex rounded-lg border border-border bg-background p-1">
          <button
            onClick={() => setMode("puzzle")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${mode === "puzzle" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >Puzzle Mode</button>
          <button
            onClick={() => setMode("guided")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${mode === "guided" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >Guided Practice</button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Level</span>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
              <SelectItem value="4">Level 4</SelectItem>
              <SelectItem value="5">Level 5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Theme</span>
          <Select value={filterTheme} onValueChange={setFilterTheme}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All themes</SelectItem>
              {PUZZLE_THEMES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTeacherOpen(o => !o)}>
            <Settings className="w-4 h-4 mr-1" /> Teacher
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleDebug}>
            Debug {debugOn ? "On" : "Off"}
          </Button>
        </div>
      </div>

      {teacherOpen && (
        <Card className="mb-6 border-border/50 bg-muted/30">
          <CardContent className="pt-4 flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={nextPuzzle}>Load next puzzle</Button>
            <Button variant="outline" size="sm" onClick={revealAnswer} disabled={puzzleState !== "playing"}>
              <Eye className="w-4 h-4 mr-1" /> Reveal answer
            </Button>
            <Button variant="outline" size="sm" onClick={showHint} disabled={hintsRevealed >= 3 || puzzleState !== "playing"}>
              <Lightbulb className="w-4 h-4 mr-1" /> Show next hint
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetSession}>
              Reset session puzzles
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              Queue: {queue.length} | Used by student: {usedCount}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-8 items-start flex-1">
        <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col items-center justify-center min-h-[60vh] relative">
          <div className="w-full max-w-[640px] mb-4 flex items-center justify-between">
            {sideToMoveBadge}
            <span className="text-xs text-muted-foreground">
              Puzzle {queueIndex + 1} of {queue.length || 1}
            </span>
          </div>
          <div className="w-full max-w-[640px] aspect-square">
            <Chessboard
              id="PuzzleBoard"
              position={fen}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              boardOrientation={currentPuzzle.sideToMove}
              customDarkSquareStyle={{ backgroundColor: darkColor }}
              customLightSquareStyle={{ backgroundColor: lightColor }}
              customPieces={customPieces}
              customSquareStyles={{ ...checkSquares, ...optionSquares, ...moveSquares }}
              animationDuration={200}
              arePiecesDraggable={puzzleState === "playing" && game.turn() === sideChar}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="shadow-sm border-border/50 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif">{currentPuzzle.title}</CardTitle>
                <div className="flex gap-1">
                  <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold bg-primary/10 text-primary">
                    L{currentPuzzle.difficulty}
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold bg-secondary/40 text-secondary-foreground">
                    {currentPuzzle.theme}
                  </span>
                </div>
              </div>
              <CardDescription className="text-sm">
                {mode === "guided"
                  ? "Guided Practice — pick up a piece to see legal moves. Wrong moves will reveal a hint."
                  : "Find the best move. The opponent will reply automatically when needed."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {puzzleState === "correct" && (
                <div className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800/30">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <div className="font-bold text-lg mb-1">{currentPuzzle.feedbackCorrect}</div>
                  <div className="text-sm text-center">{currentPuzzle.explanation}</div>
                  {scoreEarned !== null && (
                    <div className="mt-2 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40">
                      +{scoreEarned} {scoreEarned === 1 ? "point (used hints)" : scoreEarned === 2 ? "points (clean)" : "points"}
                    </div>
                  )}
                </div>
              )}

              {puzzleState === "incorrect" && (
                <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/30">
                  <XCircle className="w-8 h-8 mb-2" />
                  <div className="font-bold text-lg mb-1">{currentPuzzle.feedbackIncorrect}</div>
                  {scoreEarned !== null && (
                    <div className="mt-2 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/40">
                      0 points
                    </div>
                  )}
                </div>
              )}

              {puzzleState === "revealed" && (
                <div className="flex flex-col items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/30">
                  <BookOpen className="w-8 h-8 mb-2" />
                  <div className="font-bold text-lg mb-1">Solution revealed</div>
                  <div className="text-sm text-center">{currentPuzzle.explanation}</div>
                  <div className="mt-2 text-xs font-mono bg-background/60 px-2 py-1 rounded">
                    {currentPuzzle.solution.join("  ")}
                  </div>
                </div>
              )}

              {visibleHints.length > 0 && (
                <div className="space-y-2">
                  {visibleHints.map((h, i) => (
                    <div key={i} className="flex gap-2 items-start text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                      <div><span className="font-semibold">Hint {i + 1}:</span> {h}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 bg-muted/20 border-t border-border/50 pt-4">
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={showHint}
                  disabled={hintsRevealed >= 3 || puzzleState !== "playing"}
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Hint ({hintsRevealed}/3)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={revealAnswer}
                  disabled={puzzleState !== "playing"}
                >
                  <Eye className="w-4 h-4 mr-1" /> Reveal
                </Button>
              </div>

              {puzzleState === "playing" && (
                <Button variant="ghost" className="w-full" onClick={resetPuzzle}>
                  <RefreshCcw className="w-4 h-4 mr-2" /> Reset Position
                </Button>
              )}
              {puzzleState === "incorrect" && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button variant="outline" className="w-full" onClick={resetPuzzle}>
                    <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
                  </Button>
                  <Button variant="default" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={nextPuzzle}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
              {(puzzleState === "correct" || puzzleState === "revealed") && (
                <Button variant="default" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={nextPuzzle}>
                  Next Puzzle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardFooter>
          </Card>

          {activeStudent && (
            <Card className="shadow-sm border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif">{activeStudent.displayName}</CardTitle>
                <CardDescription>Level {activeStudent.currentLevel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted p-2 rounded-lg">
                    <div className="text-xl font-bold text-primary">{activeStudent.puzzlesCorrect}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Solved</div>
                  </div>
                  <div className="bg-muted p-2 rounded-lg">
                    <div className="text-xl font-bold text-primary">{totalScore}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Score</div>
                  </div>
                  <div className="bg-muted p-2 rounded-lg">
                    <div className="text-xl font-bold text-primary">
                      {activeStudent.puzzlesAttempted > 0 ? Math.round((activeStudent.puzzlesCorrect / activeStudent.puzzlesAttempted) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {debugOn && (
            <Card className="shadow-sm border-border/50 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">Debug</CardTitle>
              </CardHeader>
              <CardContent className="text-xs font-mono space-y-1">
                <div>student: {activeStudent?.displayName ?? "—"}</div>
                <div>puzzleId: {currentPuzzle.id}</div>
                <div>theme/diff: {currentPuzzle.theme} / L{currentPuzzle.difficulty}</div>
                <div>solution: [{currentPuzzle.solution.join(", ")}]</div>
                <div>nextExpected: {currentPuzzle.solution[moveIndex] ?? "—"}</div>
                <div>state: {puzzleState}</div>
                <div>hintsUsed: {hintsRevealed}</div>
                <div>queueLen: {queue.length}</div>
                <div>used/avail: {usedCount} / {availableCount}</div>
                <div>turn: {game.turn()}</div>
                <div>inCheck: {String(game.inCheck())}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
