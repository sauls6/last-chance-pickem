export interface LeagueUser {
  userId: string;
  displayName: string;
  teamName: string;
  avatarUrl: string;
  rosterId: number;
}

export interface RosterSettings {
  wins: number;
  losses: number;
  fpts: number;
}

export interface FantasyTeamInfo {
  rosterId: number;
  userId: string;
  displayName: string;
  teamName: string;
  avatarUrl: string;
  record: string;
  points: number;
  projectedPoints?: number;
}

export interface WeeklyMatchup {
  id: string; // e.g., "2026_w03_m01"
  week: number;
  matchupId: number; // 1 to 6
  teamA: FantasyTeamInfo;
  teamB: FantasyTeamInfo;
  status: 'scheduled' | 'in_progress' | 'final';
  winnerRosterId: number | null;
  kickoffAt: string; // ISO string for Thursday 8:15 PM ET
  isLocked: boolean;
}

export interface UserPick {
  gameId: string;
  matchupId: number;
  week: number;
  selectedRosterId: number;
}

export interface WeeklyTiebreaker {
  week: number;
  predictedPoints: number;
  actualPoints?: number;
}

export interface GameSplit {
  gameId: string;
  rosterId: number;
  count: number;
  pct: number;
}

export interface LeaderboardEntry {
  rank: number;
  rosterId: number;
  userId: string;
  displayName: string;
  teamName: string;
  avatarUrl: string;
  totalCorrect: number;
  totalPicks: number;
  winPct: number;
  streak: string; // e.g. "🔥 3W" or "❄️ 1L"
  weeklyWins: number;
  isCurrentUser?: boolean;
}

export interface UserProfileStats {
  user: LeagueUser;
  rank: number;
  totalCorrect: number;
  totalPicks: number;
  winPct: number;
  bestWeek: string;
  currentStreak: string;
  homerRate: {
    pickedOwn: number;
    totalWeeks: number;
    winRatePct: number;
  };
  weeklyHistory: {
    week: number;
    correct: number;
    total: number;
    picks: {
      matchupId: number;
      pickedRoster: FantasyTeamInfo;
      opponentRoster: FantasyTeamInfo;
      isWinner: boolean | null;
      isPickedOwnTeam: boolean;
    }[];
  }[];
}
