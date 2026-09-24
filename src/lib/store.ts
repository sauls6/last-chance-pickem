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

// ─── Auth helpers (Cross-Device Cloud PIN + Local Fallback) ───────────────────

export function getSavedAuthUser(): LeagueUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as LeagueUser) : null;
  } catch {
    return null;
  }
}

export async function saveAuthUser(user: LeagueUser, pin: string): Promise<void> {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  const pins = getSavedPins();
  pins[user.userId] = pin;
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));

  if (supabase) {
    try {
      await supabase
        .from('profiles')
        .upsert({
          sleeper_user_id: user.userId,
          roster_id: user.rosterId,
          display_name: user.displayName,
          team_name: user.teamName,
          avatar_url: user.avatarUrl,
          pin,
        }, { onConflict: 'sleeper_user_id' });
    } catch (e) {
      console.warn('Failed to sync PIN to Supabase:', e);
    }
  }
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

/**
 * Verifies a manager's 4-digit PIN against Supabase profiles table.
 * If no PIN is registered yet for this user, sets this PIN (first claim) and returns true.
 * Falls back to localStorage if offline.
 */
export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('pin')
        .eq('sleeper_user_id', userId)
        .maybeSingle();

      if (!error && data) {
        if (data.pin && data.pin.trim().length > 0) {
          const match = data.pin.trim() === pin.trim();
          if (match) {
            const pins = getSavedPins();
            pins[userId] = pin;
            localStorage.setItem(PINS_KEY, JSON.stringify(pins));
          }
          return match;
        } else {
          // First time this manager has set a PIN in the cloud
          await supabase
            .from('profiles')
            .update({ pin: pin.trim() })
            .eq('sleeper_user_id', userId);

          const pins = getSavedPins();
          pins[userId] = pin;
          localStorage.setItem(PINS_KEY, JSON.stringify(pins));
          return true;
        }
      }
    } catch (e) {
      console.warn('Supabase pin verify failed, falling back to local storage:', e);
    }
  }

  // Local fallback
  const pins = getSavedPins();
  if (!pins[userId]) return true; // first login locally
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

// ─── Game Splits (Live Consensus Distribution Bar) ───────────────────────────

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

        // Ensure both teams have an entry in result for each matchup
        // (Fixes 100/0 edge case so bar always displays even when 0 users pick one side)
        matchups.forEach((m) => {
          if (result[m.id]) {
            if (!result[m.id][m.teamA.rosterId]) {
              result[m.id][m.teamA.rosterId] = { count: 0, pct: 0 };
            }
            if (!result[m.id][m.teamB.rosterId]) {
              result[m.id][m.teamB.rosterId] = { count: 0, pct: 0 };
            }
          }
        });

        return result;
      }
    } catch (e) {
      console.warn('Supabase game_splits RPC failed, using simulated splits', e);
    }
  }

  // Deterministic simulated splits for local/demo mode
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

// ─── Real Supabase Leaderboard ────────────────────────────────────────────────

export interface WeeklyChampion {
  week: number;
  winnerUser: LeagueUser;
  correct: number;
  total: number;
  winPct: number;
}

/**
 * Loads the live leaderboard directly from Supabase picks & games tables.
 * When games haven't finished yet (total graded picks = 0), returns all 12 managers
 * cleanly with 0-0 records, awaiting Week 3 results.
 */
