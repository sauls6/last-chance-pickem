import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Auto-load .env.local and .env when running via tsx (Node.js doesn't auto-load Vite env files)
function loadEnvFile(file: string) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const SLEEPER_LEAGUE_ID = '1390903684027670528';
const BASE_API_URL = 'https://api.sleeper.app/v1';
const LAUNCH_WEEK = 3;

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
interface SleeperUser  {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string; avatar?: string; };
}
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
  console.log(`📅  Season ${state.season} · Current NFL Week ${state.week}\n`);

  // ── 2. Users & Rosters ───────────────────────────────────
  const [users, rosters] = await Promise.all([
    fetchJson<SleeperUser[]>(`${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/users`),
    fetchJson<SleeperRoster[]>(`${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/rosters`),
  ]);

  const userMap  = new Map<string, SleeperUser>();
  const rosterMap = new Map<number, SleeperRoster>();
  const rosterByOwner = new Map<string, SleeperRoster>();
  users.forEach((u) => userMap.set(u.user_id, u));
  rosters.forEach((r) => {
    rosterMap.set(r.roster_id, r);
    rosterByOwner.set(r.owner_id, r);
  });

  console.log(`👥  ${users.length} managers · ${rosters.length} rosters`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const sb = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  if (sb) {
    console.log('\n⚡  Syncing profiles to Supabase…');
    const profileRows = users.map((u) => {
      const r = rosterByOwner.get(u.user_id);
      const avatarUrl = u.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null;
      return {
        sleeper_user_id: u.user_id,
        roster_id: r ? r.roster_id : 0,
        display_name: u.display_name,
        team_name: u.metadata?.team_name || `${u.display_name}'s Team`,
        avatar_url: avatarUrl,
      };
    });

    const { error: profError } = await sb.from('profiles').upsert(profileRows, {
      onConflict: 'sleeper_user_id',
    });
    if (profError) {
      console.warn('⚠️  Profiles upsert note:', profError.message);
    } else {
      console.log(`✅  Upserted ${profileRows.length} manager profiles`);
    }
  }

  // ── 3. Sync all active/completed weeks from LAUNCH_WEEK ───
  for (let w = LAUNCH_WEEK; w <= state.week; w++) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`⚔️   WEEK ${w} MATCHUPS`);
    console.log(`──────────────────────────────────────────`);

    const rawMatchups = await fetchJson<SleeperMatchup[]>(
      `${BASE_API_URL}/league/${SLEEPER_LEAGUE_ID}/matchups/${w}`
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

    grouped.forEach((pair, mid) => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const scoreA = a.points.toFixed(2);
      const scoreB = b.points.toFixed(2);
      const line = `Matchup ${mid}: ${label(a)}  vs  ${label(b)}`;
      const score = a.points > 0 || b.points > 0 ? `  [${scoreA} – ${scoreB}]` : '  [Not started]';
      console.log(line + score);
    });

    // Tiebreaker calculation
    let maxPts = 0;
    let maxRosterId: number | null = null;
    rawMatchups.forEach((m) => {
      Object.values(m.players_points ?? {}).forEach((val) => {
        if (typeof val === 'number' && val > maxPts) {
          maxPts = val;
          maxRosterId = m.roster_id;
        }
      });
    });

    const topRoster  = maxRosterId ? rosterMap.get(maxRosterId) : null;
    const topOwner   = topRoster ? userMap.get(topRoster.owner_id) : null;
    const topTeam    = topOwner?.metadata?.team_name ?? topOwner?.display_name ?? 'Unknown';

    console.log(`\n🎯  Week ${w} Tiebreaker — Highest Scoring Player:`);
    if (maxPts > 0) {
      console.log(`    Score : ${maxPts.toFixed(2)} pts (${topTeam})`);
    } else {
      console.log('    Score : Pending — games have not started yet');
    }

    if (!sb) continue;

    const kickoffAt = getThursdayKickoff(w);
    const now = Date.now();
    const isAfterKickoff = now >= kickoffAt.getTime();

    // Finalization criteria:
    // 1) Sleeper has advanced to a subsequent week (w < state.week)
    // 2) Or Tuesday 10:00 UTC (6 AM ET) after kickoff has arrived
    const tuesdayFinalAt = new Date(kickoffAt.getTime() + 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000);
    const isWeekFinal = w < state.week || now >= tuesdayFinalAt.getTime();

    const gameRows = Array.from(grouped.entries()).flatMap(([mid, pair]) => {
      if (pair.length !== 2) return [];
      const [a, b] = pair;
      const gameId = `${state.season}_w${padWeek(w)}_m${padWeek(mid)}`;

      let status = 'scheduled';
      if (isWeekFinal) {
        status = 'final';
      } else if (isAfterKickoff && (a.points > 0 || b.points > 0)) {
        status = 'in_progress';
      }

      const winnerRosterId = status === 'final'
        ? (a.points >= b.points ? a.roster_id : b.roster_id)
        : null;

      return [{
        id:               gameId,
        season:           state.season,
        week:             w,
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
      console.error(`❌  Week ${w} games upsert failed:`, gamesError.message);
    } else {
      console.log(`✅  Week ${w}: upserted ${gameRows.length} games (status: ${isWeekFinal ? 'FINAL' : isAfterKickoff ? 'IN_PROGRESS' : 'SCHEDULED'})`);
    }

    // Score picks & update tiebreakers if week is final
    if (isWeekFinal && gameRows.length > 0) {
      console.log(`🏁  Week ${w} is final — scoring picks & resolving tiebreaker…`);
      const { error: scoreError } = await sb.rpc('score_week_picks', {
        p_season: state.season,
        p_week:   w,
      });

      if (scoreError) {
        console.error(`❌  Week ${w} pick scoring failed:`, scoreError.message);
      } else {
        console.log(`✅  Week ${w}: all picks scored!`);
      }

      if (maxPts > 0) {
        const { error: tbError } = await sb
          .from('tiebreakers')
          .update({ actual_points: maxPts, updated_at: new Date().toISOString() })
          .eq('season', state.season)
          .eq('week', w);

        if (tbError) {
          console.warn(`⚠️  Week ${w} tiebreaker update note:`, tbError.message);
        } else {
          console.log(`✅  Week ${w}: tiebreaker actual points updated (${maxPts.toFixed(2)})`);
        }
      }
    }
  }

  if (!sb) {
    console.log('\n💡  No Supabase env vars found.');
    console.log('    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to sync to the database.\n');
  } else {
    console.log('\n✨  Sync complete!\n');
  }
}

runSync().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
