import { Puzzle } from "../lib/storage";

export const puzzles: Puzzle[] = [
  {
    id: "p1",
    title: "Back Rank Mate",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    sideToMove: "w",
    solution: ["Re8#"],
    difficulty: "easy"
  },
  {
    id: "p2",
    title: "Smothered Mate",
    fen: "1r4k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    sideToMove: "w",
    solution: ["Ra8#"], 
    difficulty: "easy"
  },
  {
    id: "p3",
    title: "Queen and Helper",
    fen: "3qk3/3ppp2/8/8/8/8/3PPP2/3QK3 w - - 0 1",
    sideToMove: "w",
    solution: ["Qd6#"],
    difficulty: "easy"
  },
  {
    id: "p4",
    title: "Scholar's Mate",
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    sideToMove: "w",
    solution: ["Qxf7#"],
    difficulty: "easy"
  },
  {
    id: "p5",
    title: "Deflection",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    sideToMove: "w",
    solution: ["Qh5+"],
    difficulty: "easy"
  },
  {
    id: "p6",
    title: "Anastasia's Mate",
    fen: "r4rk1/5Npp/8/8/8/8/5PPP/5RK1 w - - 0 1",
    sideToMove: "w",
    solution: ["Nh6+"], // simplified 1-move version
    difficulty: "medium"
  },
  {
    id: "p7",
    title: "Greek Gift",
    fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w - - 0 1",
    sideToMove: "w",
    solution: ["Bxh7+"],
    difficulty: "hard"
  },
  {
    id: "p8",
    title: "Fool's Mate",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/5P2/6P1/PPPPP2P/RNBQKBNR b KQkq - 0 2",
    sideToMove: "b",
    solution: ["Qh4#"],
    difficulty: "easy"
  },
  {
    id: "p9",
    title: "Discovered Attack",
    fen: "4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1",
    sideToMove: "b",
    solution: ["Rxe1#"],
    difficulty: "easy"
  },
  {
    id: "p10",
    title: "Double Attack",
    fen: "rn1qkbnr/ppp1pppp/8/3p4/4P1b1/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3",
    sideToMove: "w",
    solution: ["Qxg4"],
    difficulty: "medium"
  },
  {
    id: "p11",
    title: "Fork",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    sideToMove: "w",
    solution: ["Qh5"],
    difficulty: "easy"
  },
  {
    id: "p12",
    title: "Pin",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    sideToMove: "w",
    solution: ["Qe2"],
    difficulty: "easy"
  }
];
