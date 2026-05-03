# ScholarForge Chess — Master Blueprint v2.0

**Project:** ScholarForge Chess
**Audience:** High school chess clubs — students and teachers
**Deployment:** Browser-based, single-link, no login required in Phase 1
**Repository:** mehinger01/ChessClub
**Stack:** React 18 + TypeScript, Vite, chess.js, Zustand, @dnd-kit, Tailwind CSS v4

---

## North Star Principle

> *Does this feature help a student understand WHY their thinking was wrong — or does it only tell them THAT it was wrong?*

Every feature decision at every phase must be evaluated against this question. Every major platform tells students they were wrong. No platform reliably teaches them why. That is the gap ScholarForge is built to fill.

---

## Long-Term Vision

ScholarForge Chess becomes:

- A fully rule-correct, classroom-deployable digital chess board
- An adaptive tactical training engine driven by spaced repetition
- A student development tracker that surfaces weakness patterns across games
- A teacher-facing instructional and broadcast platform
- A club management and player progress system

The long-term differentiator is a system that identifies each student's specific cognitive error patterns and generates targeted training to address them — not random puzzles, but the right puzzles at the right time for each individual player.

---

## Phase Structure

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Core Board + Rules + Interaction Foundation | **Active** |
| Phase 2 | Puzzle Engine + Tactical Skill Tracking | Planned |
| Phase 3 | Student Profiles + Adaptive Training | Planned |
| Phase 4 | Teacher Dashboard + Broadcast Tools | Planned |
| Phase 5 | Advanced Systems + Club Management | Planned |

---

---

# PHASE 1 — Core Board + Rules + Interaction Foundation

## Objective

Deliver a stable, rules-correct, classroom-ready chess board that supports student identification, game recording, and full visual customization. Phase 1 is the foundation every future phase builds on. Nothing deferred in Phase 1 should compromise rules correctness or pedagogical integrity.

---

## 1.1 — Rules Engine

**Dependency: chess.js (MIT license) — non-negotiable, integrate from day one.**

Writing a custom rules engine is a multi-month trap that produces an inferior result. chess.js handles all of the following natively and is battle-tested across millions of games. The app owns rendering and state. chess.js owns legality.

| Rule | Coverage |
|---|---|
| All standard piece moves | Yes |
| Pawn initial two-square advance | Yes |
| En passant | Yes |
| Castling (kingside + queenside) | Yes — blocked by check, attacked squares, prior movement |
| Pawn promotion | Yes — modal selector: Q, R, B, N; auto-queen setting |
| Check detection | Yes — king square highlighted; illegal moves blocked |
| Checkmate | Yes — board locked, game-end triggered |
| Stalemate | Yes — draw declared |
| 50-move rule | Yes |
| Threefold repetition | Yes |
| Insufficient material | Yes |
| FEN import/export | Yes |
| PGN export | Yes — includes player names, date, result headers |

**Why this cannot be deferred:** A platform that allows illegal moves does not just fail as a chess tool — it actively teaches chess incorrectly. Beginner mental models of the game are formed in the first 10–20 hours of play. Software that allows illegal moves during that window trains wrong intuitions that take months to undo. The credibility of every lesson delivered through this platform depends on rules correctness from the first move.

---

## 1.2 — Responsive Chess Board

### Layout Requirements

| Requirement | Specification |
|---|---|
| Grid | 8×8 CSS Grid |
| Aspect ratio | Locked 1:1 via `aspect-ratio: 1 / 1` |
| Sizing formula | `width: min(100dvh - 160px, 100dvw - 32px)` |
| Responsive units | `dvh` / `dvw` for mobile browser address bar handling |
| Coordinate labels | Rank (1–8) and file (a–h); toggle on/off in settings |
| Board border | Visible edge, customizable color |
| Resize behavior | Smooth, no jitter, no layout shift |

### Breakpoint Behavior

| Viewport | Board | Notation Panel | Controls |
|---|---|---|---|
| Desktop ≥ 1024px | Centered, sidebar right | Full height, scrollable | Toolbar |
| Tablet 640–1023px | Full width, sidebar below | Collapsed scrollable row | Compact toolbar |
| Mobile < 640px | 100dvw, aspect-ratio locked | Bottom drawer / sheet | Overlay bar |

### Fullscreen Mode

Triggered by the ⛶ icon in the topbar or by pressing `F`. Calls `document.documentElement.requestFullscreen()`. On activation:

