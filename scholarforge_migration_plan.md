# ScholarForge Chess — Migration Plan
## From: Owls Chess Club (Replit) → To: ScholarForge Chess (mehinger01/ChessClub)

---

## What We're Working With

The existing codebase is in better shape than most starting points. It's not a throw-away — it's a foundation we're building on. Here's the honest inventory:

### What already exists and is worth keeping — 100% intact
| Asset | Location | Keep As-Is |
|---|---|---|
| Design system / CSS variables | `artifacts/owls-chess/src/index.css` | YES — drop in directly |
| Tailwind v4 config | `artifacts/owls-chess/` | YES |
| Font system | Inter + Playfair Display + Space Mono | YES |
| Color palette | Royal Blue + Parchment + Navy dark mode | YES |
| App.tsx routing shell | `src/App.tsx` | YES — extend, don't replace |
| shadcn/ui component library | `src/components/ui/` | YES — keep all of it |
| Layout component | `src/components/layout.tsx` | YES — minor additions |
| TanStack Query setup | Already configured | YES |
| Wouter routing | Already configured | YES — add new routes |
| Vite + TypeScript + pnpm setup | Root config files | YES |
| Owl logo + branding | `public/` assets | YES |
| Page shells | home, play, puzzles, roster, admin | YES — gut internals, keep shells |

### What gets replaced
| Asset | Why |
|---|---|
| Existing chess board/engine in `play.tsx` | Replace with chess.js + @dnd-kit implementation |
| Existing puzzle logic in `puzzles.tsx` | Replace with ScholarForge puzzle engine |
| Any existing chess move validation | Replace with chess.js — non-negotiable |

### What gets added new
Everything in Phase 1 of the blueprint that doesn't exist yet.

---

## The Core Principle of This Migration

**We are not starting over. We are slotting the ScholarForge engine into the Owls Chess Club shell.**

The visual identity (Owls Chess, Royal Blue, Parchment, Playfair Display headings) is the brand. It stays. The chess intelligence underneath gets replaced and massively expanded.

---

## Step-by-Step Migration Plan

---

### STEP 1 — Repository Restructure
*Time estimate: 30 minutes*

The current repo has the app buried at `artifacts/owls-chess/`. Promote it to the root.

**In your terminal or Replit Agent, run:**
```bash
# From repo root
cp -r artifacts/owls-chess/* .
cp -r artifacts/owls-chess/.* . 2>/dev/null || true
rm -rf artifacts
```

**Target root structure after Step 1:**
```
ChessClub/
  public/
    favicon.svg
    pieces/           ← ADD: lichess piece sets
      cburnett/
      merida/
      alpha/
      maestro/
    sounds/           ← ADD: move/capture/check/end .ogg files
  src/
    components/
      ui/             ← KEEP: all shadcn components untouched
      layout.tsx      ← KEEP + minor additions
      board/          ← ADD NEW
      notation/       ← ADD NEW
      controls/       ← ADD NEW
      settings/       ← ADD NEW
      review/         ← ADD NEW
      student/        ← ADD NEW
    pages/
      home.tsx        ← KEEP visual design, keep as-is
      play.tsx        ← KEEP shell, REPLACE internals
      puzzles.tsx     ← KEEP shell, REPLACE internals (Phase 2)
      roster.tsx      ← KEEP shell, EXTEND (Phase 1 student system)
      admin.tsx       ← KEEP shell, EXTEND (Phase 4)
      settings.tsx    ← ADD NEW (Phase 1)
      not-found.tsx   ← KEEP
    store/            ← ADD NEW
      gameStore.ts
      settingsStore.ts
      studentStore.ts
    engine/           ← ADD NEW
      chessEngine.ts
      openingPrinciples.ts
      thinkingTimer.ts
    lib/              ← KEEP existing utils
    index.css         ← KEEP 100% unchanged
    App.tsx           ← KEEP + add /settings route
    main.tsx          ← KEEP unchanged
  index.html          ← KEEP unchanged
  package.json        ← UPDATE: add new deps
  vite.config.ts      ← KEEP unchanged
  tsconfig.json       ← KEEP unchanged
```

---

### STEP 2 — Install New Dependencies
*Time estimate: 5 minutes*

```bash
pnpm add chess.js @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zustand framer-motion idb-keyval
pnpm add -D @types/chess.js
```

