# Data integrity foundation

## Backup v3

The Admin full backup now includes students (including result deduplication
ledgers), puzzle attempts, student game records, the general game archive,
settings, imported puzzle bank, audit history, custom themes and piece sets,
local file-provider data, branding selection, structured provider data and
IndexedDB piece/board blobs. Auth sessions/tokens and unrelated browser data
are never exported.

Imports validate the envelope, nested records, settings, puzzle FENs and
solution legality before any writes. Unsupported versions and incomplete v3
files fail. Earlier v1/v2/unversioned backups remain supported; fields absent
from those formats leave current data intact. Explicit null selection clears
the active student; null puzzleLibrary restores the bundled bank.

Binary writes use a single IndexedDB transaction. Local writes are rolled back
if a write fails; already-committed binary data is restored too. Notifications
are sent only after success. This is failure recovery, not a cross-store crash
transaction: a browser/process crash between IndexedDB and localStorage commits
can still interrupt restore. Retain the downloaded backup until verification.

Corrupt records are not silently replaced with an empty successful backup.
Invalid imported content is rejected rather than crashing a board later.

## Game records and statistics

A game gets an ID when it starts. The same ID is used for the completed
snapshot, student game history and archive, including a casual undo/re-finish.
Student records are upserted by that ID, preventing duplicate saves on route
remounts or repeated callbacks. Existing historical duplicates are preserved;
there is no destructive deduplication of old records.

The student ID and color are captured at game start. Changing the header
selection cannot reassign the outcome. Recording the same game twice does not
increment statistics twice. If a casual game is undone and finishes with a
different outcome, confirming the corrected result replaces the previous
outcome without adding another game. Prior totals without a ledger remain
unchanged. These are local practice statistics, not server-authoritative
online ratings.

## Checks

`pnpm test:chess` covers empty-browser restoration, nested invalid input,
old backup compatibility, quota/binary failure rollback, actual IndexedDB
replacement, game ID/save/result deduplication, student binding and puzzle
legality. It also runs the separate Supabase account permission tests.
