import { useState, useEffect } from 'react';
import { BlobNav, type ActiveTab } from './components/BlobNav';
import { Header } from './components/Header';
import { PicksView } from './components/PicksView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView, fireGoldConfetti } from './components/ProfileView';
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
  const [showPerfectWeekCelebration, setShowPerfectWeekCelebration] = useState<boolean>(false);

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
        if (!isCancelled) {
          setTargetStats(stats);
          if (
            currentUser &&
            targetUser!.userId === currentUser.userId &&
            stats.badges.some((b) => b.id === 'perfect_week' && b.earned)
          ) {
            const seenKey = `last_chance_pickem_perfect_week_celebrated_${currentUser.userId}`;
            if (!localStorage.getItem(seenKey)) {
              localStorage.setItem(seenKey, '1');
              setShowPerfectWeekCelebration(true);
              fireGoldConfetti();
              setTimeout(() => fireGoldConfetti(), 700);
            }
          }
        }
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

      {showPerfectWeekCelebration && currentUser && (
        <div className="w-full max-w-xl mx-auto px-4 pt-3">
          <div className="glow-gold p-4 rounded-2xl bg-gradient-to-r from-[#241C06] via-[#1A1405] to-[#241C06] border border-amber-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <h4 className="font-display text-lg text-amber-300 tracking-wide leading-tight">
                  Perfect Week Unlocked (6-0)!
                </h4>
                <p className="text-xs text-amber-100/80">
                  You called all 6 matchups right and earned the Golden Crown Jewel badge!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setViewingUserId(currentUser.userId);
                  setActiveTab('profile');
                  setShowPerfectWeekCelebration(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0E1013] text-xs font-bold cursor-pointer transition-colors"
              >
                View Badge
              </button>
              <button
                onClick={() => setShowPerfectWeekCelebration(false)}
                className="px-2 py-1 text-xs text-amber-200/70 hover:text-amber-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

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