export async function fetchLeaderboard(
  users: LeagueUser[],
  currentUserId?: string
): Promise<LeaderboardEntry[]> {
  if (users.length === 0) return [];

  if (supabase) {
    try {
      const [picksRes, tbRes] = await Promise.all([
        supabase.from('picks').select('user_id, season, week, is_correct').not('is_correct', 'is', null),
        supabase.from('tiebreakers').select('user_id, week, predicted_points, actual_points'),
      ]);

      const picksData = picksRes.data || [];
      const tbData = tbRes.data || [];

      // Per-user statistics
      const userStats = new Map<string, { totalCorrect: number; totalPicks: number; weeklyScores: Map<number, number> }>();
      users.forEach((u) => {
        userStats.set(u.userId, { totalCorrect: 0, totalPicks: 0, weeklyScores: new Map() });
      });

      picksData.forEach((p: { user_id: string; week: number; is_correct: boolean }) => {
        const stats = userStats.get(p.user_id);
        if (stats) {
          stats.totalPicks++;
          if (p.is_correct) {
            stats.totalCorrect++;
            const cur = stats.weeklyScores.get(p.week) ?? 0;
            stats.weeklyScores.set(p.week, cur + 1);
          }
        }
      });

      // Weekly champions resolution (with tiebreaker support)
      const weeklyWinsMap = new Map<string, number>();
      const completedWeeks = Array.from(new Set(picksData.map((p: { week: number }) => p.week)));

      completedWeeks.forEach((wk) => {
        let maxScore = -1;
        const topUsers: string[] = [];

        userStats.forEach((st, uid) => {
          const score = st.weeklyScores.get(wk) ?? 0;
          if (score > maxScore) {
            maxScore = score;
            topUsers.length = 0;
            topUsers.push(uid);
          } else if (score === maxScore && maxScore > 0) {
            topUsers.push(uid);
          }
        });

        if (maxScore > 0 && topUsers.length > 0) {
          if (topUsers.length === 1) {
            weeklyWinsMap.set(topUsers[0], (weeklyWinsMap.get(topUsers[0]) ?? 0) + 1);
          } else {
            // Tiebreaker: closest to actual_points
            let bestDiff = Infinity;
            let tbWinner = topUsers[0];

            topUsers.forEach((uid) => {
              const tb = tbData.find((t: { user_id: string; week: number; predicted_points: number; actual_points?: number }) =>
                t.user_id === uid && t.week === wk && t.actual_points !== null && t.actual_points !== undefined
              );
              if (tb && typeof tb.actual_points === 'number') {
                const diff = Math.abs(tb.predicted_points - tb.actual_points);
                if (diff < bestDiff) {
                  bestDiff = diff;
                  tbWinner = uid;
                }
              }
            });

            weeklyWinsMap.set(tbWinner, (weeklyWinsMap.get(tbWinner) ?? 0) + 1);
          }
        }
      });

      // Construct entries
      const entries: LeaderboardEntry[] = users.map((u) => {
        const st = userStats.get(u.userId) ?? { totalCorrect: 0, totalPicks: 0 };
        const winPct = st.totalPicks > 0
          ? Math.round((st.totalCorrect / st.totalPicks) * 1000) / 10
          : 0;

        return {
          rank: 1,
          rosterId: u.rosterId,
          userId: u.userId,
          displayName: u.displayName,
          teamName: u.teamName,
          avatarUrl: u.avatarUrl,
          totalCorrect: st.totalCorrect,
          totalPicks: st.totalPicks,
          winPct,
          weeklyWins: weeklyWinsMap.get(u.userId) ?? 0,
          isCurrentUser: currentUserId ? u.userId === currentUserId : false,
        };
      });

      // Sort: totalCorrect DESC, winPct DESC, rosterId ASC
      entries.sort((a, b) => {
        if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return a.rosterId - b.rosterId;
      });

      // Assign ranks (handle ties)
      entries.forEach((entry, idx) => {
        if (idx > 0) {
          const prev = entries[idx - 1];
          if (entry.totalCorrect === prev.totalCorrect && entry.winPct === prev.winPct) {
            entry.rank = prev.rank;
          } else {
            entry.rank = idx + 1;
          }
        } else {
          entry.rank = 1;
        }
      });

      return entries;
    } catch (e) {
      console.warn('Supabase leaderboard fetch failed, using fallback:', e);
    }
  }

  // Local/Offline Fallback
  return computeLeaderboard(users, currentUserId);
}

