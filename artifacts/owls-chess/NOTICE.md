# NOTICE — Owls Chess Club / ScholarForge Chess

This artifact bundles or links the following third-party software and assets.
Each is used under its respective license. No attribution claim is made by the
ScholarForge Chess project beyond what is required by these licenses.

## Runtime libraries — currently bundled in Phase 1

These ship inside the production JavaScript bundle and execute at runtime:

| Project | License | Use |
|---|---|---|
| [chess.js](https://github.com/jhlywa/chess.js) | BSD-2-Clause | Move generation, legality, PGN serialization for live games and puzzles. |
| [react-chessboard](https://github.com/Clariity/react-chessboard) | MIT | Board rendering and drag/drop interaction. |
| [Zustand](https://github.com/pmndrs/zustand) | MIT | Client-side state stores (game, students, settings). |
| [Lucide](https://lucide.dev/) | ISC | UI iconography (e.g. owl, gear, history, alert icons). |
| [Sonner](https://sonner.emilkowal.ski/) | MIT | Toast notifications. |
| [Radix UI](https://www.radix-ui.com/) primitives | MIT | Accessible dialog, popover, select, switch, etc. |
| [Tailwind CSS](https://tailwindcss.com/) | MIT | Utility CSS. |
| [framer-motion](https://www.framer.com/motion/) | MIT | UI animation primitives. |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) / [Workbox](https://developer.chrome.com/docs/workbox) | MIT / Apache-2.0 | Service worker generation, offline shell. |
| [date-fns](https://date-fns.org/) | MIT | Date formatting in roster and game records. |

## Reserved for Phase 2 — installed but not yet imported

These packages are present in `package.json` so Phase 2 work can begin
without a fresh install step, but no code path imports them today:

| Project | License | Future use |
|---|---|---|
| [@dnd-kit](https://dndkit.com/) | MIT | Drag-and-drop primitives for the Phase 2 lesson / position editor. |
| [idb-keyval](https://github.com/jakearchibald/idb-keyval) | Apache-2.0 | IndexedDB convenience layer for Phase 2 bulk-puzzle imports. |

## Chess piece artwork — currently bundled

**Today**: Phase 1 ships using the default piece glyphs provided by
`react-chessboard` (covered by its MIT license, listed above). No additional
piece artwork is bundled in `public/` at this time — the `public/pieces/`
directory does not exist in the Phase 1 build.

The Settings page exposes a "piece set" gallery whose options drive the
preview rendering only; switching sets does not yet load alternate SVG
artwork at the live board.

## Chess piece artwork — planned for Phase 2 (not yet bundled)

When the Phase 2 work bundles dedicated SVG piece artwork, it will derive from
**Lichess piece sets** distributed at <https://github.com/lichess-org/lila/tree/master/public/piece>:

- The `cburnett` piece set (Colin M. L. Burnett, 2006), licensed under the
  **GNU General Public License v3.0 (GPL-3.0)**, with attribution to the
  original author. See `cburnett/COPYING` upstream.
- Lichess's house-designed sets (e.g. `merida`, `alpha`, `cardinal`)
  distributed under **Creative Commons CC0 1.0 Universal (Public Domain
  Dedication)**.

When that bundle ships, ScholarForge Chess will preserve original copyright
and license notices inside `public/pieces/<set>/LICENSE` for any
Lichess-derived artwork.

## Audio

All sound effects (move, capture, check, game-over) are **synthesized at
runtime** with the Web Audio API in `src/lib/sound.ts`. No third-party
audio files are bundled.

## Branding

The "Owls Chess Club" wordmark, owl illustration (`public/favicon.svg`),
and Royal Blue + parchment color system are first-party to this project.

---

If you redistribute this artifact in another form (an exported static
build, a fork, an embedded copy in another product), please retain this
NOTICE.md alongside the bundled code and assets.
