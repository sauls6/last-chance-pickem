import type { FantasyTeamInfo, LeagueUser, WeeklyMatchup } from '../types';

export const SLEEPER_LEAGUE_ID = '1390903684027670528';
export const BASE_API_URL = 'https://api.sleeper.app/v1';

export function getAvatarUrl(avatarId: string | null | undefined, seedName: string): string {
  if (avatarId && avatarId.trim().length > 0) {
    return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
  }
  const initials = seedName.slice(0, 2).toUpperCase();
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundColor=1C1F26&textColor=F2F2E8`;
}

export interface RawSleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: {
    team_name?: string;
    avatar?: string;
  };
}

export interface RawSleeperRoster {
  roster_id: number;
  owner_id: string;
  settings: {
    wins: number;
    losses: number;
    fpts?: number;
    fpts_decimal?: number;
    ppts?: number;
    ppts_decimal?: number;
  };
}

export interface RawSleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  custom_points?: number | null;
  starters?: string[];
  starters_points?: number[];
  players_points?: Record<string, number>;
}

export interface SleeperState {
  week: number;
  season: string;
  season_type: string;
}

// In-memory cache
const cache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000;

async function fetchWithCache<T>(endpoint: string): Promise<T> {
  const now = Date.now();
  if (cache[endpoint] && now - cache[endpoint].timestamp < CACHE_TTL_MS) {
    return cache[endpoint].data as T;
  }
  const res = await fetch(`${BASE_API_URL}/${endpoint}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  cache[endpoint] = { data, timestamp: now };
  return data as T;
}

export async function fetchNflState(): Promise<SleeperState> {
  return fetchWithCache<SleeperState>('state/nfl');
}

export async function fetchLeagueUsers(): Promise<LeagueUser[]> {
  const [users, rosters] = await Promise.all([
    fetchWithCache<RawSleeperUser[]>(`league/${SLEEPER_LEAGUE_ID}/users`),
    fetchWithCache<RawSleeperRoster[]>(`league/${SLEEPER_LEAGUE_ID}/rosters`),
  ]);

  const rosterByOwner = new Map<string, RawSleeperRoster>();
  rosters.forEach((r) => rosterByOwner.set(r.owner_id, r));

  return users.map((u) => {
    const roster = rosterByOwner.get(u.user_id);
    const teamName = u.metadata?.team_name || `${u.display_name}'s Team`;
    return {
      userId: u.user_id,
      displayName: u.display_name,
      teamName,
      avatarUrl: getAvatarUrl(u.avatar || u.metadata?.avatar, u.display_name),
      rosterId: roster ? roster.roster_id : 0,
    };
  });
}

/**
 * Computes the upcoming Thursday's kickoff time (8:15 PM ET = 00:15 UTC next day).
 * If today IS Thursday after the lock time, returns this Thursday.
 * Otherwise returns the next upcoming Thursday.
 */