/**
 * Loads completed weekly champions from Supabase.
 * Returns empty array when no weeks are completed yet.
 */
export async function fetchWeeklyChampions(
  users: LeagueUser[]
): Promise<WeeklyChampion[]> {
  if (!supabase || users.length === 0) return [];

  try {
    const { data: picksData, error } = await supabase
      .from('picks')
      .select('user_id, week, is_correct')
      .not('is_correct', 'is', null);

    if (error || !picksData || picksData.length === 0) return [];

    const userMap = new Map<string, LeagueUser>();
    users.forEach((u) => userMap.set(u.userId, u));

    const weekScores = new Map<number, Map<string, { correct: number; total: number }>>();
    picksData.forEach((p: { user_id: string; week: number; is_correct: boolean }) => {
      if (!weekScores.has(p.week)) weekScores.set(p.week, new Map());
      const uMap = weekScores.get(p.week)!;
      if (!uMap.has(p.user_id)) uMap.set(p.user_id, { correct: 0, total: 0 });
      const stat = uMap.get(p.user_id)!;
      stat.total++;
      if (p.is_correct) stat.correct++;
    });

    const champions: WeeklyChampion[] = [];
    const sortedWeeks = Array.from(weekScores.keys()).sort((a, b) => b - a);

    sortedWeeks.forEach((wk) => {
      const uMap = weekScores.get(wk)!;
      let maxCorrect = -1;
      let topUserId: string | null = null;
      let topTotal = 6;

      uMap.forEach((stat, uid) => {
        if (stat.correct > maxCorrect) {
          maxCorrect = stat.correct;
          topUserId = uid;
          topTotal = stat.total;
        }
      });

      if (topUserId && maxCorrect >= 0) {
        const user = userMap.get(topUserId);
        if (user) {
          champions.push({
            week: wk,
            winnerUser: user,
            correct: maxCorrect,
            total: topTotal,
            winPct: topTotal > 0 ? Math.round((maxCorrect / topTotal) * 1000) / 10 : 0,
          });
        }
      }
    });

    return champions;
  } catch {
    return [];
  }
}

// ─── Real Supabase Profile Stats & Badges ─────────────────────────────────────

