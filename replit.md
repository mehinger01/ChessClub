# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- `artifacts/api-server` — Express 5 API server.
- `artifacts/mockup-sandbox` — Vite preview sandbox for component variants.
- `artifacts/owls-chess` — **ScholarForge Chess / Owls Chess Club** (Phase 1
  complete). Browser-based, no-login, single-link classroom chess platform
  for high-school clubs. localStorage-only persistence. Royal Blue +
  parchment + owl branding, no emojis. See `artifacts/owls-chess/NOTICE.md`
  for third-party attribution.

  Owls Chess key surfaces:
  - **chess.js** authoritative engine (`src/engine/chessEngine.ts`),
    wrapped by a Zustand `gameStore` singleton (`src/stores/gameStore.ts`).
  - **Pages**: `home.tsx` (do NOT touch), `play.tsx`, `puzzles.tsx`,
    `roster.tsx`, `admin.tsx`, `settings.tsx`.
  - **Settings** flow through `useSettings()` →
    `providers.updateSettings()` (audit-logged), persisted at
    `owls_settings_v1`. `DarkModeApplier` in `App.tsx` toggles the `dark`
    class on `<html>`.
  - **Game records** persist via `studentStore.saveGameRecord` to
    `owls_game_records_v1`; surfaced in `roster.tsx` via
    `StudentGamesDialog` (download .pgn, delete with confirm).
  - **Teaching features** (M7): `lib/game/openingViolations.ts` is a pure
    detector run inside `gameStore.tryMove`; `AnnotationPopover` captures
    intent / worry / retro prompts per move via `gameStore.setAnnotation`.
    Both arrays are baked into `buildGameRecord()`.
  - **PWA** wired via `vite-plugin-pwa` (M8): `registerType: autoUpdate`,
    SW disabled in dev, manifest scope/start_url honor Vite `BASE_PATH`.
  - **Sounds** synthesized at runtime via Web Audio (`src/lib/sound.ts`);
    no audio files bundled.
