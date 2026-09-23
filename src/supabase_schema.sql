-- ==========================================================
-- Supabase Schema for Last Chance Fantasy Pick'em
-- Run this entire file in Supabase SQL Editor → New Query → Run
-- ==========================================================

-- ── 1. Profiles ────────────────────────────────────────────
-- One row per manager, keyed by their immutable Sleeper user_id.
-- Names / avatars are stored here as a cache; the app always
-- hydrates from the live Sleeper API on load and updates this row.
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  sleeper_user_id text unique not null,
  roster_id       int  not null,
  display_name    text not null,
  team_name       text,
  avatar_url      text,
  created_at      timestamptz default now()
);

-- ── 2. Games ───────────────────────────────────────────────
-- One row per fantasy matchup per week, upserted by the sync CLI.
-- NOTE: picks table does NOT reference this via FK so picks can be
-- saved even before the sync script runs.
create table if not exists public.games (
  id              text primary key,             -- e.g. '2026_w03_m01'
  season          text not null default '2026',
  week            int  not null,
  matchup_id      int  not null,                -- 1–6 within the week
  roster_id_a     int  not null,
  roster_id_b     int  not null,
  kickoff_at      timestamptz not null,
  status          text not null default 'scheduled',   -- scheduled | in_progress | final
  score_a         numeric default 0,
  score_b         numeric default 0,
  winner_roster_id int,                         -- null until final
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists games_season_week on public.games (season, week);

-- ── 3. Picks ───────────────────────────────────────────────
-- One row per (manager, matchup). No FK to games — picks can be
-- saved independently and scored later by joining game results.
create table if not exists public.picks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null,            -- Sleeper user_id
  game_id             text not null,            -- matches games.id format
  season              text not null default '2026',
  week                int  not null,
  selected_roster_id  int  not null,
  is_correct          boolean,                  -- null until game is final
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id, game_id)
);

create index if not exists picks_user_week on public.picks (user_id, season, week);
create index if not exists picks_game on public.picks (game_id);

-- ── 4. Tiebreakers ─────────────────────────────────────────
-- One row per (manager, season, week).
create table if not exists public.tiebreakers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null,
  season              text not null default '2026',
  week                int  not null,
  predicted_points    numeric not null,         -- manager's guess
  actual_points       numeric,                  -- filled in by sync CLI after week ends
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id, season, week)
);

-- ── 5. Game Splits RPC ─────────────────────────────────────
-- Returns the pick distribution (count + %) per matchup for a given week.
-- Called by getGameSplits() in store.ts when Supabase is connected.
create or replace function public.game_splits(p_season text, p_week int)
returns table(
  "gameId"   text,
  "rosterId" int,
  count      bigint,
  pct        numeric
) as $$
  select
    p.game_id                   as "gameId",
    p.selected_roster_id        as "rosterId",
    count(*)                    as count,
    round(
      count(*) * 100.0
      / nullif(sum(count(*)) over (partition by p.game_id), 0),
      0
    )                           as pct
  from public.picks p
  where p.season = p_season
    and p.week   = p_week
  group by p.game_id, p.selected_roster_id;
$$ language sql stable;

-- ── 6. Score All Picks Helper ──────────────────────────────
-- Called after a week goes final to mark is_correct on every pick.
-- Usage: SELECT score_week_picks('2026', 3);
create or replace function public.score_week_picks(p_season text, p_week int)
returns void as $$
  update public.picks pk
  set
    is_correct = (pk.selected_roster_id = g.winner_roster_id),
    updated_at = now()
  from public.games g
  where g.id     = pk.game_id
    and g.season = p_season
    and g.week   = p_week
    and g.status = 'final'
    and pk.is_correct is null;
$$ language sql;

-- ── 7. Leaderboard View ────────────────────────────────────
-- A convenience view for the season-long standings.
create or replace view public.leaderboard as
  select
    user_id,
    season,
    count(*)          filter (where is_correct is not null)  as total_picks,
    count(*)          filter (where is_correct = true)       as total_correct,
    round(
      count(*) filter (where is_correct = true) * 100.0
      / nullif(count(*) filter (where is_correct is not null), 0),
      1
    )                                                         as win_pct
  from public.picks
  group by user_id, season;

-- ── 8. Row Level Security ──────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.games      enable row level security;
alter table public.picks      enable row level security;
alter table public.tiebreakers enable row level security;

-- Anyone (anon key) can read everything
create policy "Public read profiles"    on public.profiles    for select using (true);
create policy "Public read games"       on public.games       for select using (true);
create policy "Public read picks"       on public.picks       for select using (true);
create policy "Public read tiebreakers" on public.tiebreakers for select using (true);

-- Anyone can insert/update (auth is handled at the app layer via PIN)
create policy "Public write profiles"    on public.profiles    for all using (true) with check (true);
create policy "Public write games"       on public.games       for all using (true) with check (true);
create policy "Public write picks"       on public.picks       for all using (true) with check (true);
create policy "Public write tiebreakers" on public.tiebreakers for all using (true) with check (true);
