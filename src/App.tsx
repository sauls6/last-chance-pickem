import { useState, useEffect } from 'react';
import { BlobNav, type ActiveTab } from './components/BlobNav';
import { Header } from './components/Header';
import { PicksView } from './components/PicksView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { PinAuthModal } from './components/PinAuthModal';
import type { LeaderboardEntry, LeagueUser, WeeklyMatchup } from './types';
import {
  fetchLeagueUsers,
  fetchNflState,
  fetchWeeklyMatchups,
} from './lib/sleeper';
import {
  clearAuthUser,
  computeLeaderboard,
  computeProfileStats,
  getSavedAuthUser,
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
            // Re-persist without changing PIN
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

  const handleLogout = () => {
    clearAuthUser();
    setCurrentUser(null);
    setViewingUserId(null);
    setActiveTab('picks');
  };

  const leaderboardEntries: LeaderboardEntry[] = computeLeaderboard(
    users,
    currentUser?.userId
  );

  // Profile target: explicit viewingUserId → currentUser → first user in list
  // If users haven't loaded yet, don't show blank profile
  const targetUser =
    users.find((u) => u.userId === viewingUserId) ||
    currentUser ||
    (users.length > 0 ? users[0] : null);

  const targetRank = targetUser
    ? (leaderboardEntries.find((e) => e.userId === targetUser.userId)?.rank ?? 1)
    : 1;

  const targetStats = targetUser ? computeProfileStats(targetUser, targetRank) : null;

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
            loading={usersLoading}
            onSelectUser={(uid) => {
              setViewingUserId(uid);
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'profile' && (
          <>
            {usersLoading ? (
              <div className="flex items-center justify-center h-60 text-[#9AA0A6] text-sm">
                Loading…
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
        users={users}
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          // saveAuthUser is called inside PinAuthModal; just sync state here
          setCurrentUser(user);
          setViewingUserId(user.userId);
          setIsAuthOpen(false);
        }}
      />
    </div>
  );
}

export default App;
