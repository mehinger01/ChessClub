# Supabase account foundation

Supabase is the selected backend (Mike's decision, October 24, 2026). The
React/Vite application and local classroom mode remain in place.

## Scope and release state

This branch adds signup, email/password sign-in, password recovery, sign-out,
cross-device nickname profiles and club membership reads. The SQL migration
enforces access independently of the browser. Roles come from protected
membership rows, never user metadata.

This is a preview foundation, not the complete authenticated chess workspace.
When accounts are enabled the account screen replaces the legacy local-admin
workspace. This prevents a signed-in student from browsing the local roster.
Do not enable this flag on production until the authenticated game/puzzle data
adapter and teacher enrollment workflow are ready. With the flag absent, the
existing classroom app works as before.

Cloud games, ratings, puzzle synchronization, teacher enrollment UI and import
of historical local students are subsequent slices. Local statistics are not
uploaded or represented as trusted rated results.

## Project selection

The connected project inspected during this work contains Falcon Deck tables
(courses, lessons and bell schedules). No migration was applied to it. Use a
dedicated ChessClub project unless Mike explicitly chooses otherwise. Neither
existing student records nor existing auth users have been changed.

## Setup on the selected chess project

1. Review and apply the migration in `supabase/migrations/` on the selected
   project. The migration creates only `chess_profiles`, `chess_clubs`,
   `chess_memberships` and one private authorization helper. Test in an isolated
   preview database first. Do not use the old `firestore.rules` for authorization.
2. Enable email/password authentication with email confirmation. Disable
   anonymous sign-ins. Configure a suitable email sender and recovery delivery.
3. Set the site URL and add the exact preview/production base URLs to Supabase's
   allowed redirect URLs. The SPA handles confirmation/recovery at the base URL.
   School email delivery and browser restrictions still need a real-device test.
4. Configure only the **preview** environment initially:

   ```dotenv
   VITE_CHESS_ACCOUNTS_ENABLED=true
   VITE_SUPABASE_URL=https://YOUR_CHESS_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```

   For local Vite testing put these in the app's untracked `.env.local`.
   Publishable keys are designed for browser clients. Secret/service-role keys
   are rejected by this configuration and must never be included in Vite env.
5. Using trusted database administration, create a club and enroll actual
   confirmed auth user IDs. Bootstrap the teacher/admin membership manually.
   Signup creates no privileged membership. Do not promote users based on an
   email domain or editable metadata.
6. Run the validation below. Review Supabase security/performance advisors on
   the selected project after applying the migration, before rollout.

Example provisioning SQL (replace parameters in a trusted admin session):

```sql
insert into public.chess_clubs(name) values ('Falcons Chess Club') returning id;
-- Use the returned club UUID and the actual confirmed auth user UUID.
insert into public.chess_memberships(club_id, user_id, role)
values (:club_id, :teacher_auth_user_id, 'admin');
insert into public.chess_memberships(club_id, user_id, role)
values (:club_id, :student_auth_user_id, 'student');
```

The placeholders are explanatory, not a ready-to-run seed file. No real user
identities or credentials are included in this repository.

## Verification

```bash
pnpm test:chess
pnpm typecheck:chess
pnpm build:chess
```

For browser regression checks:

```bash
pnpm exec playwright install chromium
pnpm test:chess:browser
```

The browser runner starts and closes its own local Vite servers. Hosted-account
requests are intercepted with a test-only Supabase API fixture; no real accounts
are created and no emails are sent. It verifies session UI behavior, not the
live Supabase Auth service.

The permission test executes the real migration in isolated PostgreSQL via
PGlite and simulates Supabase's auth.uid() boundary. It verifies own-profile
access, scoped teacher reads, cross-club denial, blocked role changes, revoked
membership and denied anonymous reads. It does not replace a live Supabase
Auth/PostgREST test.

Before enabling accounts for students, test two real confirmed accounts in
separate browsers: signup/confirmation, sign-in, refresh, nickname persistence
on another device, recovery, sign-out, inactive memberships, denied access to
another profile and no access to the legacy local admin screen.

## Follow-up implementation boundaries

- Add trusted club enrollment/invitation operations with permission tests.
- Route game/puzzle data through asynchronous Supabase repositories rather
  than copying the global local roster into every signed-in account.
- Keep identifiers for auth users, student profiles and game participants
  explicit. Any migration of old student records requires a reviewed mapping.
- Finalize game results and rating changes on the server; clients submit moves
  and evidence, not authoritative ratings.
- Extend the shared learning evidence contract in `docs/LEARNING_EVIDENCE.md`.

## Sources checked

- Supabase changelog, October 24, 2026. The upcoming HTTP API TLS cipher change
  affects obsolete clients; validate school browsers during rollout.
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/guides/database/postgres/row-level-security

The previous Firebase roadmap remains historical context. It is not the
deployment plan for this account implementation.

## Validation recorded for this branch

- 11 automated checks passed, including real PostgreSQL RLS execution via PGlite.
- Typecheck and production build passed. Existing sourcemap/large-chunk warnings remain.
- Seven browser flow checks passed with no page errors: local result binding/remount,
  full backup download, rejected malformed restore, hosted sign-in/admin isolation,
  nickname/session refresh, sign-out and reset feedback. Hosted API calls were mocked.
- Production/database activation and real email/recovery delivery remain unverified.
