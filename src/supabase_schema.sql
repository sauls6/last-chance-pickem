-- ==========================================================
-- Supabase Schema for Last Chance Fantasy Pick'em
-- (Adapted directly from thesetpickem.com Supabase architecture)
-- ==========================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  sleeper_user_id text unique not null,
  roster_id int not null,
  display_name text not null,
  team_name text,
  avatar_url text,
  pin_hash text,
  created_at timestamptz default now()
);

-- 2. Games Table
create table if not exists public.games (
  id text primary key,            -- e.g. '2026_w03_m01'
  season text not null default '2026',
  week int not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled', -- 'scheduled', 'in_progress', 'final'
  home_score numeric default 0,
  away_score numeric default 0,
  winner_team_id int,
  is_tie boolean default false,
  created_at timestamptz default now()
);

-- 3. Picks Table
create table if not exists public.picks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,          -- Sleeper user_id or profile UUID
  game_id text not null references public.games(id) on delete cascade,
  selected_roster_id int not null,
  is_correct boolean,
  created_at timestamptz default now(),
  unique (user_id, game_id)
);

-- 4. Tiebreakers Table
create table if not exists public.tiebreakers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season text not null default '2026',
  week int not null,
  predicted_points numeric not null,
  created_at timestamptz default now(),
  unique (user_id, season, week)
);

-- 5. Game Splits RPC (Consensus distribution per game)
create or replace function public.game_splits(p_season text, p_week int)
returns table(game_id text, roster_id int, count bigint, pct numeric) as $$
  select 
    p.game_id, 
    p.selected_roster_id as roster_id, 
    count(*),
    round((count(*) * 100.0 / nullif(sum(count(*)) over (partition by p.game_id), 0)), 0) as pct
  from public.picks p
  join public.games g on g.id = p.game_id
  where g.season = p_season and g.week = p_week
  group by p.game_id, p.selected_roster_id;
$$ language sql stable;

-- 6. Enable Row Level Security (RLS) & Public Policies
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.picks enable row level security;
alter table public.tiebreakers enable row level security;

create policy "Allow public read on profiles" on public.profiles for select using (true);
create policy "Allow public insert/update on profiles" on public.profiles for all using (true);

create policy "Allow public read on games" on public.games for select using (true);
create policy "Allow public insert/update on games" on public.games for all using (true);

create policy "Allow public read on picks" on public.picks for select using (true);
create policy "Allow public insert/update on picks" on public.picks for all using (true);

create policy "Allow public read on tiebreakers" on public.tiebreakers for select using (true);
create policy "Allow public insert/update on tiebreakers" on public.tiebreakers for all using (true);
