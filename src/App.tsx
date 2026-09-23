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
      } catch (e) {
        console.error('Could not fetch league users', e);
      }
    }

    initLeague();
  }, []);

  // Fetch Matchups when selectedWeek changes
  useEffect(() => {
    let isCancelled = false;
    async function loadMatchups() {
      setLoadingMatchups(true);
      try {
        const data = await fetchWeeklyMatchups(selectedWeek, currentNflWeek);
        if (!isCancelled) {
          setMatchups(data);
        }
      } catch (e) {
        console.error('Error fetching weekly matchups', e);
      } finally {
        if (!isCancelled) {
          setLoadingMatchups(false);
        }
      }
    }

    loadMatchups();
    return () => {
      isCancelled = true;
    };
  }, [selectedWeek, currentNflWeek]);

  const handleLogout = () => {
    clearAuthUser();
    setCurrentUser(null);
    setActiveTab('picks');
  };

  const leaderboardEntries: LeaderboardEntry[] = computeLeaderboard(
    users,
    currentUser?.userId
  );

  // Selected Profile for Profile Tab
  const targetUser =
    users.find((u) => u.userId === viewingUserId) ||
    currentUser ||
    (users.length > 0 ? users[0] : null);

  const targetRank = targetUser
    ? leaderboardEntries.find((e) => e.userId === targetUser.userId)?.rank || 1
    : 1;

  const targetStats = targetUser
    ? computeProfileStats(targetUser, targetRank)
    : null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#F2F2E8] flex flex-col selection:bg-[#6A85FA] selection:text-white">
      {/* Top Bar */}
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

      {/* Main Tab Views */}
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
            onSelectUser={(uid) => {
              setViewingUserId(uid);
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'profile' && targetUser && targetStats && (
          <ProfileView
            user={targetUser}
            stats={targetStats}
            isOwnProfile={Boolean(currentUser && currentUser.userId === targetUser.userId)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Floating Spring Pill Nav */}
      <BlobNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'profile' && currentUser) {
            setViewingUserId(currentUser.userId);
          }
          setActiveTab(tab);
        }}
      />

      {/* Claim Team / PIN Auth Modal */}
      <PinAuthModal
        users={users}
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setViewingUserId(user.userId);
        }}
      />
    </div>
  );
}

export default App;
