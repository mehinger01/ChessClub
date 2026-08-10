# ChessClub

Owls Chess Club / ScholarForge Chess is a browser-based classroom chess platform built with React, Vite, TypeScript, and pnpm workspaces.

## Current application

The primary web app lives at:

`artifacts/owls-chess/`

The repository intentionally keeps the existing workspace structure during the Replit migration so functionality can be verified before any optional flattening/reorganization.

## Requirements

- Node.js 24
- pnpm 10

## Install

```bash
pnpm install --frozen-lockfile
```

## Run ChessClub locally

```bash
pnpm dev:chess
```

The Vite dev server defaults to port `5173`. Set `PORT` only if you need a different port.

## Typecheck

```bash
pnpm typecheck:chess
```

## Production build

```bash
pnpm build:chess
```

Build output is written to:

`artifacts/owls-chess/dist/public/`

## Hosting

The repository includes `vercel.json` configured to build the ChessClub workspace and serve the generated static application with SPA fallback routing.

`BASE_PATH` is optional and defaults to `/`. Set it only when deploying under a sub-path rather than a site root.

## Replit migration

The application no longer requires Replit-provided `PORT` or `BASE_PATH` values to build or run. Replit-specific Vite development plugins are loaded only when a Replit environment is detected.

The legacy `.replit` configuration and Replit development packages are intentionally retained during the parity phase. They are inert in normal local/Vercel builds and can be removed in a later cleanup after deployment parity is confirmed.

## Firebase

Firestore rules are retained in `firestore.rules`. Do not commit Firebase credentials or other secrets to this repository.
