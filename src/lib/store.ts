import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameSplit, LeaderboardEntry, LeagueUser, UserPick, UserProfileStats, WeeklyMatchup } from '../types';
import { getRivalRosterId, isRivalryWeek, LAUNCH_WEEK, SEASON_LAST_WEEK } from './rivalries';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConnected = Boolean(supabase);

// Local storage keys
const STORAGE_PREFIX = 'last_chance_pickem_';
const AUTH_KEY = `${STORAGE_PREFIX}active_user`;
const PICKS_KEY = `${STORAGE_PREFIX}user_picks`;
const TIEBREAKERS_KEY = `${STORAGE_PREFIX}tiebreakers`;
const PINS_KEY = `${STORAGE_PREFIX}user_pins`;

// ─── Auth helpers ────────────────────────────────────────────────────────────

export function getSavedAuthUser(): LeagueUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as LeagueUser) : null;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: LeagueUser, pin: string): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  const pins = getSavedPins();
  pins[user.userId] = pin;
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));
}

export function clearAuthUser(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getSavedPins(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function verifyUserPin(userId: string, pin: string): boolean {
  const pins = getSavedPins();
  if (!pins[userId]) return true; // first login — creates the PIN
  return pins[userId] === pin;
}

// ─── Picks ───────────────────────────────────────────────────────────────────

export async function getPicksForWeek(
  userId: string,
  week: number,
  matchupGameIds: string[]
): Promise<Record<string, number>> {
  if (supabase && matchupGameIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('picks')
        .select('game_id, selected_roster_id')
        .eq('user_id', userId)
        .in('game_id', matchupGameIds);

      if (!error && data) {
        const map: Record<string, number> = {};
        (data as { game_id: string; selected_roster_id: number }[]).forEach((r) => {
          map[r.game_id] = r.selected_roster_id;
        });
        return map;
      }
    } catch (e) {
      console.warn('Supabase picks fetch failed, using local storage', e);
    }
  }

  // Local fallback — filter by week (consistent with save path)
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    const allPicks: UserPick[] = raw ? (JSON.parse(raw) as UserPick[]) : [];
    const map: Record<string, number> = {};
    // Only return picks whose gameId is in the current matchup list
    const idSet = new Set(matchupGameIds);
    allPicks
      .filter((p) => p.week === week && idSet.has(p.gameId))
      .forEach((p) => {
        map[p.gameId] = p.selectedRosterId;
      });
    return map;
  } catch {
    return {};
  }
}

export async function savePicksForWeek(
  userId: string,
  week: number,
  picksMap: Record<string, number>,
  matchups: WeeklyMatchup[]
): Promise<void> {
  if (Object.keys(picksMap).length === 0) return;

  const pickEntries: UserPick[] = Object.entries(picksMap).map(([gameId, selectedRosterId]) => {
    const matchup = matchups.find((m) => m.id === gameId);
    return {
      gameId,
      matchupId: matchup ? matchup.matchupId : 0,
      week,
      selectedRosterId,
    };
  });

  if (supabase) {
    try {
      const rows = pickEntries.map((p) => ({
        user_id:            userId,
        game_id:            p.gameId,
        season:             '2026',
        week:               week,
        selected_roster_id: p.selectedRosterId,
      }));
      const { error } = await supabase.from('picks').upsert(rows, { onConflict: 'user_id,game_id' });
      if (error) throw error;
    } catch (e) {
      console.warn('Supabase picks save failed:', e);
    }
  }

  // Always persist locally
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    let allPicks: UserPick[] = raw ? (JSON.parse(raw) as UserPick[]) : [];
    const updatedGameIds = new Set(pickEntries.map((p) => p.gameId));
    allPicks = allPicks.filter((p) => !(p.week === week && updatedGameIds.has(p.gameId)));
    allPicks.push(...pickEntries);
    localStorage.setItem(PICKS_KEY, JSON.stringify(allPicks));
  } catch (e) {
    console.error('Local storage picks save failed', e);
  }
}

// ─── Tiebreaker ──────────────────────────────────────────────────────────────

export async function getTiebreaker(userId: string, week: number): Promise<number | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tiebreakers')
        .select('predicted_points')
        .eq('user_id', userId)
        .eq('week', week)
        .maybeSingle();
      if (!error && data) return Number((data as { predicted_points: number }).predicted_points);
    } catch (e) {
      console.warn('Supabase tiebreaker get failed', e);
    }
  }

  try {
    const raw = localStorage.getItem(TIEBREAKERS_KEY);
    const tb: Record<number, number> = raw ? (JSON.parse(raw) as Record<number, number>) : {};
    return tb[week] !== undefined ? tb[week] : null;
  } catch {
    return null;
  }
}

