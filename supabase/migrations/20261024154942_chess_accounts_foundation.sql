-- Account/profile slice only. No games, ratings or local-roster migration.
create schema if not exists private;

create table public.chess_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  created_at timestamptz not null default now()
);
create table public.chess_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  created_at timestamptz not null default now()
);
create table public.chess_memberships (
  club_id uuid not null references public.chess_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index chess_memberships_user_id_idx on public.chess_memberships(user_id, club_id);

alter table public.chess_profiles enable row level security;
alter table public.chess_clubs enable row level security;
alter table public.chess_memberships enable row level security;

-- This narrow internal lookup avoids recursive RLS on membership reads.
-- It checks the caller, not a caller-supplied user ID. Not exposed via PostgREST.
create function private.chess_is_staff(target_club uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.chess_memberships m
    where m.club_id = target_club and m.user_id = (select auth.uid())
      and m.active and m.role in ('teacher', 'admin')
  );
$$;
revoke all on function private.chess_is_staff(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.chess_is_staff(uuid) to authenticated;

-- Reset possible project default grants; roles and club enrollment are not
-- client editable. Only trusted administration may provision memberships.
revoke all on public.chess_profiles, public.chess_clubs, public.chess_memberships from anon, authenticated;
grant select on public.chess_profiles, public.chess_clubs, public.chess_memberships to authenticated;
grant insert (user_id, display_name) on public.chess_profiles to authenticated;
grant update (display_name) on public.chess_profiles to authenticated;
grant all on public.chess_profiles, public.chess_clubs, public.chess_memberships to service_role;

create policy chess_memberships_read on public.chess_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.chess_is_staff(club_id));

create policy chess_clubs_read on public.chess_clubs for select to authenticated
  using (exists (
    select 1 from public.chess_memberships m
    where m.club_id = id and m.user_id = (select auth.uid()) and m.active
  ));

create policy chess_profiles_read on public.chess_profiles for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.chess_memberships m
    where m.user_id = chess_profiles.user_id and private.chess_is_staff(m.club_id)
  ));
create policy chess_profiles_insert_own on public.chess_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy chess_profiles_update_own on public.chess_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

comment on table public.chess_profiles is 'Personal chess nickname only. Authorization comes from chess_memberships, never user_metadata.';
comment on table public.chess_memberships is 'Managed by trusted administration; no client insert/update/delete privileges.';