- Sidebar (notation + controls) collapses — `width: 0; overflow: hidden`
- Board fills available space using the `min(dvh, dvw)` formula
- Notation moves to a slim horizontal scrolling bar pinned at the bottom
- Game controls move to a second row below the notation bar
- Topbar becomes semi-transparent dark overlay
- Coordinate labels appear directly on board squares
- `fullscreenchange` event listener syncs icon state when user presses Escape

---

## 1.3 — Drag-and-Drop Interaction

| Feature | Implementation |
|---|---|
| Drag library | @dnd-kit/core — Pointer Events API, correct mobile behavior, custom ghost positioning |
| Click fallback | Click-to-select + click-to-place (required for accessibility and touch edge cases) |
| Piece lift | Scale up + drop shadow on mousedown/touchstart |
| Ghost | Follows cursor at center; semi-transparent |
| Illegal drop | Snap-back animation to origin square |
| Legal move highlights | Dot overlay on empty squares; ring overlay on capturable squares; rendered on piece selection |
| Last-move highlight | Origin and destination squares tinted; distinct color from selection highlight |
| Selected piece highlight | Distinct from last-move tint |
| Check highlight | King square tinted red when in check |

---

## 1.4 — Algebraic Notation Log

**This is a Phase 1 requirement, not Phase 2.** Notation is the single most important learning tool in chess education after the board itself. A student who plays 50 games without notation cannot discuss their games, cannot review their mistakes, and cannot communicate with a coach. The habit must be built from the first session on the platform.

