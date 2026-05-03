# Chess Platform – Phase 1 Master Plan

## Project Name

**ScholarForge Chess**
(A classroom-ready instructional chess platform for high school chess clubs)

---

# Vision

Build a browser-based chess platform that combines:

- Chess gameplay
- Tactical training
- Student growth tracking
- Skill diagnostics
- Personalized training recommendations

The system should be:

- Fast
- classroom-friendly
- mobile responsive
- visually distinct
- easy to deploy from a single link

---

# Phase Structure Overview

| Phase | Focus |
|---|---|
| Phase 1 | Core Board + Interaction Foundation |
| Phase 2 | Puzzle Engine + Skill Tracking |
| Phase 3 | Student Profiles + Adaptive Training |
| Phase 4 | Teacher Dashboard + Analytics |
| Phase 5 | Advanced Training Systems + Expansion |

This document defines the FULL implementation plan for **Phase 1**.

---

# PHASE 1 OBJECTIVE

Create a stable, responsive chess board system that supports:

- custom pieces
- click-to-move interaction
- student profiles
- future puzzle integration
- future tracking systems

Phase 1 should function as a reliable classroom-ready digital chess board.

---

# PHASE 1 DELIVERABLES

## 1. Responsive Chess Board

### Requirements

| Requirement | Description |
|---|---|
| 8x8 board | Standard chess layout |
| Equal square sizing | No distortion |
| Responsive resizing | Board scales cleanly |
| Centered layout | Good on laptops/projectors |
| Border around board | Clear visual edge |
| Smooth rendering | No jitter during resize |

### Technical Notes

Use:

- CSS Grid
- aspect-ratio locking
- square-based scaling

Recommended:

```css
aspect-ratio: 1 / 1;
```

---

## 2. Piece Rendering System

### Requirements

| Requirement | Description |
|---|---|
| PNG or SVG pieces | Transparent background |
| Pieces scale with board | Responsive sizing |
| Pieces centered | No drifting |
| Consistent size ratio | Example: 84% |
| Fast rendering | No lag |

### File Structure

```txt
static/
  pieces/
    wK.png
    wQ.png
    wR.png
    wB.png
    wN.png
    wP.png

    bK.png
    bQ.png
    bR.png
    bB.png
    bN.png
    bP.png
```

### Visual Direction

Custom owl-themed pieces.

Goals:

- recognizable silhouettes
- readable at small sizes
- clean contrast
- no visual clutter

---

## 3. Board State Engine

### Requirements

Store board internally as structured data.

Example:

```js
[
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"]
]
```

---

## 4. Interaction Layer

### Phase 1 Features

| Feature | Include |
|---|---|
| Click piece | Yes |
| Highlight selected square | Yes |
| Click destination | Yes |
| Move piece | Yes |
| Drag and drop | Optional |
| Legal move validation | No |
| Check/checkmate | No |

### Interaction Flow

1. User clicks piece
2. Square highlights
3. User clicks destination
4. Piece moves
5. Board updates

---

## 5. Highlight System

### Requirements

| Highlight Type | Purpose |
|---|---|
| Selected square | Current piece |
| Last move | Visual memory |
| Hover effect | UX clarity |

---

## 6. Student System Foundation

Phase 1 begins the student architecture.

---

# STUDENT DATA MODEL

## Students Table

```txt
students
```

| Field | Purpose |
|---|---|
| studentId | Unique ID |
| firstName | Student first name |
| lastInitial | Privacy-safe display |
| displayName | Shown in UI |
| createdAt | Tracking |
| active | Enable/disable |

Example:

```js
{
  studentId: "stu_001",
  firstName: "Liam",
  lastInitial: "R",
  displayName: "Liam R.",
  active: true
}
```

---

## Student Selector

### Requirements

| Feature | Include |
|---|---|
| Dropdown selector | Yes |
| Add student | Yes |
| Save locally | Yes |

---

# LOCAL STORAGE PLAN

Use browser localStorage during Phase 1.

### Benefits

- no login required
- simple deployment
- no backend complexity
- fast iteration

### Example Keys

```txt
students
currentStudent
settings
```

---

# PUZZLE SYSTEM FOUNDATION

Phase 1 should prepare for future puzzle integration.

---

## Puzzle Structure Standard

Every puzzle should eventually support:

```js
{
  puzzleId: "fork_001",
  title: "Knight Fork",
  difficulty: 2,
  skillTags: ["fork"],
  sideToMove: "white",
  correctMove: "Nd6+"
}
```

---

# SKILL TRACKING ARCHITECTURE

Phase 1 should structure data for future analysis.

---

## Skill Categories

Initial set:

```txt
board_vision
checks
captures
threats
forks
pins
skewers
king_safety
checkmate_patterns
opening_principles
endgame_basics
```

---

# FUTURE TRAINING ENGINE

The system should eventually support:

- strengths
- weaknesses
- adaptive practice
- custom training plans

---

## Example Skill Profile

| Skill | Accuracy | Status |
|---|---:|---|
| Forks | 82% | Strength |
| Pins | 44% | Growth Area |
| King Safety | 39% | Priority Gap |

---

## Example Training Recommendation

```txt
Focus Area:
Pins + King Safety

Recommended:
- 5 pin puzzles
- 5 defensive king puzzles
- 2 review lessons
```

---

# UI DESIGN PRINCIPLES

## Goals

- readable
- fast
- classroom-safe
- minimal clutter

---

## Style Direction

| Element | Style |
|---|---|
| Board | clean high contrast |
| Pieces | custom owl set |
| UI | modern minimal |
| Colors | restrained palette |

---

# MOBILE RESPONSIVENESS

Must support:

| Device | Required |
|---|---|
| Laptop | Yes |
| Chromebook | Yes |
| Tablet | Yes |
| Phone | Basic support |

---

# PERFORMANCE TARGETS

| Metric | Goal |
|---|---|
| Initial load | under 3 sec |
| Move response | instant |
| Resize smoothness | stable |

---

# FILE STRUCTURE

Recommended:

```txt
project/
  index.html
  style.css
  app.js

  static/
    pieces/

  data/
    puzzles/

  profiles/
```

---

# PHASE 1 BUILD ORDER

## Phase 1A

Board rendering

### Goal

Stable responsive board.

---

## Phase 1B

Piece rendering

### Goal

Custom pieces render correctly.

---

## Phase 1C

Click-to-move system

### Goal

Basic interaction.

---

## Phase 1D

Student selector

### Goal

Track active player.

---

## Phase 1E

Local storage integration

### Goal

Persist students/settings.

---

# TESTING CHECKLIST

## Board

- squares equal size
- resize stable
- no distortion

## Pieces

- centered
- scaled correctly
- transparent backgrounds

## Interaction

- clicks register
- moves update board

## Student System

- students save correctly
- reload persists data

---

# NON-GOALS FOR PHASE 1

Do NOT build yet:

- AI opponent
- multiplayer
- checkmate engine
- legal move validation
- cloud database
- authentication
- matchmaking

---

# SUCCESS CRITERIA

Phase 1 succeeds when:

- board is stable
- pieces scale correctly
- users can move pieces
- students can be selected
- system works from one link
- foundation supports future expansion

---

# LONG-TERM VISION

Eventually the system becomes:

- instructional chess platform
- adaptive training engine
- club management system
- player development tracker

The long-term differentiator is:

> The system identifies weaknesses and generates targeted training to improve each player over time.