**What each adds:**
| Package | Purpose |
|---|---|
| `chess.js` | Rules engine — legal moves, check, checkmate, FEN, PGN |
| `@dnd-kit/core` | Drag and drop for pieces — mobile-correct Pointer Events API |
| `@dnd-kit/sortable` | Needed for @dnd-kit internals |
| `@dnd-kit/utilities` | Helper transforms for drag ghost positioning |
| `zustand` | Game state, settings state, student state |
| `framer-motion` | Piece lift animation, snap-back, illegal move feedback |
| `idb-keyval` | IndexedDB wrapper for custom piece/board image storage |

**Already in the project — do NOT reinstall:**
- React 18 + TypeScript
- Tailwind CSS v4
- TanStack Query
- Wouter
- shadcn/ui components
- Inter + Playfair Display (Google Fonts in index.html)

---

### STEP 3 — Preserve index.css Completely
*Time estimate: 0 minutes — no changes needed*

The existing `src/index.css` is already production-quality and carries the entire Owls Chess visual identity. It does not need to be touched. Every new component written for ScholarForge Chess inherits these tokens automatically:

```css
/* These are already defined — use them everywhere */
--primary: 220 80% 30%           /* Royal Blue — buttons, links, active states */
--background: 40 30% 95%         /* Parchment — page background */
--foreground: 220 50% 10%        /* Dark navy — body text */
--sidebar: 220 30% 15%           /* Deep navy — sidebar bg */
--app-font-serif: 'Playfair Display'  /* All headings */
--app-font-sans: 'Inter'              /* All body text */
--app-font-mono: 'Space Mono'         /* Notation, coordinates, FEN strings */
```

**One addition needed** — append these chess-specific tokens to the bottom of `:root` and `.dark` blocks. These extend the system without breaking anything:

```css
/* Append to :root {} in index.css */

/* Board colors — default Classic theme */
--board-light: #F0D9B5;
--board-dark: #B58863;
--board-highlight-move: rgba(246, 246, 105, 0.6);
--board-highlight-select: rgba(20, 85, 30, 0.5);
--board-highlight-check: rgba(220, 50, 50, 0.6);
--board-dot-legal: rgba(0, 0, 0, 0.2);

/* Thinking timer colors */
--timer-instant: hsl(30 90% 55%);    /* Orange — under 5s */
--timer-normal: transparent;
--timer-long: hsl(210 80% 55%);      /* Blue — over 3min */
```

---

### STEP 4 — Add the /settings Route
*Time estimate: 10 minutes*

In `src/App.tsx`, add one line to the router:

```tsx
// Current routes — keep all of these
<Route path="/" component={Home} />
<Route path="/play" component={Play} />
<Route path="/puzzles" component={Puzzles} />
<Route path="/roster" component={Roster} />
<Route path="/admin" component={Admin} />

// ADD this one new route
<Route path="/settings" component={Settings} />

<Route component={NotFound} />
```

Then add the import:
```tsx
import Settings from "./pages/settings";
```

The settings page is a new file — `src/pages/settings.tsx` — that renders the customization screen from the blueprint (piece sets, board colors, interface toggles). It does not replace any existing page.

---

### STEP 5 — Add Gear Icon to Layout Nav
*Time estimate: 15 minutes*

In `src/components/layout.tsx`, add a Settings link to the navigation. The layout already wraps every page — this makes the gear icon appear everywhere automatically.

```tsx
// Add to nav items — position: right side of header
<Link href="/settings">
  <button className="icon-btn" aria-label="Customize">
    <Settings className="w-4 h-4" /> {/* lucide-react icon */}
  </button>
</Link>
```

Keep the existing nav structure — just add the settings icon to it.

---

### STEP 6 — Replace play.tsx Internals
*Time estimate: This is the main Phase 1 build sprint*

The `play.tsx` page shell stays. The URL (`/play`) stays. The visual frame (layout, header, colors) stays. What gets replaced is everything inside the page body.

**Current play.tsx likely has:** A basic board component with click-to-move, possibly no legal move validation.

**What replaces it:** The full ScholarForge board system.