| Feature | Specification |
|---|---|
| Format | Standard Algebraic Notation (SAN) |
| Layout | Two-column panel: White / Black, move number prefix |
| Annotations | Check (+), checkmate (#), capture (x), castling (O-O / O-O-O) |
| Current move | Highlighted in panel |
| Auto-scroll | Panel scrolls to latest move automatically |
| Click-to-navigate | Click any move to jump to that board state (read-only replay) |
| Keyboard navigation | Arrow keys step through move history |
| Resume rule | Navigating past moves locks the board for replay; current position resumes live play |
| Position history | Full FEN array stored (not move list) so rewind is O(1) |

---

## 1.5 — Opening Principle Tracker

**This is a Phase 1 feature because it requires no opening database — only rule-based checks on the first 10 moves. It is the lowest-cost, highest-pedagogical-value feature in the entire spec.**

The system passively monitors the first 10 moves of every game and flags principle violations. No engine, no database, no AI — just conditional logic.

### Three Principles Tracked

**1. Center control** — Did the student play a central pawn move (e4, e5, d4, d5) in the first two moves?

**2. Piece development** — Did the student move the same piece twice before developing all minor pieces? Did the student develop the queen too early?

**3. King safety** — Did the student castle within the first 10 moves? Did the student leave the king uncastled after move 8 while the center was open?

### Violation Display

Violations are surfaced in the post-game review screen, not during play. Display as inline annotations in the notation log:

> *Move 4: You moved the same knight twice before developing your bishop. Developing a new piece is usually stronger.*

> *Move 7: Queen developed before minor pieces are active. This invites tempo-gaining attacks.*

This plants the pedagogical seed without interrupting gameplay. The student reads it during review and carries it into the next game.

---

## 1.6 — Board Controls

| Control | Behavior |
|---|---|
| Undo / take-back | Undoes last move in casual mode; confirmation if undoing opponent's move; disabled in tournament mode |
| Resign | Confirmation dialog; recorded in PGN [Result] header |
| Offer draw | Second player accepts/declines; triggers game-end on acceptance |
| New game | Pre-game dialog: player names, color choice, game mode |
| Board flip | Flips perspective; coordinate labels mirror; auto-flip option for pass-and-play |
| Fullscreen | Toggle via icon or F key |
| Sound | Move, capture, check, game-end sounds via Web Audio API; volume slider; mute toggle |

### Pre-Game Setup Dialog

Fields collected before every game:

- White player name / alias
- Black player name / alias
- Optional Elo placeholder (cosmetic only in Phase 1)
- Color assignment: White / Black / Random
- Game mode: Casual (undo allowed) / Tournament (undo disabled)

---

## 1.7 — Game-End Summary and Save

On game end (checkmate, stalemate, resignation, draw acceptance):

- Modal overlay: result, final move count, game duration, opening principle violations summary
- **Save as PGN** — file download; auto-populated PGN headers: [White], [Black], [Date], [Result], [Event], [Site "ScholarForge Chess"]
- **Copy PGN to clipboard**
- **Review Game** — re-enables notation navigation from move 1
- **New Game** — resets board, opens pre-game dialog

Auto-save: full game state (FEN array + metadata) written to localStorage after every half-move. On page load, if an in-progress game exists, prompt to resume.

---

## 1.8 — Student System Foundation

Phase 1 begins the student architecture that Phases 2–4 build on.

### Student Data Model

```js
{
  studentId: "stu_001",
  firstName: "Liam",
  lastInitial: "R",
  displayName: "Liam R.",
  createdAt: "2025-09-01T00:00:00Z",
  active: true
}
```

### Phase 1 Student Features

| Feature | Included |
|---|---|
| Dropdown selector | Yes |
| Add student | Yes |
| Edit / deactivate student | Yes |
| Persist to localStorage | Yes |
| Game history per student | Stored as PGN array |
| Performance data | Schema-ready, calculations deferred to Phase 2 |

### localStorage Key Structure

```
students[]
currentStudent
gameHistory[]
settings{}
themeConfig{}
```

---

## 1.9 — Customization System (Separate Screen)

The settings screen is a full-page route — `/settings` — not a modal. Accessed via the gear icon in the topbar. The back arrow returns to `/game` with all game state preserved.

**Rule: No customization controls appear on the game screen. All customization lives exclusively in the settings screen.**

### Settings Screen Sections

**Section A — Piece Set**

- Built-in set selector chips: CBurnett (default), Merida, Alpha, Maestro, Fresca, California
- All sets sourced from lichess-org/lila via jsDelivr CDN; download all sets to `public/pieces/{setname}/` for offline/PWA use
- 12-slot piece preview grid: each slot shows the piece on both a light and dark square swatch using current board colors
- "Upload custom set" button: accepts ZIP of 12 images or individual slot uploads
- Supported formats: PNG, SVG, WebP
- File naming convention: wK, wQ, wR, wB, wN, wP, bK, bQ, bR, bB, bN, bP (case-insensitive)
- ZIP auto-matching: filename → slot assignment; unmatched files queued for manual assignment
- Validation: 512KB max per file; 64×64 min / 512×512 max pixels; transparency warning for PNG without alpha channel; SVG sanitization (strip script tags before storage)
- Storage: IndexedDB via idb-keyval; max 20MB total for custom assets
- Mini board preview updates live on every change — no save/apply button

**Section B — Board Colors**

- 5 named theme presets: Classic, Tournament Green, Slate, Warm Wood, High Contrast
- Independent color pickers: light squares, dark squares
- Additional pickers: move highlight color, legal move dot color, selected-piece highlight, check highlight
- All pickers include opacity slider
- Custom theme: saveable and nameable
- Live mini board preview updates with every change
- Color changes sync bidirectionally: theme swatches update pickers, pickers update swatches

**Section C — Custom Board Image**

- Upload a single image to replace square colors as board background
- Formats: PNG, SVG, WebP
- Board image and square colors are separate layers — both can be active simultaneously
- Upload stores to IndexedDB

**Section D — Interface Toggles**

- Dark / Light / System UI theme
- Show coordinate labels
- Show legal move highlights
- Auto-promote to queen
- Sound effects on/off
- Auto-flip board for pass-and-play

---

## 1.10 — Thinking Timer (Phase 1 Passive)

**This feature requires zero UI during gameplay — it is invisible to the student while playing.**

The system records how long the student spends on each move in milliseconds via `Date.now()` delta between the previous move completion and the current move submission. This data is stored alongside the PGN and surfaced only in post-game review.

In the game review screen, each move in the notation log is color-coded:

| Time Spent | Color | Label |
|---|---|---|
| Under 5 seconds | Orange | Instant — move made without verification |
| 5–60 seconds | None | Normal thinking range |
| Over 3 minutes | Blue | Extended — possible uncertainty or analysis paralysis |

Research from cognitive science and chess coaching shows that beginner and intermediate errors cluster at the extremes: moves made in under 4 seconds (automatic, unverified pattern assumptions) and moves made after extended indecision (analysis paralysis producing a random or panic choice). Making this visible to a teacher changes what they discuss in the next lesson.

**Storage:** Time-per-move array appended to PGN metadata. No UI impact during play.

---

## 1.11 — Post-Game Annotation Field (Phase 1 Basic)

After a game ends and the student enters review mode, the system presents three text fields for three flagged positions (the three longest-thought moves, or the three moves where an opening principle was violated):

1. *"What were you trying to do here?"*
2. *"What were you worried about?"*
3. *"Looking at it now, what do you think went wrong?"*

The student's written response is saved alongside that position in the game record. No engine analysis is shown until after the student submits their annotation. This is Socratic method applied to chess — students who articulate their own reasoning before seeing the correct answer retain the lesson far more effectively than students who receive engine lines cold.

**Implementation:** Simple `<textarea>` fields in the review screen; stored as JSON alongside PGN. No AI in Phase 1 — that comes in Phase 3.

---

## 1.12 — Phase 1 Build Order

| Sprint | Deliverable | Dependency |
|---|---|---|
| 1A | Board renderer + chess.js integration | None |
| 1B | Drag-and-drop + legal move highlights | 1A |
| 1C | Notation log + position history | 1B |
| 1D | Game-end summary + PGN save | 1C |
| 1E | Student selector + localStorage | 1D |
| 1F | Customization screen (piece sets + colors) | 1E |
| 1G | Fullscreen mode + responsive layout | 1F |
| 1H | Opening principle tracker | 1C |
| 1I | Thinking timer (passive, review display) | 1C, 1D |
| 1J | Post-game annotation fields | 1D |

---

## 1.13 — Phase 1 Non-Goals

Do not build in Phase 1:

- AI opponent
- Online multiplayer
- Chess clock / time controls
- Puzzle engine
- Skill tracking calculations
- Engine analysis / evaluation bar
- Teacher broadcast mode
- User accounts / cloud sync
- Opening database / ECO codes
- Spaced repetition scheduling

---

## 1.14 — Phase 1 Success Criteria

- Board is rules-correct; no illegal move can be made
- Pieces scale correctly at all viewport sizes including fullscreen
- Notation log records every move in SAN and supports click-to-navigate
- Game saves as valid PGN including player names, date, result
- Opening principle violations display in post-game review
- Thinking time per move is recorded and color-coded in review
- Students can be created, selected, and persisted across sessions
- Custom piece sets and board colors live exclusively in the settings screen
- System works fully from a single URL with no backend
- Service worker enables offline play after first load

---

---

# PHASE 2 — Puzzle Engine + Tactical Skill Tracking

## Objective

Build a rule-correct tactical puzzle system with spaced repetition scheduling, candidate move capture, and a mistake taxonomy that distinguishes error types at the cognitive level — not just right/wrong.

---

## 2.1 — Puzzle Schema (Finalized in Phase 1, Built in Phase 2)

**The schema must be finalized in Phase 1 before any puzzle content is created.** A single-move schema built in Phase 1 and retrofitted in Phase 2 is expensive and breaks existing data. Define it correctly now.

```js
{
  puzzleId: "fork_001",
  title: "Knight Fork — Two Targets",
  difficulty: 2,                          // 1–5 scale
  skillTags: ["fork", "knight_tactics"],
  errorType: "knowledge_gap",             // see mistake taxonomy
  sideToMove: "white",
  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  solution: ["Ng5", "Nxf7", "Rxf7"],     // Array — supports multi-move combinations
  hints: [
    "Look for a piece that can attack two targets at once.",
    "Which of your pieces has access to f7?"
  ],
  explanation: "The knight on g5 attacks both the queen on d8 and the rook on f7 after Nxf7.",
  source: "custom"                        // or "lichess_open_db"
}
```

**Why solution must be an array:** Single-move tactics are a small subset of real tactical training. A fork is often a two-move setup. A mating net is three to five moves. A puzzle engine built on a single `correctMove` string cannot teach combinations and cannot be extended without a schema migration.

---

## 2.2 — Candidate Move System

Before a student makes any move in a puzzle — or optionally in a game — the system prompts:

> *"What moves are you considering? List up to 3."*

The student inputs or selects up to three candidate moves before committing. The system records all three candidates alongside the move actually played.

**Why this is the highest-leverage teaching feature in the entire platform:**

The error that loses games almost never happens at the move that was played. It happens earlier, when the right candidate was never considered. A student who never considered Nd6+ on move 12 didn't blunder on move 12 — they failed on move 9 when they stopped looking at knight jumps. Without candidate move data, this is invisible. With it, the teacher can see exactly where the student's vision ended.

This is the core of Botvinnik's training method and the basis of every serious national coaching program. No existing software captures it systematically.

**Data stored per puzzle attempt:**

```js
{
  puzzleId: "fork_001",
  studentId: "stu_001",
  timestamp: "2025-10-14T09:34:00Z",
  candidateMoves: ["Ng5", "Nc3", "d4"],
  moveChosen: "Ng5",
  correct: true,
  timeSpentMs: 47200,
  solutionDepthReached: 3
}
```

---

## 2.3 — Mistake Taxonomy

The current skill tags (`forks`, `pins`, `skewers`) only capture knowledge gaps. That is one of five distinct cognitive error types. The adaptive engine in Phase 3 will be fundamentally incomplete if it cannot distinguish these types — because each requires a completely different instructional response.

| Error Type | Definition | Instructional Response |
|---|---|---|
| Vision error | Student did not see the piece, square, or threat existed | Board vision drills, coordinate training, pattern recognition exercises |
| Calculation error | Student saw the idea but miscounted moves or missed a reply | Forcing-move exercises, longer calculation chains, verification habits |
| Evaluation error | Student calculated correctly but assessed the resulting position incorrectly | Positional understanding, imbalance training, endgame technique |
| Knowledge gap | Student lacked a pattern they had never been shown | Direct instruction on that pattern; show the pattern in 3–5 examples |
| Psychological error | Time pressure, fear, overconfidence, rushing | Reflection prompts, thinking timer data review, process coaching |

Every puzzle in the database is tagged with a primary `errorType`. Every failed attempt is classified by the teacher or system. Phase 3 uses this classification to route students to the correct intervention.

---

## 2.4 — Skill Category Taxonomy (Expanded)

```
Tactical Patterns:
  forks
  pins
  skewers
  discovered_attacks
  double_checks
  deflections
  decoys
  interference
  clearance
  back_rank_threats
  checkmate_patterns

Calculation:
  forcing_moves
  candidate_evaluation
  move_counting
  defensive_calculation

Vision:
  board_vision
  coordinate_training
  piece_awareness
  threat_detection
  checks
  captures

Positional:
  center_control
  piece_activity
  open_files
  weak_squares
  pawn_structure

Opening Principles:
  center_occupation
  piece_development
  king_safety
  tempo

Endgame:
  king_activation
  pawn_endgames
  rook_endgames
  opposition
```

---

## 2.5 — Spaced Repetition Engine

**Build on SM-2 algorithm from the start. Do not use random puzzle selection.**

The research is unambiguous: a student who sees a Knight Fork pattern once and answers correctly will forget it within 10 days without review. The same pattern seen on day 1, day 3, day 7, and day 21 is retained for months.

Every puzzle attempt produces a retention score update. The student's daily practice queue is generated from this model.

### SM-2 Implementation

```js
// Standard SM-2 fields per puzzle per student
{
  puzzleId: "fork_001",
  studentId: "stu_001",
  repetitions: 3,
  easinessFactor: 2.5,          // Adjusted based on performance; min 1.3
  interval: 7,                  // Days until next review
  nextReviewDate: "2025-10-21",
  lastQuality: 4                // 0–5: 0–2 = fail (reset), 3–5 = pass (advance)
}
```

Quality scoring: 5 = correct, fast; 4 = correct, normal; 3 = correct, slow or with hint; 2 = incorrect but close; 1 = incorrect; 0 = blank/gave up.

Failed puzzles (quality 0–2) reset interval to 1 day and are re-queued. Patterns the student fails repeatedly get flagged for teacher review.

---

## 2.6 — Phase 2 Additional Features

| Feature | Description |
|---|---|
| Puzzle browser | Filter by skill tag, error type, difficulty; teacher assigns to student or class |
| Puzzle attempt history | Per-student record of every puzzle, result, candidates, time |
| Weekly skill report | Per-student: puzzles attempted, accuracy by category, SR queue health |
| Pattern recurrence detection | Flags when a student has failed the same skill tag 3+ times across different puzzles |

---

---

# PHASE 3 — Student Profiles + Adaptive Training

## Objective

Build the adaptive layer: full student performance profiles, cross-game pattern analysis, structured game review, and Claude API-powered coaching narratives.

---

## 3.1 — Full Student Performance Profile

```js
{
  studentId: "stu_001",
  displayName: "Liam R.",
  gamesPlayed: 47,
  puzzlesSolved: 312,
  skillProfile: {
    forks:        { accuracy: 0.82, attempts: 38, trend: "stable",   errorType: "knowledge_gap" },
    pins:         { accuracy: 0.44, attempts: 29, trend: "improving","errorType": "calculation" },
    king_safety:  { accuracy: 0.39, attempts: 22, trend: "declining","errorType": "evaluation" },
    board_vision: { accuracy: 0.71, attempts: 55, trend: "stable",   errorType: "vision" }
  },
  openingPrincipleViolations: {
    moved_piece_twice: 12,
    early_queen: 4,
    uncastled_by_move_10: 7
  },
  candidateMoveData: {
    avgCandidatesListed: 1.8,      // Baseline: strong players list 3+
    correctMoveInCandidates: 0.61  // Was the right move ever considered?
  },
  thinkingTimeProfile: {
    avgMoveTimeMs: 24300,
    instantMoves: 0.23,            // Fraction under 5 seconds
    paralysisEpisodes: 8           // Moves over 3 minutes
  },
  srQueueHealth: {
    dueToday: 12,
    overdue: 3,
    masteredPatterns: 34
  }
}
```

---

## 3.2 — Structured Game Review Mode

Current chess platforms show students an accuracy graph and a list of engine moves. Students look at it for 30 seconds and close it. This is pedagogically close to useless.

ScholarForge game review has four structured steps:

**Step 1 — Student self-review (before any evaluation is shown)**
The game replays move by move. The student can flag any move: "I'm not sure about this one." They annotate flagged positions using the three questions from Phase 1 (what were you trying to do / worried about / think went wrong). No engine data visible yet.

**Step 2 — Error classification**
Flagged and system-detected error positions are displayed. For each position, the system (or teacher) classifies the error type from the taxonomy: vision / calculation / evaluation / knowledge gap / psychological. Engine best move shown after classification is assigned.

**Step 3 — Training queue population**
Each classified error position is saved as a custom puzzle in the student's SR queue. The exact position where the error occurred becomes a puzzle the student will see again — from the same side, with the task of finding the move they missed — in 3 days by default.

**Step 4 — Pattern connection**
If this error matches a pattern the student has failed before, the system surfaces it explicitly:

> *"This is the third time you've missed a back-rank threat in your games. Here are all three positions."*

Seeing the same mistake recur across multiple games is a qualitatively different learning experience than reviewing one game in isolation. It transforms isolated mistakes into a training priority.

---

## 3.3 — Claude API Coaching Narratives

**This is the feature that will make students actually open the app between sessions.**

Students do not read performance dashboards. Bar charts and accuracy percentages are for adults with data literacy. High school students respond to stories about themselves.

Instead of displaying:

> Fork accuracy: 67% (+12% this month)

The system generates via Claude API:

> *"Liam, you've solved 14 knight fork puzzles this month. You're finding them quickly when the knight has two clear targets on open squares. You're still missing them when one of the targets is a defended piece — your eye isn't landing on defended pieces as potential fork targets yet. Three puzzles are waiting for you that specifically focus on that pattern."*

The data is identical. The engagement is completely different.

**System prompt pattern:**

```
You are a chess coach writing a brief, encouraging, specific coaching note for a high school student.
Use their name. Be concrete — reference actual numbers and patterns from their data.
Identify one strength and one specific growth area. Name the next step.
Keep it under 100 words. Do not use chess jargon without explaining it.
Tone: warm, direct, like a coach who knows them.

Student data: {JSON performance object}
```

Every student profile page shows their current coaching note, regenerated weekly or on demand. Notes are stored so the teacher can review what each student received.

---

## 3.4 — Phase 3 Additional Features

| Feature | Description |
|---|---|
| Adaptive training queue | Daily practice session generated from SR schedule + identified weak error types |
| Cross-game pattern analysis | Detects repeated tactical themes across all of a student's games |
| Strength / weakness summary | Auto-generated per student; updated after every session |
| Custom training plan | Teacher can override adaptive recommendations for a student |
| Post-annotation engine reveal | After student annotates, show engine line with comparison to student's reasoning |

---

---

# PHASE 4 — Teacher Dashboard + Broadcast Tools

## Objective

Give teachers the tools to run a classroom, monitor all students, author instructional content, and broadcast live demonstrations to the class.

---

## 4.1 — Teacher Broadcast Mode

The teacher has a separate view designed for projection on a classroom screen.

| Feature | Description |
|---|---|
| Position loader | Load any position via FEN or from any student's game history |
| Demonstration moves | Teacher moves pieces on the projected board; students follow on their own devices |
| Class position broadcast | Teacher sends a position to all connected student devices simultaneously |
| Timed challenge | "Everyone has 2 minutes — find the best move for White." Timer visible on all screens |
| Class heatmap | Real-time visualization of which squares students are clicking (see below) |

### Class Heatmap — The Most Innovative Feature in the Platform

When the teacher broadcasts a position and students submit their candidate move, the system displays a live heatmap overlay on the projected board showing which destination squares students are selecting.

If 20 students see a position and 18 of them click the knight, but only 12 click the right destination square, the teacher sees this instantly as a heat concentration. They know without asking: the class identified the piece but not the target. That's a calculation error, not a vision error. The lesson pivots accordingly.

This is a direct translation of clicker-response systems used in mathematics instruction, applied to chess position comprehension. No chess platform does this. It makes whole-class diagnosis possible in real time.

---

## 4.2 — Teacher Lesson Authoring

The teacher creates **interactive lessons** — not just puzzle assignments. The difference is instructional context.

A puzzle says: *"Find the best move."*

A lesson says: *"Here is a position. This is a pin. The bishop on b5 is attacking the knight on c6, which is the only defender of the queen on d8. Notice that the knight cannot move without losing the queen. Now — what happens if White plays Bxc6?"*

### Lesson Builder Features

| Feature | Description |
|---|---|
| Position editor | Set any position via FEN or piece drag-and-drop on an empty board |
| Instructional text | Rich text alongside the board; rendered next to the position |
| Move prompt | Teacher asks a question; student submits a move as the answer |
| Branching | Separate continuation for correct answer vs. incorrect answer |
| Sequence chaining | Multiple positions linked into a multi-step lesson |
| Lesson assignment | Assign to individual student, student group, or entire roster |
| Lesson library | All teacher-authored lessons stored and reusable across sessions |

---

## 4.3 — Teacher Dashboard

| Panel | Contents |
|---|---|
| Class overview | All students: games this week, puzzles attempted, SR queue health, last session |
| At-risk flagging | Students whose skill profile shows three consecutive declining trends |
| Pattern alert | Students who have failed the same skill tag 3+ times without improvement |
| Coaching note review | All Claude-generated coaching notes sent to students this week |
| Lesson performance | Completion rate and accuracy per lesson, per student and class aggregate |
| Game library | Browse, filter, and load any game from any student |

---

---

# PHASE 5 — Advanced Systems + Club Management

## Objective

Complete the platform as a full club management and long-term player development system.

---

## 5.1 — Chess Clock

| Feature | Specification |
|---|---|
| Time controls | Bullet (1+0), Blitz (3+2, 5+0), Rapid (10+0, 15+10), Classical (30+0) |
| Increment | Fischer increment (add N seconds after each move) |
| Display | Large, clear; active player's clock highlighted |
| Flag | Board locks on time forfeit; game-end triggered |
| Custom | Teacher sets any base + increment |

---

## 5.2 — Computer Opponent

| Feature | Specification |
|---|---|
| Engine | Stockfish.js WASM — runs entirely in browser, no server |
| Difficulty | Levels 1–10 mapped to Elo ranges; Level 1 ≈ 400 Elo, Level 10 ≈ 2000+ |
| Teaching mode | Engine explains its move after playing it (Claude API) |
| Hint system | "Show me a good move" — Stockfish suggests without playing |

---

## 5.3 — Opening Explorer

| Feature | Specification |
|---|---|
| Opening name | Detected and displayed in notation header as moves are played |
| ECO code | Standard ECO classification shown |
| Move frequency | Most common continuations from current position |
| Source | Lichess open games database via API |

---

## 5.4 — Chess960 / Fischer Random

Random starting position generator following Chess960 rules. Same Phase 1 rules engine (chess.js supports Chess960 natively). Selectable at game setup.

---

## 5.5 — Club Management

| Feature | Description |
|---|---|
| User accounts | Optional login; game history syncs across devices |
| Elo tracking | Calculated from club games; displayed on profiles |
| Club roster | Teacher manages student roster; exports to CSV |
| Tournament bracket | Round-robin or Swiss pairing; bracket display; result recording |
| Rating history chart | Student Elo over time |
| Club leaderboard | Current standings; filter by active period |

---

---

# Technical Architecture

## Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript | Component model, type safety, ecosystem |
| Build | Vite | Fast dev server, optimal production bundles |
| Rules engine | chess.js | Battle-tested, MIT license, all rules native |
| State | Zustand | Lightweight, persists across route changes without re-mount |
| Drag and drop | @dnd-kit/core | Pointer Events API, correct mobile behavior, custom ghost |
| Animation | Framer Motion | Piece lift, snap-back, illegal move feedback |
| Styling | Tailwind CSS v4 | Utility-first, CSS custom properties for theme system |
| Routing | React Router v6 | `/game` and `/settings` routes minimum |
| Storage — small | localStorage | Game state, settings, student roster, theme config |
| Storage — binary | IndexedDB via idb-keyval | Custom piece images, board images; 20MB limit |
| PWA | Vite PWA plugin + Workbox | Service worker, offline support, home screen install |
| AI (Phase 3+) | Anthropic Claude API | Coaching narratives, position explanations |
| Engine (Phase 5) | Stockfish.js WASM | Computer opponent, hint system |

## File Structure

```
project/
  public/
    pieces/
      cburnett/   (wK.svg … bP.svg)
      merida/
      alpha/
      maestro/
    sounds/
      move.ogg
      capture.ogg
      check.ogg
      end.ogg

  src/
    components/
      board/
        Board.tsx
        Square.tsx
        Piece.tsx
        HighlightLayer.tsx
      notation/
        NotationPanel.tsx
        MoveList.tsx
      controls/
        GameControls.tsx
        PlayerBar.tsx
      settings/
        SettingsScreen.tsx
        PieceUploader.tsx
        ColorPicker.tsx
        ThemePresets.tsx
      review/
        GameReview.tsx
        AnnotationFields.tsx
        ThinkingTimerDisplay.tsx
        OpeningPrincipleReport.tsx
      student/
        StudentSelector.tsx
        StudentProfile.tsx

    store/
      gameStore.ts
      settingsStore.ts
      studentStore.ts

    engine/
      chessEngine.ts        (chess.js wrapper)
      openingPrinciples.ts  (Phase 1 rule checks)
      thinkingTimer.ts      (Phase 1 passive recording)
      spacedRepetition.ts   (Phase 2 SM-2)

    data/
      puzzles/

    hooks/
    utils/
    types/

  index.html
```

---

# Data Model Summary

| Key | Type | Storage | Notes |
|---|---|---|---|
| gameState | FEN array + move history | localStorage | Auto-saved every half-move |
| players | {white, black, elo?} | localStorage | Per session |
| students[] | Student objects | localStorage | Persists across sessions |
| gameHistory[] | PGN strings with metadata | localStorage | Up to 50 games; oldest pruned |
| thinkingTimer[] | ms per move array | Appended to game metadata | Stored with each game |
| annotations{} | Position → text answers | Appended to game metadata | Stored with each game |
| themeConfig | JSON | localStorage | Named presets + custom |
| appSettings | JSON | localStorage | All toggle states |
| assetPacks | Blob URLs | IndexedDB | Custom piece/board images |
| puzzleAttempts[] | Attempt objects | localStorage → Phase 3: cloud | SR scheduling data |
| srSchedule{} | SM-2 state per puzzle per student | localStorage → Phase 3: cloud | Phase 2+ |

---

# Performance Targets

| Metric | Target |
|---|---|
| Initial load (cold) | Under 3 seconds on school Chromebook |
| Move response (drag drop) | Under 16ms (60fps) |
| Board resize smoothness | No layout shift, no jitter |
| Offline availability | Full after first load via service worker |
| Piece image load | Under 200ms per set (bundled, not CDN at runtime) |

---

# Non-Goals — Never Build These

- Ads or monetization of any kind
- Social feeds or public profiles
- External game database queries during play
- Any feature that requires student real names in any public-facing context
- Third-party tracking or analytics SDKs

---

*Blueprint v2.0 — Generated from original Phase 1 spec + GM/master teacher review*
*Repository: mehinger01/ChessClub*
