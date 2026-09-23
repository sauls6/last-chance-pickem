import { createClient } from '@supabase/supabase-js';

const SLEEPER_LEAGUE_ID = '1390903684027670528';
const BASE_API_URL = 'https://api.sleeper.app/v1';
// Week 1 Thursday 8:15 PM ET = Sep 11 2026 00:15 UTC
const WEEK1_THURSDAY_UTC = new Date('2026-09-11T00:15:00Z');

function getThursdayKickoff(week: number): Date {
  return new Date(WEEK1_THURSDAY_UTC.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
}

function padWeek(n: number): string {
  return String(n).padStart(2, '0');
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url}`);
  return res.json() as Promise<T>;
}

interface SleeperState { week: number; season: string; }
interface SleeperUser  { user_id: string; display_name: string; metadata?: { team_name?: string }; }
interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  settings: { wins: number; losses: number; };
}
interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points?: Record<string, number>;
}

async function runSync() {
  console.log('🏈  Last Chance Pick\'Em — Sleeper Sync');
  console.log('══════════════════════════════════════════');

  // ── 1. NFL State ──────────────────────────────────────────
  const state = await fetchJson<SleeperState>(`${BASE_API_URL}/state/nfl`);
  console.log(`📅  Season ${state.season} · Week ${state.week}\n`);

  // ── 2. Users & Rosters ───────────────────────────────────
  const [users, rosters] = await Promise.all([
    fetchJson<SleeperUser[]>(`${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/users`),
    fetchJson<SleeperRoster[]>(`${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/rosters`),
  ]);

  const userMap  = new Map<string, SleeperUser>();
  const rosterMap = new Map<number, SleeperRoster>();
  users.forEach((u) => userMap.set(u.user_id, u));
  rosters.forEach((r) => rosterMap.set(r.roster_id, r));

  console.log(`👥  ${users.length} managers · ${rosters.length} rosters`);

  // ── 3. Week Matchups ─────────────────────────────────────
  const rawMatchups = await fetchJson<SleeperMatchup[]>(
    `${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/matchups/${state.week}`
  );

  const grouped = new Map<number, SleeperMatchup[]>();
  rawMatchups.forEach((m) => {
    if (!grouped.has(m.matchup_id)) grouped.set(m.matchup_id, []);
    grouped.get(m.matchup_id)!.push(m);
  });

  const label = (m: SleeperMatchup): string => {
    const r = rosterMap.get(m.roster_id);
    const u = r ? userMap.get(r.owner_id) : null;
    const name = u?.metadata?.team_name ?? `${u?.display_name ?? 'Manager'}'s Team`;
    return `${name} (${r?.settings.wins ?? 0}-${r?.settings.losses ?? 0})`;
  };

  console.log(`\n⚔️   WEEK ${state.week} MATCHUPS`);
  console.log('──────────────────────────────────────────');
  grouped.forEach((pair, mid) => {
    if (pair.length !== 2) return;
    const [a, b] = pair;
    const scoreA = a.points.toFixed(2);
    const scoreB = b.points.toFixed(2);
    const line = `Matchup ${mid}: ${label(a)}  vs  ${label(b)}`;
    const score = a.points > 0 || b.points > 0 ? `  [${scoreA} – ${scoreB}]` : '  [Not started]';
    console.log(line + score);
  });
  console.log('──────────────────────────────────────────');

  // ── 4. Tiebreaker: Highest Scoring Player ────────────────
  let maxPts = 0;
  let maxRosterId: number | null = null;
  rawMatchups.forEach((m) => {
    Object.values(m.players_points ?? {}).forEach((val) => {
      if (val > maxPts) { maxPts = val; maxRosterId = m.roster_id; }
    });
  });

  const topRoster  = maxRosterId ? rosterMap.get(maxRosterId) : null;
  const topOwner   = topRoster ? userMap.get(topRoster.owner_id) : null;
  const topTeam    = topOwner?.metadata?.team_name ?? topOwner?.display_name ?? 'Unknown';

  console.log(`\n🎯  WEEK ${state.week} TIEBREAKER — Highest Scoring Player`);
  if (maxPts > 0) {
    console.log(`    Answer : ${maxPts.toFixed(2)} pts`);
    console.log(`    Team   : ${topTeam}`);
  } else {
    console.log('    Answer : Pending — games have not started yet');
  }

  // ── 5. Optional Supabase Upsert ──────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('\n💡  No Supabase env vars found.');
    console.log('    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to sync to the database.\n');
    return;
  }

  console.log('\n⚡  Syncing to Supabase…');
  const sb = createClient(supabaseUrl, supabaseKey);

  const kickoffAt = getThursdayKickoff(state.week);
  const now = Date.now();
  const isAfterKickoff = now >= kickoffAt.getTime();
  const isPastWeek = state.week < state.week; // always false here, kept for clarity

  const gameRows = Array.from(grouped.entries()).flatMap(([mid, pair]) => {
    if (pair.length !== 2) return [];
    const [a, b] = pair;
    const gameId = `${state.season}_w${padWeek(state.week)}_m${padWeek(mid)}`;

    let status = 'scheduled';
    if (isAfterKickoff) {
      status = (a.points > 0 || b.points > 0) ? 'in_progress' : 'scheduled';
    }

    const winnerRosterId = status === 'final'
      ? (a.points >= b.points ? a.roster_id : b.roster_id)
      : null;

    return [{
      id:               gameId,
      season:           state.season,
      week:             state.week,
      matchup_id:       mid,
      roster_id_a:      a.roster_id,
      roster_id_b:      b.roster_id,
      kickoff_at:       kickoffAt.toISOString(),
      status,
      score_a:          a.points ?? 0,
      score_b:          b.points ?? 0,
      winner_roster_id: winnerRosterId,
      updated_at:       new Date().toISOString(),
    }];
  });

  const { error: gamesError } = await sb
    .from('games')
    .upsert(gameRows, { onConflict: 'id' });

  if (gamesError) {
    console.error('❌  Games upsert failed:', gamesError.message);
  } else {
    console.log(`✅  Upserted ${gameRows.length} games`);
  }

  // After the week is final, score all picks
  if (gameRows.every((g) => g.status === 'final')) {
    console.log('🏁  Week is final — scoring all picks…');
    const { error: scoreError } = await sb.rpc('score_week_picks', {
      p_season: state.season,
      p_week:   state.week,
    });
    if (scoreError) {
      console.error('❌  Scoring failed:', scoreError.message);
    } else {
      console.log('✅  All picks scored!');
    }
  }

  console.log('\n✨  Sync complete!\n');
}

runSync().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
