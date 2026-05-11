/**
 * gameArchive — lightweight local archive for completed games.
 *
 * Stores anonymized records in localStorage under `owls_archive_v1`.
 * Player names are NEVER written here — only internal IDs tracked separately.
 * The PGN always uses "White" / "Black" for privacy.
 *
 * This is intentionally a plain-object module (no React) so it can be called
 * from anywhere: stores, effects, download handlers.
 */

export interface ArchivedGame {
  /** Unique game ID (UUID). */
  gameId: string;
  /** Unix ms timestamp when the game ended. */
  timestamp: number;
  /** "1-0" | "0-1" | "1/2-1/2" | "*" */
  result: string;
  /**
   * Anonymized PGN — always [White "White"] / [Black "Black"].
   * Internal player IDs are tracked separately below and never written to PGN.
   */
  pgn: string;
  moveCount: number;
  /**
   * Internal tracking only — these values must NEVER appear in exports.
   * Kept for potential future analytics within the teacher dashboard.
   */
  whitePlayerId: string;
  blackPlayerId: string;
}

const ARCHIVE_KEY = "owls_archive_v1";

function readAll(): ArchivedGame[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(games: ArchivedGame[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(games));
  window.dispatchEvent(new Event("owls-storage"));
}

export const gameArchive = {
  list(): ArchivedGame[] {
    return readAll().slice().sort((a, b) => b.timestamp - a.timestamp);
  },

  save(game: ArchivedGame): void {
    const all = readAll();
    // Deduplicate by gameId so double-saves on re-render are idempotent
    const filtered = all.filter(g => g.gameId !== game.gameId);
    writeAll([...filtered, game]);
  },

  delete(gameId: string): void {
    writeAll(readAll().filter(g => g.gameId !== gameId));
  },

  clear(): void {
    writeAll([]);
  },
};

// ─── Utility: build a download filename ────────────────────────────────────

export function buildPgnFilename(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `ohs-chess-game-${y}-${m}-${day}.pgn`;
}

// ─── Utility: trigger a .pgn browser download ──────────────────────────────

export function downloadPgn(pgn: string, filename: string): void {
  const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
