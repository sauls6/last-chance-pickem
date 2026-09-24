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
  avgPoints?: number;         // Season average FPTS per completed week
  startSitAccuracy?: number;  // fpts / ppts * 100
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
  winProbabilityA?: number; // 0–100
  winProbabilityB?: number; // 0–100
  projectedSpread?: string; // e.g. "ene efe ele -18.2"
}

export interface UserPick {
  gameId: string;
  matchupId: number;
  week: number;
  selectedRosterId: number;
}

export interface WeeklyTiebreaker {
  week: number;
  predictedHighestPlayerPoints: number;
  actualHighestPlayerPoints?: number;
  highestPlayerName?: string;
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
  streak?: string; // deprecated: replaced by weeklyWins
  weeklyWins: number;
  isCurrentUser?: boolean;
}

export interface UserProfileStats {
  user: LeagueUser;
  rank: number;
  totalCorrect: number;
  totalPicks: number;
  winPct: number;
  bestWeek: string;           // e.g. "5-1"

  upsetsCalledCorrectly: number;

  mostPickedTeam: {
    teamName: string;
    count: number;
    correctCount: number;
  };

  rivalRecord: {
    rivalRosterId: number | null;
    rivalDisplayName: string;
    rivalTeamName: string;
    rivalAvatarUrl: string;
    yourWins: number;
    rivalWins: number;
    weeksPlayed: number;      // 0, 1, or 2
  };

  weeklyHistory: {
    week: number;
    correct: number;
    total: number;
    isRivalryWeek: boolean;
  }[];

  badges: {
    id: string;
    name: string;
    description: string;
    earned: boolean;
  }[];
}