export async function saveTiebreaker(userId: string, week: number, points: number): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase.from('tiebreakers').upsert({
        user_id: userId,
        season: '2026',
        week,
        predicted_points: points,
      }, { onConflict: 'user_id,season,week' });
      if (error) console.warn('Supabase tiebreaker save failed:', error.message);
    } catch (e) {
      console.warn('Supabase tiebreaker save failed', e);
    }
  }

  try {
    const raw = localStorage.getItem(TIEBREAKERS_KEY);
    const tb: Record<number, number> = raw ? (JSON.parse(raw) as Record<number, number>) : {};
    tb[week] = points;
    localStorage.setItem(TIEBREAKERS_KEY, JSON.stringify(tb));
  } catch (e) {
    console.error('Local tiebreaker save failed', e);
  }
}

// ─── Game Splits ─────────────────────────────────────────────────────────────

export async function getGameSplits(
  week: number,
  matchups: WeeklyMatchup[]
): Promise<Record<string, Record<number, { count: number; pct: number }>>> {
  const result: Record<string, Record<number, { count: number; pct: number }>> = {};

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('game_splits', {
        p_season: '2026',
        p_week: week,
      });
      if (!error && data && Array.isArray(data)) {
        (data as GameSplit[]).forEach((row) => {
          if (!result[row.gameId]) result[row.gameId] = {};
          result[row.gameId][row.rosterId] = {
            count: Number(row.count),
            pct: Number(row.pct),
          };
        });
        return result;
      }
    } catch (e) {
      console.warn('Supabase game_splits RPC failed, using simulated splits', e);
    }
  }

  // Deterministic simulated splits for local/demo mode
  // Uses matchupId as seed so it's consistent across renders
  matchups.forEach((m) => {
    const seed = m.matchupId;
    const pctA = Math.min(85, Math.max(15, 25 + ((seed * 13) % 60)));
    const pctB = 100 - pctA;
    const countA = Math.round((pctA / 100) * 12);
    const countB = 12 - countA;

    result[m.id] = {
      [m.teamA.rosterId]: { count: countA, pct: pctA },
      [m.teamB.rosterId]: { count: countB, pct: pctB },
    };
  });

  return result;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/**
 * Computes leaderboard from the live user list + their real records.
 * The pick correctness data (totalCorrect, winPct, streak) will be real
 * once Supabase is connected; for now they derive from the fantasy record
 * as a proxy — teams that are winning fantasy are likely picking well too.
 */
export function computeLeaderboard(
  users: LeagueUser[],
  currentUserId?: string
): LeaderboardEntry[] {
  if (users.length === 0) return [];

  // We'd normally query Supabase for pick correctness.
  // For now: use placeholder data keyed by userId so it's consistent,
  // but merge real team names and avatars from Sleeper.
  const placeholderData: Record<string, { rank: number; totalCorrect: number; totalPicks: number; streak: string; weeklyWins: number }> = {
    '1395134837886562304': { rank: 1, totalCorrect: 10, totalPicks: 12, streak: '🔥 4W', weeklyWins: 1 },
    '1390920768589676544': { rank: 2, totalCorrect: 9, totalPicks: 12, streak: '🔥 2W', weeklyWins: 1 },
    '1392682409174003712': { rank: 3, totalCorrect: 8, totalPicks: 12, streak: '🔥 1W', weeklyWins: 0 },
    '1390555135712727040': { rank: 4, totalCorrect: 8, totalPicks: 12, streak: '❄️ 1L', weeklyWins: 0 },
    '993653184742633472':  { rank: 5, totalCorrect: 7, totalPicks: 12, streak: '❄️ 1L', weeklyWins: 0 },
    '1002074091014148096': { rank: 6, totalCorrect: 7, totalPicks: 12, streak: '🔥 1W', weeklyWins: 0 },
    '1396637335524769792': { rank: 7, totalCorrect: 6, totalPicks: 12, streak: '❄️ 1L', weeklyWins: 0 },
    '1393409939426246656': { rank: 8, totalCorrect: 6, totalPicks: 12, streak: '🔥 1W', weeklyWins: 0 },
    '1393070831642345472': { rank: 9, totalCorrect: 5, totalPicks: 12, streak: '🔥 1W', weeklyWins: 0 },
    '733806129737535488':  { rank: 10, totalCorrect: 5, totalPicks: 12, streak: '❄️ 2L', weeklyWins: 0 },
    '1392991701408165888': { rank: 11, totalCorrect: 4, totalPicks: 12, streak: '❄️ 2L', weeklyWins: 0 },
    '1263975336966639616': { rank: 12, totalCorrect: 3, totalPicks: 12, streak: '❄️ 2L', weeklyWins: 0 },
  };

  const entries: LeaderboardEntry[] = users.map((u) => {
    const d = placeholderData[u.userId];
    const totalCorrect = d?.totalCorrect ?? 0;
    const totalPicks = d?.totalPicks ?? 12;
    return {
      rank: d?.rank ?? 99,
      rosterId: u.rosterId,
      userId: u.userId,
      displayName: u.displayName,
      teamName: u.teamName,         // ← live from Sleeper, auto-updates with name changes
      avatarUrl: u.avatarUrl,       // ← live from Sleeper CDN
      totalCorrect,
      totalPicks,
      winPct: totalPicks > 0 ? Math.round((totalCorrect / totalPicks) * 1000) / 10 : 0,
      streak: d?.streak ?? '—',
      weeklyWins: d?.weeklyWins ?? 0,
      isCurrentUser: currentUserId ? u.userId === currentUserId : false,
    };
  });

  return entries.sort((a, b) => a.rank - b.rank);
}

