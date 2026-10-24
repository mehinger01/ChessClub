import { Chess } from "chess.js";

/** Validate imported content before it can reach a board constructor. */
export function validatePuzzleLibrary(value: unknown): string[] {
  if (!Array.isArray(value)) return ["root must be an array of puzzles"];
  const errors: string[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const p = value[i];
    const fail = (message: string) => errors.push(`puzzle[${i}]: ${message}`);
    if (!p || typeof p !== "object") {
      fail("not an object");
      continue;
    }
    for (const field of [
      "id",
      "title",
      "theme",
      "fen",
      "explanation",
      "feedbackCorrect",
      "feedbackIncorrect",
    ]) {
      if (typeof p[field] !== "string") fail(`missing ${field}`);
    }
    if (!p.id || ids.has(p.id)) fail("missing or duplicate ID");
    ids.add(p.id);
    if (!Number.isInteger(p.difficulty) || p.difficulty < 1 || p.difficulty > 5)
      fail("difficulty must be 1–5");
    if (p.sideToMove !== "white" && p.sideToMove !== "black")
      fail("sideToMove must be white or black");
    if (
      !Array.isArray(p.hints) ||
      p.hints.length !== 3 ||
      p.hints.some((h: unknown) => typeof h !== "string")
    )
      fail("three text hints required");
    if (
      !Array.isArray(p.solution) ||
      !p.solution.length ||
      p.solution.some((m: unknown) => typeof m !== "string")
    ) {
      fail("a nonempty solution is required");
      continue;
    }
    try {
      if (typeof p.fen !== "string" || !p.fen) throw new Error("missing FEN");
      const game = new Chess(p.fen);
      if (game.turn() !== (p.sideToMove === "white" ? "w" : "b"))
        fail("side to move does not match FEN");
      for (const move of p.solution) game.move(move);
    } catch {
      fail("invalid FEN or illegal solution move");
    }
  }
  return errors;
}