```tsx
// src/pages/play.tsx — new structure
import { Board } from "@/components/board/Board";
import { NotationPanel } from "@/components/notation/NotationPanel";
import { PlayerBar } from "@/components/controls/PlayerBar";
import { GameControls } from "@/components/controls/GameControls";
import { useGameStore } from "@/store/gameStore";

export default function Play() {
  const { isFullscreen } = useGameStore();

  return (
    <div className={`play-layout ${isFullscreen ? 'fullscreen' : ''}`}>
      <PlayerBar color="black" />
      <div className="board-and-sidebar">
        <Board />
        {!isFullscreen && <NotationPanel />}
      </div>
      <PlayerBar color="white" />
      <GameControls />
    </div>
  );
}
```

**Build order for play.tsx internals (follow this sequence — each depends on the previous):**

1. `src/engine/chessEngine.ts` — chess.js wrapper with typed API
2. `src/store/gameStore.ts` — Zustand store for all game state
3. `src/components/board/Square.tsx` — single square component
4. `src/components/board/Piece.tsx` — draggable piece with @dnd-kit
5. `src/components/board/Board.tsx` — 8×8 grid, drag context, highlight layers
6. `src/components/notation/NotationPanel.tsx` — SAN log, click-to-navigate
7. `src/components/controls/PlayerBar.tsx` — player name + captured pieces
8. `src/components/controls/GameControls.tsx` — undo, resign, draw, flip, fullscreen
9. `src/pages/play.tsx` — assemble all components

---

### STEP 7 — Extend roster.tsx for Student System
*Time estimate: 2-3 hours*

The roster page already exists. Extend it:

```tsx
// roster.tsx additions
- Student list with add/edit/deactivate
- Student selector (also used in play.tsx pre-game dialog)
- Game history per student (PGN records)
- localStorage persistence via studentStore
```

This page becomes the Phase 1 student management UI. It likely already has some of this — extend what exists rather than rewriting.

---

### STEP 8 — Build settings.tsx (New Page)
*Time estimate: 3-4 hours*

New file. Full customization screen per the blueprint spec:
- Piece set selector with live mini board preview
- Board color pickers + theme presets
- Custom piece upload (12-slot grid)
- Custom board image upload
- Interface toggles (dark mode, coordinates, legal hints, auto-queen, sound)

All changes write to `settingsStore` (Zustand + localStorage) in real time. No save button needed.

---

### STEP 9 — Add Phase 1 Teaching Features
*Time estimate: 2-3 hours across all three*

These three features attach to the game review flow, not to the board itself:

**Opening Principle Tracker** (`src/engine/openingPrinciples.ts`)
Pure function — takes move history array, returns violations array. Called after game ends. No UI during play.

**Thinking Timer** (`src/engine/thinkingTimer.ts`)
Records `Date.now()` delta between moves. Stored as `timesMs: number[]` alongside PGN. Displayed in review with color coding (orange < 5s, blue > 180s).

**Post-Game Annotation Fields**
Three `<textarea>` elements in the game review modal, shown for the 3 most time-consuming moves. Student answers before engine analysis is shown. Stored in game metadata.

---

## File-by-File Decision Map

| File | Action | Notes |
|---|---|---|
| `src/index.css` | KEEP + append 8 board color vars | Do not change existing tokens |
| `src/main.tsx` | KEEP unchanged | |
| `src/App.tsx` | KEEP + add `/settings` route | One line change |
| `src/components/layout.tsx` | KEEP + add settings gear icon | Minor addition |
| `src/components/ui/*` | KEEP all unchanged | shadcn components |
| `src/pages/home.tsx` | KEEP completely unchanged | This is the visual identity |
| `src/pages/play.tsx` | KEEP shell, REPLACE internals | New board system inside |
| `src/pages/puzzles.tsx` | KEEP shell, STUB internals | Phase 2 build |
| `src/pages/roster.tsx` | KEEP + EXTEND | Add student CRUD + game history |
| `src/pages/admin.tsx` | KEEP shell | Phase 4 build |
| `src/pages/settings.tsx` | ADD NEW | Full customization screen |
| `src/pages/not-found.tsx` | KEEP unchanged | |
| `src/components/board/*` | ADD NEW | Full board system |
| `src/components/notation/*` | ADD NEW | Notation panel |
| `src/components/controls/*` | ADD NEW | Game controls |
| `src/components/settings/*` | ADD NEW | Settings screen components |
| `src/components/review/*` | ADD NEW | Post-game review |
| `src/components/student/*` | ADD NEW | Student selector |
| `src/store/gameStore.ts` | ADD NEW | Zustand game state |
| `src/store/settingsStore.ts` | ADD NEW | Zustand settings + localStorage |
| `src/store/studentStore.ts` | ADD NEW | Zustand student system |
| `src/engine/chessEngine.ts` | ADD NEW | chess.js wrapper |
| `src/engine/openingPrinciples.ts` | ADD NEW | Phase 1 teaching feature |
| `src/engine/thinkingTimer.ts` | ADD NEW | Phase 1 teaching feature |
| `public/pieces/*` | ADD NEW | Download 4 lichess piece sets |
| `public/sounds/*` | ADD NEW | move/capture/check/end .ogg |
| `index.html` | KEEP unchanged | Already correct |
| `package.json` | UPDATE | Add 7 new deps |
| `vite.config.ts` | KEEP + add PWA plugin | Minor addition |

