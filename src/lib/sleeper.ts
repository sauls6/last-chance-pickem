import type { FantasyTeamInfo, LeagueUser, WeeklyMatchup } from '../types';

export const SLEEPER_LEAGUE_ID = '1390903684027670528';
export const BASE_API_URL = 'https://api.sleeper.app/v1';

export function getAvatarUrl(avatarId: string | null | undefined, seedName: string): string {
  if (avatarId && avatarId.trim().length > 0) {
    return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
  }
  // Clean fallback SVG avatar with manager's initials
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
  };
}

export interface RawSleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  custom_points?: number | null;
  starters?: string[];
  starters_points?: number[];
}

export interface SleeperState {
  week: number;
  season: string;
  season_type: string;
}

// In-memory cache to prevent spamming Sleeper
const cache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function fetchWithCache<T>(endpoint: string): Promise<T> {
  const now = Date.now();
  if (cache[endpoint] && now - cache[endpoint].timestamp < CACHE_TTL_MS) {
    return cache[endpoint].data as T;
  }
  const res = await fetch(`${BASE_API_URL}/${endpoint}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.statusText}`);
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
  rosters.forEach((r) => {
    rosterByOwner.set(r.owner_id, r);
  });

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

export async function fetchWeeklyMatchups(
  week: number,
  currentNflWeek: number
): Promise<WeeklyMatchup[]> {
  const [rawMatchups, users, rosters] = await Promise.all([
    fetchWithCache<RawSleeperMatchup[]>(`league/${SLEEPER_LEAGUE_ID}/matchups/${week}`),
    fetchWithCache<RawSleeperUser[]>(`league/${SLEEPER_LEAGUE_ID}/users`),
    fetchWithCache<RawSleeperRoster[]>(`league/${SLEEPER_LEAGUE_ID}/rosters`),
  ]);

  const userMap = new Map<string, RawSleeperUser>();
  users.forEach((u) => userMap.set(u.user_id, u));

  const rosterMap = new Map<number, RawSleeperRoster>();
  rosters.forEach((r) => rosterMap.set(r.roster_id, r));

  const buildTeamInfo = (m: RawSleeperMatchup): FantasyTeamInfo => {
    const roster = rosterMap.get(m.roster_id);
    const owner = roster ? userMap.get(roster.owner_id) : undefined;
    const displayName = owner?.display_name || `Manager ${m.roster_id}`;
    const teamName = owner?.metadata?.team_name || `${displayName}'s Team`;
    const avatarUrl = getAvatarUrl(owner?.avatar || owner?.metadata?.avatar, displayName);
    const record = roster ? `${roster.settings.wins}-${roster.settings.losses}` : '0-0';

    return {
      rosterId: m.roster_id,
      userId: owner?.user_id || `user_${m.roster_id}`,
      displayName,
      teamName,
      avatarUrl,
      record,
      points: m.points || 0,
    };
  };

  // Group matchups by matchup_id
  const grouped = new Map<number, RawSleeperMatchup[]>();
  rawMatchups.forEach((m) => {
    if (!grouped.has(m.matchup_id)) {
      grouped.set(m.matchup_id, []);
    }
    grouped.get(m.matchup_id)!.push(m);
  });

  const matchups: WeeklyMatchup[] = [];

  // Default Thursday kickoff timestamp for 2026 Season Week 3 (Thursday 8:15 PM ET)
  // Can also calculate dynamically
  const kickoffDate = new Date();
  kickoffDate.setHours(20, 15, 0, 0);

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

    matchups.push({
      id: `2026_w${week < 10 ? '0' + week : week}_m${matchupId < 10 ? '0' + matchupId : matchupId}`,
      week,
      matchupId,
      teamA,
      teamB,
      status,
      winnerRosterId,
      kickoffAt: kickoffDate.toISOString(),
      isLocked: week < currentNflWeek,
    });
  });

  return matchups.sort((a, b) => a.matchupId - b.matchupId);
}