export async function fetchProfileStats(
  user: LeagueUser,
  rank: number,
  allUsers: LeagueUser[] = []
): Promise<UserProfileStats> {
  if (supabase) {
    try {
      const [userPicksRes, tbRes] = await Promise.all([
        supabase.from('picks').select('*').eq('user_id', user.userId),
        supabase.from('tiebreakers').select('*').eq('user_id', user.userId),
      ]);

      const userPicks = userPicksRes.data || [];
      const userTbs = tbRes.data || [];

      const gradedPicks = userPicks.filter((p: { is_correct: boolean | null }) => p.is_correct !== null);
      const totalCorrect = gradedPicks.filter((p: { is_correct: boolean }) => p.is_correct).length;
      const totalPicks = gradedPicks.length;
      const winPct = totalPicks > 0 ? Math.round((totalCorrect / totalPicks) * 1000) / 10 : 0;

      // Best week score
      const weekScoreMap = new Map<number, { correct: number; total: number }>();
      gradedPicks.forEach((p: { week: number; is_correct: boolean }) => {
        if (!weekScoreMap.has(p.week)) weekScoreMap.set(p.week, { correct: 0, total: 0 });
        const ws = weekScoreMap.get(p.week)!;
        ws.total++;
        if (p.is_correct) ws.correct++;
      });

      let bestWeekStr = '—';
      let maxScore = -1;
      weekScoreMap.forEach((ws, wk) => {
        if (ws.correct > maxScore) {
          maxScore = ws.correct;
          bestWeekStr = `${ws.correct}-${ws.total - ws.correct} (Wk ${wk})`;
        }
      });

      // Upsets called
      let upsetsCalled = 0;
      gradedPicks.forEach((p: { is_correct: boolean }) => {
        if (p.is_correct) upsetsCalled++;
      });

      // Most Picked Team
      const teamPickCount = new Map<number, { count: number; correct: number }>();
      userPicks.forEach((p: { selected_roster_id: number; is_correct: boolean | null }) => {
        if (!teamPickCount.has(p.selected_roster_id)) {
          teamPickCount.set(p.selected_roster_id, { count: 0, correct: 0 });
        }
        const tp = teamPickCount.get(p.selected_roster_id)!;
        tp.count++;
        if (p.is_correct) tp.correct++;
      });

      let mostPickedRosterId = user.rosterId;
      let mostPickedCount = 0;
      let mostPickedCorrect = 0;
      teamPickCount.forEach((val, rid) => {
        if (val.count > mostPickedCount) {
          mostPickedCount = val.count;
          mostPickedRosterId = rid;
          mostPickedCorrect = val.correct;
        }
      });

      const mostPickedUser = allUsers.find((u) => u.rosterId === mostPickedRosterId);
      const mostPickedTeamName = mostPickedUser?.teamName ?? user.teamName;

      // Rival record (Weeks 4 & 14)
      const rivalRosterId = getRivalRosterId(user.rosterId);
      const rivalUser = rivalRosterId ? allUsers.find((u) => u.rosterId === rivalRosterId) : null;
      let rivalWins = 0;
      let rivalLosses = 0;
      let rivalWeeksPlayed = 0;

      gradedPicks.forEach((p: { week: number; is_correct: boolean }) => {
        if (isRivalryWeek(p.week)) {
          rivalWeeksPlayed++;
          if (p.is_correct) rivalWins++;
          else rivalLosses++;
        }
      });

      // Weekly History (W3–W14)
      const weeklyHistory: UserProfileStats['weeklyHistory'] = [];
      for (let w = LAUNCH_WEEK; w <= SEASON_LAST_WEEK; w++) {
        const ws = weekScoreMap.get(w);
        weeklyHistory.push({
          week: w,
          correct: ws ? ws.correct : 0,
          total: ws ? ws.total : 0,
          isRivalryWeek: isRivalryWeek(w),
        });
      }

      // Dynamic Badges
      const hasPickedAtLeastOne = userPicks.length > 0;
      const perfectWeek = Array.from(weekScoreMap.values()).some((ws) => ws.total === 6 && ws.correct === 6);
      const wonTiebreaker = userTbs.some((tb: { actual_points: number | null; predicted_points: number }) =>
        tb.actual_points !== null && tb.actual_points !== undefined && Math.abs(tb.predicted_points - tb.actual_points) <= 1
      );

      const ALL_BADGES: { id: string; name: string; description: string; earned: boolean }[] = [
        { id: 'first_down',   name: 'First Down',   description: 'Submitted picks for a week', earned: hasPickedAtLeastOne },
        { id: 'ironman',      name: 'Ironman',       description: 'Never missed a week',        earned: hasPickedAtLeastOne },
        { id: 'perfect_week', name: 'Perfect Week',  description: 'All 6 picks correct',       earned: perfectWeek },
        { id: 'top_dog',      name: 'Top Dog',       description: 'Won a weekly leaderboard',   earned: rank === 1 && totalCorrect > 0 },
        { id: 'clutch',       name: 'Clutch',        description: 'Won a tiebreaker',          earned: wonTiebreaker },
        { id: 'upset_artist', name: 'Upset Artist',  description: '3 upsets called in a week', earned: upsetsCalled >= 3 },
        { id: 'rival_slayer', name: 'Rival Slayer',  description: 'Won both rivalry weeks',    earned: rivalWins === 2 },
        { id: 'hot_take',     name: 'Hot Take',      description: 'Picked against majority',   earned: false },
      ];

      return {
        user,
        rank,
        totalCorrect,
        totalPicks,
        winPct,
        bestWeek: bestWeekStr,
        upsetsCalledCorrectly: upsetsCalled,
        mostPickedTeam: {
          teamName: mostPickedTeamName,
          count: mostPickedCount,
          correctCount: mostPickedCorrect,
        },
        rivalRecord: {
          rivalRosterId,
          rivalDisplayName: rivalUser?.displayName ?? 'Unknown',
          rivalTeamName: rivalUser?.teamName ?? 'Unknown',
          rivalAvatarUrl: rivalUser?.avatarUrl ?? '',
          yourWins: rivalWins,
          rivalWins: rivalLosses,
          weeksPlayed: rivalWeeksPlayed,
        },
        weeklyHistory,
        badges: ALL_BADGES,
      };
    } catch (e) {
      console.warn('Supabase profile fetch failed, using fallback:', e);
    }
  }

  // Local/Offline Fallback
  return computeProfileStats(user, rank, allUsers);
}

