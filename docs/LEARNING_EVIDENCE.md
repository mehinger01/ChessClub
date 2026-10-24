# Shared learning evidence contract — version 1

Status: agreed implementation direction from the master roadmap; not yet a
claim that adaptive tracking or spaced repetition is implemented.

Use the existing `SkillTag` vocabulary in `src/types/index.ts` as the canonical
concept IDs. The current single-string puzzle themes must be mapped into those
IDs during the puzzle-engine slice, keeping original source tags as provenance.
For example, `fork` maps to `forks`; `back-rank` maps to `back_rank_threats`;
`discovered-attack` maps to `discovered_attacks`. An ambiguous broad tag such as
`endgame` is insufficient to assign a specific endgame weakness automatically.

## Observation envelope

Every observation must carry:

- `schemaVersion: 1`, stable event ID and server-received timestamp.
- Auth user/student identity, club ID, source kind (`puzzle` or `game`) and
  stable source record ID. The server derives the actor from authentication.
- Puzzle content version or game move index, exact FEN, attempted move in UCI
  and SAN where legal, legal/illegal result, elapsed time and hint count.
- First-attempt/retry/reveal/abandon outcome, assistance used and prior exposure.
- Canonical concept IDs, content source and analysis engine/settings version.
- For classification: observation evidence, classifier source (engine, teacher
  or student reflection), confidence and a link to the original observation.

Keep raw actions immutable. Correct a label with a superseding classification
record, not by destroying the action history. Use a stable attempt/session ID
so reconnects and repeated requests cannot create new evidence accidentally.

## Separate facts from conclusions

A puzzle's tags identify concepts in the content; they do not identify why the
student missed a move. A wrong move alone cannot establish a vision,
calculation, knowledge or psychological cause. Store uncertain labels as
tentative and use additional evidence or teacher/student reflection.

Keep successful relevant opportunities alongside failures. Normalize game
error trends by opportunity count, difficulty, assistance and recency. Do not
double-count one game mistake and its immediate replay as independent evidence.

## Retention and variety

Maintain one concept review schedule per student, plus a separate exposure
history per exact puzzle and position family. A corrected retry contributes to
instruction, not independent mastery. Schedule a new position on the same
concept for a later independent check; preserve cooldown and family exclusions.
Fresh-position success and later game application are the main retention and
transfer signals. Scheduler policy must be versioned and explainable.

## Supabase boundaries

The account/profile migration does not create a generic JSON upload table for
trusted ratings or mastery. The later evidence schema must enforce actor and
club authorization, deduplicate event IDs and separate client-reported actions
from server-derived chess analysis. Secret keys remain server-side. Each table
exposed to the Data API needs explicit grants and RLS.