function getThursdayKickoff(week: number): Date {
  // Approximate: 2026 NFL Week 1 started Sep 10, 2026
  // Each week advances 7 days. Week 1 Thursday = Sep 10 2026 @ 20:15 ET (00:15 UTC Sep 11)
  const WEEK1_THURSDAY_UTC = new Date('2026-09-11T00:15:00Z');
  const d = new Date(WEEK1_THURSDAY_UTC.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  return d;
}

export async function fetchWeeklyMatchups(
  week: number,
  currentNflWeek: number,
  season = '2026'
): Promise<WeeklyMatchup[]> {
  const [rawMatchups, users, rosters, projectionsMap] = await Promise.all([
    fetchWithCache<RawSleeperMatchup[]>(`league/${SLEEPER_LEAGUE_ID}/matchups/${week}`),
    fetchWithCache<RawSleeperUser[]>(`league/${SLEEPER_LEAGUE_ID}/users`),
    fetchWithCache<RawSleeperRoster[]>(`league/${SLEEPER_LEAGUE_ID}/rosters`),
    fetchWithCache<Record<string, { pts_ppr?: number }>>(
      `projections/nfl/regular/${season}/${week}`
    ).catch(() => null),
  ]);

  const userMap = new Map<string, RawSleeperUser>();
  users.forEach((u) => userMap.set(u.user_id, u));

  const rosterMap = new Map<number, RawSleeperRoster>();
  rosters.forEach((r) => rosterMap.set(r.roster_id, r));

  const completedWeeks = Math.max(1, currentNflWeek - 1);

  const buildTeamInfo = (m: RawSleeperMatchup): FantasyTeamInfo => {
    const roster = rosterMap.get(m.roster_id);
    const owner = roster ? userMap.get(roster.owner_id) : undefined;
    const displayName = owner?.display_name || `Manager ${m.roster_id}`;
    const teamName = owner?.metadata?.team_name || `${displayName}'s Team`;
    const avatarUrl = getAvatarUrl(owner?.avatar || owner?.metadata?.avatar, displayName);
    const record = roster ? `${roster.settings.wins}-${roster.settings.losses}` : '0-0';

    // Season analytics derived from roster settings
    const fpts = (roster?.settings.fpts ?? 0) + (roster?.settings.fpts_decimal ?? 0) / 100;
    const ppts = (roster?.settings.ppts ?? 0) + (roster?.settings.ppts_decimal ?? 0) / 100;
    const avgPoints = Math.round((fpts / completedWeeks) * 100) / 100;
    const startSitAccuracy = ppts > 0 ? Math.round((fpts / ppts) * 1000) / 10 : 100;

    // Lineup projected points from Sleeper's active starters (PPR scoring)
    let projectedPoints = avgPoints;
    if (projectionsMap && m.starters && m.starters.length > 0) {
      const sum = m.starters.reduce(
        (acc, pid) => acc + (projectionsMap[pid]?.pts_ppr ?? 0),
        0
      );
      if (sum > 0) projectedPoints = Math.round(sum * 10) / 10;
    }

    return {
      rosterId: m.roster_id,
      userId: owner?.user_id || `user_${m.roster_id}`,
      displayName,
      teamName,
      avatarUrl,
      record,
      points: m.points || 0,
      projectedPoints,
      avgPoints,
      startSitAccuracy,
    };
  };

  // Group matchups by matchup_id
  const grouped = new Map<number, RawSleeperMatchup[]>();
  rawMatchups.forEach((m) => {
    if (!grouped.has(m.matchup_id)) grouped.set(m.matchup_id, []);
    grouped.get(m.matchup_id)!.push(m);
  });

  const kickoffAt = getThursdayKickoff(week);
  const now = Date.now();
  const isAfterKickoff = now >= kickoffAt.getTime();

  const matchups: WeeklyMatchup[] = [];

  grouped.forEach((pair, matchupId) => {
    if (pair.length < 2) return;
    const [rawA, rawB] = pair;
    const teamA = buildTeamInfo(rawA);
    const teamB = buildTeamInfo(rawB);

    let status: 'scheduled' | 'in_progress' | 'final' = 'scheduled';
    let winnerRosterId: number | null = null;

    if (week < currentNflWeek) {
      status = 'final';
      winnerRosterId = teamA.points >= teamB.points ? teamA.rosterId : teamB.rosterId;
    } else if (week === currentNflWeek) {
      if (teamA.points > 0 || teamB.points > 0) {
        status = 'in_progress';
      } else {
        status = 'scheduled';
      }
    }

    // Locked once Thursday kickoff has passed or it's a past week
    const isLocked = week < currentNflWeek || (week === currentNflWeek && isAfterKickoff);

    // Win probability matching Sleeper's calculation from projected lineup spread
    const projA = teamA.projectedPoints ?? teamA.avgPoints ?? 100;
    const projB = teamB.projectedPoints ?? teamB.avgPoints ?? 100;
    const diff = projA - projB;
    const winProbA = Math.min(95, Math.max(5, Math.round(50 + (diff / 28) * 20)));
    const winProbB = 100 - winProbA;

    // Projected spread label: show the favorite with their margin
    const spread = Math.abs(projA - projB).toFixed(1);
    const favoriteName = projA >= projB ? teamA.displayName : teamB.displayName;
    const projectedSpread = `${favoriteName} -${spread}`;

    matchups.push({
      id: `${season}_w${String(week).padStart(2, '0')}_m${String(matchupId).padStart(2, '0')}`,
      week,
      matchupId,
      teamA,
      teamB,
      status,
      winnerRosterId,
      kickoffAt: kickoffAt.toISOString(),
      isLocked,
      winProbabilityA: winProbA,
      winProbabilityB: winProbB,
      projectedSpread,
    });
  });

  return matchups.sort((a, b) => a.matchupId - b.matchupId);
}

/**
 * Gets the highest player score across all rosters for a given week.
 * Used for the tiebreaker resolution.
 */
export async function fetchWeekHighestPlayerScore(week: number): Promise<number> {
  const rawMatchups = await fetchWithCache<RawSleeperMatchup[]>(
    `league/${SLEEPER_LEAGUE_ID}/matchups/${week}`
  );
  let max = 0;
  rawMatchups.forEach((m) => {
    const pp = m.players_points || {};
    Object.values(pp).forEach((val) => {
      if (typeof val === 'number' && val > max) max = val;
    });
  });
  return max;
}