// ─── Synchronous Fallbacks for Offline / Local Demo ───────────────────────────

export function computeLeaderboard(
  users: LeagueUser[],
  currentUserId?: string
): LeaderboardEntry[] {
  if (users.length === 0) return [];

  return users.map((u, i) => ({
    rank: i + 1,
    rosterId: u.rosterId,
    userId: u.userId,
    displayName: u.displayName,
    teamName: u.teamName,
    avatarUrl: u.avatarUrl,
    totalCorrect: 0,
    totalPicks: 0,
    winPct: 0,
    weeklyWins: 0,
    isCurrentUser: currentUserId ? u.userId === currentUserId : false,
  }));
}

export function computeProfileStats(
  user: LeagueUser,
  rank: number,
  allUsers: LeagueUser[] = []
): UserProfileStats {
  const rivalRosterId = getRivalRosterId(user.rosterId);
  const rivalUser = rivalRosterId ? allUsers.find((u) => u.rosterId === rivalRosterId) : null;

  const weeklyHistory: UserProfileStats['weeklyHistory'] = [];
  for (let w = LAUNCH_WEEK; w <= SEASON_LAST_WEEK; w++) {
    weeklyHistory.push({
      week: w,
      correct: 0,
      total: 0,
      isRivalryWeek: isRivalryWeek(w),
    });
  }

  const ALL_BADGES: { id: string; name: string; description: string; earned: boolean }[] = [
    { id: 'first_down',   name: 'First Down',   description: 'Submitted picks for a week', earned: false },
    { id: 'ironman',      name: 'Ironman',       description: 'Never missed a week',        earned: false },
    { id: 'perfect_week', name: 'Perfect Week',  description: 'All 6 picks correct',       earned: false },
    { id: 'top_dog',      name: 'Top Dog',       description: 'Won a weekly leaderboard',   earned: false },
    { id: 'clutch',       name: 'Clutch',        description: 'Won a tiebreaker',          earned: false },
    { id: 'upset_artist', name: 'Upset Artist',  description: '3 upsets called in a week', earned: false },
    { id: 'rival_slayer', name: 'Rival Slayer',  description: 'Won both rivalry weeks',    earned: false },
    { id: 'hot_take',     name: 'Hot Take',      description: 'Picked against majority',   earned: false },
  ];

  return {
    user,
    rank,
    totalCorrect: 0,
    totalPicks: 0,
    winPct: 0,
    bestWeek: '—',
    upsetsCalledCorrectly: 0,
    mostPickedTeam: {
      teamName: user.teamName,
      count: 0,
      correctCount: 0,
    },
    rivalRecord: {
      rivalRosterId,
      rivalDisplayName: rivalUser?.displayName ?? 'Unknown',
      rivalTeamName: rivalUser?.teamName ?? 'Unknown',
      rivalAvatarUrl: rivalUser?.avatarUrl ?? '',
      yourWins: 0,
      rivalWins: 0,
      weeksPlayed: 0,
    },
    weeklyHistory,
    badges: ALL_BADGES,
  };
}
