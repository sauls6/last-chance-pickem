import { createClient } from '@supabase/supabase-js';

const SLEEPER_LEAGUE_ID = '1390903684027670528';
const BASE_API_URL = 'https://api.sleeper.app/v1';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function runSync() {
  console.log('🏈 Syncing Last Chance Fantasy League with Sleeper...');

  // 1. Fetch State
  const state = await fetchJson<{ week: number; season: string }>(`${BASE_API_URL}/state/nfl`);
  console.log(`📅 Current NFL State: Season ${state.season}, Week ${state.week}`);

  // 2. Fetch Users & Rosters
  const users = await fetchJson<any[]>(`${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/users`);
  const rosters = await fetchJson<any[]>(`${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/rosters`);

  const userMap = new Map<string, any>();
  users.forEach((u) => userMap.set(u.user_id, u));

  console.log(`👥 Loaded ${users.length} managers and ${rosters.length} rosters.`);

  // 3. Fetch Matchups for current week
  const rawMatchups = await fetchJson<any[]>(
    `${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/matchups/${state.week}`
  );

  const grouped = new Map<number, any[]>();
  rawMatchups.forEach((m) => {
    if (!grouped.has(m.matchup_id)) grouped.set(m.matchup_id, []);
    grouped.get(m.matchup_id)!.push(m);
  });

  const rosterMap = new Map<number, any>();
  rosters.forEach((r) => rosterMap.set(r.roster_id, r));

  const getTeamLabel = (m: any) => {
    const r = rosterMap.get(m.roster_id);
    const u = r ? userMap.get(r.owner_id) : null;
    const tname = u?.metadata?.team_name || `${u?.display_name || 'Manager'}'s Team`;
    return `${tname} (${r?.settings?.wins || 0}-${r?.settings?.losses || 0})`;
  };

  console.log(`\n⚔️  WEEK ${state.week} MATCHUPS:`);
  console.log('--------------------------------------------------');
  grouped.forEach((pair, mid) => {
    if (pair.length === 2) {
      console.log(
        `Matchup ${mid}: ${getTeamLabel(pair[0])} vs ${getTeamLabel(pair[1])} | Score: ${pair[0].points} - ${pair[1].points}`
      );
    }
  });
  console.log('--------------------------------------------------');

  // 4. Optional Supabase Sync if env is set
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('\n⚡ Syncing matchups to Supabase database...');
    const sb = createClient(supabaseUrl, supabaseKey);

    const gameRows = Array.from(grouped.entries()).map(([mid, pair]) => {
      const mA = pair[0];
      const mB = pair[1];
      const gameId = `2026_w${state.week < 10 ? '0' + state.week : state.week}_m0${mid}`;

      const kickoff = new Date();
      kickoff.setHours(20, 15, 0, 0); // Thursday 8:15 PM ET

      return {
        id: gameId,
        season: state.season,
        week: state.week,
        kickoff_at: kickoff.toISOString(),
        status: mA.points > 0 || mB.points > 0 ? 'in_progress' : 'scheduled',
        home_score: mA.points || 0,
        away_score: mB.points || 0,
        winner_team_id: null,
      };
    });

    const { error } = await sb.from('games').upsert(gameRows);
    if (error) {
      console.error('❌ Supabase sync failed:', error.message);
    } else {
      console.log('✅ Successfully upserted 6 games into Supabase!');
    }
  } else {
    console.log('\n💡 Tip: Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to automatically sync to your cloud database.');
  }

  console.log('\n✨ Sync complete!');
}

runSync().catch(console.error);
