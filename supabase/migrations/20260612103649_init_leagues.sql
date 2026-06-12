-- PELADA FC — cloud sync for shared leagues.
-- The whole league (players, teams, seasons, matches, ratings, draw) lives as one
-- JSONB document keyed by a short, shareable league code. Document sync keeps the
-- existing local-first store untouched: the app just pushes/pulls this blob.

create table if not exists public.leagues (
  id         text primary key,              -- short shareable code, e.g. "X4K7QP2M"
  data       jsonb not null,                -- the entire LeagueData snapshot
  writer     text,                          -- session id of the last writer (echo suppression)
  updated_at timestamptz not null default now()
);

alter table public.leagues enable row level security;

-- Friends prototype: anyone who knows a league's code can read and write it.
-- The code itself is the access secret. Tighten this with real auth before any
-- public/multi-tenant launch.
drop policy if exists "leagues are public" on public.leagues;
create policy "leagues are public"
  on public.leagues
  for all
  using (true)
  with check (true);

-- Realtime: push row changes to subscribed clients for cross-device sync.
alter publication supabase_realtime add table public.leagues;
