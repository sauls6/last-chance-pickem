import { useState, useEffect } from 'react';
import { BlobNav, type ActiveTab } from './components/BlobNav';
import { Header } from './components/Header';
import { PicksView } from './components/PicksView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { PinAuthModal } from './components/PinAuthModal';
import type { LeaderboardEntry, LeagueUser, UserProfileStats, WeeklyMatchup } from './types';
import {
  fetchLeagueUsers,
  fetchNflState,
  fetchWeeklyMatchups,
} from './lib/sleeper';
import {
  clearAuthUser,
  fetchLeaderboard,
  fetchWeeklyChampions,
  fetchProfileStats,
  getSavedAuthUser,
  type WeeklyChampion,
} from './lib/store';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('picks');
  const [currentUser, setCurrentUser] = useState<LeagueUser | null>(null);
  const [users, setUsers] = useState<LeagueUser[]>([]);
  const [currentNflWeek, setCurrentNflWeek] = useState<number>(3);
  const [selectedWeek, setSelectedWeek] = useState<number>(3);
  const [matchups, setMatchups] = useState<WeeklyMatchup[]>([]);
  const [loadingMatchups, setLoadingMatchups] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);

  // Live Supabase Leaderboard State
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyChampions, setWeeklyChampions] = useState<WeeklyChampion[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);

  // Live Supabase Profile Stats State
  const [targetStats, setTargetStats] = useState<UserProfileStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Initialize Auth & League Users
  useEffect(() => {
    const saved = getSavedAuthUser();
    if (saved) setCurrentUser(saved);

    async function initLeague() {
      try {
        const state = await fetchNflState();
        if (state.week) {
          setCurrentNflWeek(state.week);
          setSelectedWeek(state.week);
        }
      } catch (e) {
        console.warn('Could not fetch NFL state, using week 3 default', e);
      }

      try {
        const leagueUsers = await fetchLeagueUsers();
        setUsers(leagueUsers);

        // Auto-sync: if team name or avatar changed on Sleeper, update session
        const saved = getSavedAuthUser();
        if (saved) {
          const fresh = leagueUsers.find((u) => u.userId === saved.userId);
          if (
            fresh &&
            (fresh.teamName !== saved.teamName ||
              fresh.avatarUrl !== saved.avatarUrl ||
              fresh.displayName !== saved.displayName)
          ) {
            setCurrentUser(fresh);
            localStorage.setItem('last_chance_pickem_active_user', JSON.stringify(fresh));
          }
        }
      } catch (e) {
        console.error('Could not fetch league users', e);
      } finally {
        setUsersLoading(false);
      }
    }

    initLeague();
  }, []);

  // Fetch Matchups when selectedWeek or currentNflWeek changes
  useEffect(() => {
    let isCancelled = false;

    async function loadMatchups() {
      setLoadingMatchups(true);
      try {
        const data = await fetchWeeklyMatchups(selectedWeek, currentNflWeek);
        if (!isCancelled) setMatchups(data);
      } catch (e) {
        console.error('Error fetching weekly matchups', e);
        if (!isCancelled) setMatchups([]);
      } finally {
        if (!isCancelled) setLoadingMatchups(false);
      }
    }

    loadMatchups();
    return () => { isCancelled = true; };
  }, [selectedWeek, currentNflWeek]);

  // Load live leaderboard whenever users load or when viewing leaderboard
  useEffect(() => {
    if (users.length === 0) return;
    let isCancelled = false;

    async function loadBoard() {
      setLoadingLeaderboard(true);
      try {
        const [board, champs] = await Promise.all([
          fetchLeaderboard(users, currentUser?.userId),
          fetchWeeklyChampions(users),
        ]);
        if (!isCancelled) {
          setLeaderboardEntries(board);
          setWeeklyChampions(champs);
        }
      } catch (e) {
        console.error('Error fetching leaderboard', e);
      } finally {
        if (!isCancelled) setLoadingLeaderboard(false);
      }
    }

    loadBoard();
    return () => { isCancelled = true; };
  }, [users, currentUser, activeTab]);

  // Profile target determination
  const targetUser =
    users.find((u) => u.userId === viewingUserId) ||
    currentUser ||
    (users.length > 0 ? users[0] : null);

  const targetRank = targetUser
    ? (leaderboardEntries.find((e) => e.userId === targetUser.userId)?.rank ?? 1)
    : 1;

  // Load live profile stats whenever targetUser or targetRank changes
  useEffect(() => {
    if (!targetUser || users.length === 0) {
      setTargetStats(null);
      return;
    }
    let isCancelled = false;

    async function loadStats() {
      setLoadingProfile(true);
      try {
        const stats = await fetchProfileStats(targetUser!, targetRank, users);
        if (!isCancelled) setTargetStats(stats);
      } catch (e) {
        console.error('Error fetching profile stats', e);
      } finally {
        if (!isCancelled) setLoadingProfile(false);
      }
    }

    loadStats();
    return () => { isCancelled = true; };
  }, [targetUser, targetRank, users, activeTab]);

  const handleLogout = () => {
    clearAuthUser();
    setCurrentUser(null);
    setViewingUserId(null);
    setActiveTab('picks');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F2F2E8] flex flex-col selection:bg-[#6A85FA] selection:text-white">
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onGoToProfile={() => {
          if (currentUser) {
            setViewingUserId(currentUser.userId);
            setActiveTab('profile');
          }
        }}
      />

      <main className="flex-1">
        {activeTab === 'picks' && (
          <PicksView
            currentUser={currentUser}
            currentNflWeek={currentNflWeek}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            matchups={matchups}
            loadingMatchups={loadingMatchups}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboardEntries}
            currentUser={currentUser}
            loading={loadingLeaderboard || usersLoading}
            weeklyChampions={weeklyChampions}
            onSelectUser={(uid) => {
              setViewingUserId(uid);
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'profile' && (
          <>
            {usersLoading || (loadingProfile && !targetStats) ? (
              <div className="flex items-center justify-center h-60 text-[#9AA0A6] text-sm">
                Loading profile…
              </div>
            ) : targetUser && targetStats ? (
              <ProfileView
                user={targetUser}
                stats={targetStats}
                isOwnProfile={Boolean(currentUser && currentUser.userId === targetUser.userId)}
                onLogout={handleLogout}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-60 gap-4 text-[#9AA0A6] text-sm">
                <p>Claim your team to see your profile.</p>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#6A85FA] text-white text-xs font-bold cursor-pointer"
                >
                  Claim Team
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <BlobNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'profile' && currentUser) {
            setViewingUserId(currentUser.userId);
          }
          setActiveTab(tab);
        }}
      />

      <PinAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        users={users}
        onSuccess={(user) => {
          setCurrentUser(user);
          setViewingUserId(user.userId);
        }}
      />
    </div>
  );
}

export default App;