---

## Package.json Delta

**Add to dependencies:**
```json
"chess.js": "^1.3.0",
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^8.0.0",
"@dnd-kit/utilities": "^3.2.2",
"zustand": "^5.0.2",
"framer-motion": "^11.12.0",
"idb-keyval": "^6.2.1"
```

**Add to devDependencies:**
```json
"vite-plugin-pwa": "^0.21.1"
```

**Everything else already installed — do not reinstall.**

---

## What home.tsx Should Look Like (Preserved)

The homepage is the face of Owls Chess Club and should not change at all during this migration. Whatever is currently in `home.tsx` — the hero section with "Master the Royal Game", the Royal Blue background, the Playfair Display headline, the owl logo, the "Play Now" CTA — stays exactly as-is.

The only homepage change that makes sense in Phase 1 is updating the CTA buttons if the route for puzzles or play changed, and potentially adding a brief feature description section as Phase 2 features come online.

**Do not redesign the homepage during Phase 1.**

---

## Build Sprint Order (Phase 1)

Follow this sequence. Each item is unblocked only after the previous is complete.

| # | Task | Estimated Time |
|---|---|---|
| 1 | Repo restructure (promote owls-chess to root) | 30 min |
| 2 | Install 7 new dependencies | 5 min |
| 3 | Append board color tokens to index.css | 15 min |
| 4 | Add /settings route to App.tsx | 10 min |
| 5 | Add gear icon to layout.tsx | 15 min |
| 6 | Write chessEngine.ts (chess.js wrapper) | 1 hour |
| 7 | Write gameStore.ts (Zustand) | 1 hour |
| 8 | Write Square.tsx + Piece.tsx | 2 hours |
| 9 | Write Board.tsx (full drag context + highlights) | 3 hours |
| 10 | Write NotationPanel.tsx | 2 hours |
| 11 | Write PlayerBar.tsx + GameControls.tsx | 1.5 hours |
| 12 | Assemble play.tsx | 1 hour |
| 13 | Write settingsStore.ts | 1 hour |
| 14 | Write PieceUploader.tsx + ColorPicker.tsx | 2 hours |
| 15 | Assemble settings.tsx | 2 hours |
| 16 | Extend roster.tsx with student system | 2 hours |
| 17 | Write studentStore.ts | 1 hour |
| 18 | Write openingPrinciples.ts | 1.5 hours |
| 19 | Write thinkingTimer.ts | 1 hour |
| 20 | Build game review modal with annotation fields | 2 hours |
| 21 | Download piece sets to public/pieces/ | 30 min |
| 22 | Add PWA service worker (vite-plugin-pwa) | 1 hour |
| 23 | End-to-end test: full game, save PGN, resume | 1 hour |
| **Total** | | **~30 hours** |

---

## The One Thing That Must Not Be Compromised

During the migration, if only one thing gets done correctly, it is this:

**chess.js is the rules engine from move one.**

No temporary "we'll add validation later." No "it's fine to allow illegal moves for now while we build the UI." The moment a student can make an illegal move on this platform, the platform loses its classroom credibility. It takes one bishop sliding through a piece in front of a room full of students to lose the teacher's trust permanently.

chess.js drops in as a dependency in 5 minutes. There is no argument for deferring it.

---

*Migration Plan v1.0 — ScholarForge Chess*
*Repository: mehinger01/ChessClub*