/**
 * Returns profile stats for a given user.
 * When Supabase is connected this should query real pick data;
 * for now returns demo data scoped per-user (not a single hardcoded user).
 */
export function computeProfileStats(
  user: LeagueUser,
  rank: number,
  allUsers: LeagueUser[] = []
): UserProfileStats {

  // Placeholder per-user data keyed by userId
  const perUserData: Record<string, {
    totalCorrect: number; totalPicks: number; bestWeek: string;
    upsetsCalled: number;
    mostPickedTeam: string; mostPickedCount: number; mostPickedCorrect: number;
    rivalWins: number; rivalLosses: number; rivalWeeksPlayed: number;
    weekScores: [number, number][]; // [correct, total] per week from LAUNCH_WEEK
    badgeIds: string[];
  }> = {
    '733806129737535488':  { totalCorrect: 5,  totalPicks: 12, bestWeek: '3-3', upsetsCalled: 1, mostPickedTeam: 'ene efe ele', mostPickedCount: 2, mostPickedCorrect: 0, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[2, 6], [3, 6]], badgeIds: ['first_down', 'ironman'] },
    '1395134837886562304': { totalCorrect: 10, totalPicks: 12, bestWeek: '6-0', upsetsCalled: 3, mostPickedTeam: 'The Maye-Trix', mostPickedCount: 2, mostPickedCorrect: 2, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[4, 6], [6, 6]], badgeIds: ['first_down', 'ironman', 'perfect_week'] },
    '1390920768589676544': { totalCorrect: 9,  totalPicks: 12, bestWeek: '5-1', upsetsCalled: 2, mostPickedTeam: 'CEEDEE\'S NUTS', mostPickedCount: 2, mostPickedCorrect: 2, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[4, 6], [5, 6]], badgeIds: ['first_down', 'ironman'] },
    '1392682409174003712': { totalCorrect: 8,  totalPicks: 12, bestWeek: '5-1', upsetsCalled: 2, mostPickedTeam: 'Fear The Doro', mostPickedCount: 2, mostPickedCorrect: 2, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[5, 6], [3, 6]], badgeIds: ['first_down', 'ironman'] },
    '1390555135712727040': { totalCorrect: 8,  totalPicks: 12, bestWeek: '5-1', upsetsCalled: 1, mostPickedTeam: 'Jerry\'s Last Ring', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[5, 6], [3, 6]], badgeIds: ['first_down', 'ironman'] },
    '993653184742633472':  { totalCorrect: 7,  totalPicks: 12, bestWeek: '4-2', upsetsCalled: 1, mostPickedTeam: 'C. McCarrying MyTeam', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[4, 6], [3, 6]], badgeIds: ['first_down', 'ironman'] },
    '1002074091014148096': { totalCorrect: 7,  totalPicks: 12, bestWeek: '4-2', upsetsCalled: 0, mostPickedTeam: 'Jerry\'s Last Ring', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[3, 6], [4, 6]], badgeIds: ['first_down', 'ironman'] },
    '1396637335524769792': { totalCorrect: 6,  totalPicks: 12, bestWeek: '4-2', upsetsCalled: 1, mostPickedTeam: 'Shotgun Germizz', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[4, 6], [2, 6]], badgeIds: ['first_down', 'ironman'] },
    '1393409939426246656': { totalCorrect: 6,  totalPicks: 12, bestWeek: '4-2', upsetsCalled: 0, mostPickedTeam: 'Amon drugs', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[2, 6], [4, 6]], badgeIds: ['first_down', 'ironman'] },
    '1393070831642345472': { totalCorrect: 5,  totalPicks: 12, bestWeek: '3-3', upsetsCalled: 0, mostPickedTeam: 'The Maye-Trix', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[3, 6], [2, 6]], badgeIds: ['first_down'] },
    '1392991701408165888': { totalCorrect: 4,  totalPicks: 12, bestWeek: '3-3', upsetsCalled: 0, mostPickedTeam: 'CEEDEE\'S NUTS', mostPickedCount: 2, mostPickedCorrect: 1, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[3, 6], [1, 6]], badgeIds: ['first_down'] },
    '1263975336966639616': { totalCorrect: 3,  totalPicks: 12, bestWeek: '2-4', upsetsCalled: 0, mostPickedTeam: 'Daejon Love\'s Team', mostPickedCount: 2, mostPickedCorrect: 0, rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0, weekScores: [[2, 6], [1, 6]], badgeIds: ['first_down'] },
  };

  const d = perUserData[user.userId] ?? {
    totalCorrect: 0, totalPicks: 0, bestWeek: '—', upsetsCalled: 0,
    mostPickedTeam: '—', mostPickedCount: 0, mostPickedCorrect: 0,
    rivalWins: 0, rivalLosses: 0, rivalWeeksPlayed: 0,
    weekScores: [], badgeIds: [],
  };
  const winPct = d.totalPicks > 0 ? Math.round((d.totalCorrect / d.totalPicks) * 1000) / 10 : 0;

  // Build rival info
  const rivalRosterId = getRivalRosterId(user.rosterId);
  const rivalUser = rivalRosterId ? allUsers.find((u) => u.rosterId === rivalRosterId) : null;

  // Build weekly history W3–W14
  const weeklyHistory: UserProfileStats['weeklyHistory'] = [];
  for (let w = LAUNCH_WEEK; w <= SEASON_LAST_WEEK; w++) {
    const idx = w - LAUNCH_WEEK;
    const score = d.weekScores[idx];
    weeklyHistory.push({
      week: w,
      correct: score ? score[0] : 0,
      total: score ? score[1] : 0,
      isRivalryWeek: isRivalryWeek(w),
    });
  }

  // Badge definitions
  const ALL_BADGES: { id: string; name: string; description: string }[] = [
    { id: 'first_down',    name: 'First Down',    description: 'Submitted picks for a week' },
    { id: 'ironman',       name: 'Ironman',        description: 'Never missed a week' },
    { id: 'perfect_week',  name: 'Perfect Week',   description: 'All 6 picks correct' },
    { id: 'top_dog',       name: 'Top Dog',        description: 'Won a weekly leaderboard' },
    { id: 'clutch',        name: 'Clutch',         description: 'Won a tiebreaker' },
    { id: 'upset_artist',  name: 'Upset Artist',   description: '3 upsets called in a week' },
    { id: 'rival_slayer',  name: 'Rival Slayer',   description: 'Won both rivalry weeks' },
    { id: 'hot_take',      name: 'Hot Take',       description: 'Picked against majority on 4+ and won the week' },
  ];

  const earnedSet = new Set(d.badgeIds);

  return {
    user,
    rank,
    totalCorrect: d.totalCorrect,
    totalPicks: d.totalPicks,
    winPct,
    bestWeek: d.bestWeek,
    upsetsCalledCorrectly: d.upsetsCalled,
    mostPickedTeam: {
      teamName: d.mostPickedTeam,
      count: d.mostPickedCount,
      correctCount: d.mostPickedCorrect,
    },
    rivalRecord: {
      rivalRosterId,
      rivalDisplayName: rivalUser?.displayName ?? 'Unknown',
      rivalTeamName: rivalUser?.teamName ?? 'Unknown',
      rivalAvatarUrl: rivalUser?.avatarUrl ?? '',
      yourWins: d.rivalWins,
      rivalWins: d.rivalLosses,
      weeksPlayed: d.rivalWeeksPlayed,
    },
    weeklyHistory,
    badges: ALL_BADGES.map((b) => ({
      ...b,
      earned: earnedSet.has(b.id),
    })),
  };
}



