import React, { useState, useEffect, useCallback } from 'react';
import type { LeagueUser, WeeklyMatchup } from '../types';
import { MatchupCard } from './MatchupCard';
import { WeekRail } from './WeekRail';
import { getGameSplits, getPicksForWeek, getTiebreaker, savePicksForWeek, saveTiebreaker } from '../lib/store';
import { Clock, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PicksViewProps {
  currentUser: LeagueUser | null;
  currentNflWeek: number;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  matchups: WeeklyMatchup[];
  loadingMatchups: boolean;
  onOpenAuth: () => void;
}

export const PicksView: React.FC<PicksViewProps> = ({
  currentUser,
  currentNflWeek,
  selectedWeek,
  onSelectWeek,
  matchups,
  loadingMatchups,
  onOpenAuth,
}) => {
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [tiebreaker, setTiebreakerState] = useState<string>('');
  const [splits, setSplits] = useState<Record<string, Record<number, { count: number; pct: number }>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

  // Stable game IDs string to use as dep (avoids array ref instability)
  const matchupIds = matchups.map((m) => m.id).join(',');

  const loadData = useCallback(async () => {
    if (!currentUser || matchups.length === 0) return;
    const gameIds = matchups.map((m) => m.id);
    const [savedPicks, tb, sp] = await Promise.all([
      getPicksForWeek(currentUser.userId, selectedWeek, gameIds),
      getTiebreaker(currentUser.userId, selectedWeek),
      getGameSplits(selectedWeek, matchups),
    ]);
    setPicks(savedPicks);
    setTiebreakerState(tb !== null ? tb.toString() : '');
    setSplits(sp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.userId, selectedWeek, matchupIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset picks display when switching weeks
  useEffect(() => {
    setPicks({});
    setTiebreakerState('');
  }, [selectedWeek]);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePick = (gameId: string, rosterId: number) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setPicks((prev) => ({ ...prev, [gameId]: rosterId }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSaving(true);
    try {
      await savePicksForWeek(currentUser.userId, selectedWeek, picks, matchups);
      if (tiebreaker.trim().length > 0) {
        const tbNum = parseFloat(tiebreaker);
        if (!isNaN(tbNum) && tbNum > 0) {
          await saveTiebreaker(currentUser.userId, selectedWeek, tbNum);
        }
      }

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.75 },
        colors: ['#6A85FA', '#F2F2E8', '#4ADE80'],
      });

      showToast('✓ All picks saved!');
    } catch (e) {
      console.error(e);
      showToast('Error saving picks — try again', true);
    } finally {
      setIsSaving(false);
    }
  };

  const totalMatchups = matchups.length;
  const pickedCount = Object.keys(picks).length;
  const isWeekOpen = selectedWeek === currentNflWeek;
  // The current week is locked once Thursday kickoff has passed (matchups[0].isLocked reflects this)
  const isCurrentWeekLocked = matchups.length > 0 && matchups[0].isLocked;

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-32">
      {/* Week Title */}
      <div className="mb-4 text-center">
        <h1 className="font-display text-4xl md:text-5xl text-[#F2F2E8] tracking-wider mb-1">
          Week {selectedWeek} Picks
        </h1>
        <p className="text-xs text-[#9AA0A6] max-w-md mx-auto">
          Predict the winner of all 6 fantasy matchups in the league.
        </p>
      </div>

      {/* Lock Notice Banner */}
      <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-[#0E1013] border border-[#1C1F26] text-xs">
        <div className="flex items-center gap-2 text-[#9AA0A6]">
          <Clock className="w-4 h-4 text-[#6A85FA]" />
          <span>
            {selectedWeek < currentNflWeek
              ? 'This week is final'
              : isCurrentWeekLocked
              ? '🔒 Picks are locked — Thursday has kicked off'
              : isWeekOpen
              ? 'Picks lock Thursday at 8:15 PM ET'
              : 'Upcoming slate — not yet open'}
          </span>
        </div>
        {currentUser && (
          <span className="font-semibold text-[#6A85FA] bg-[#6A85FA]/10 px-2.5 py-1 rounded-full border border-[#6A85FA]/30">
            {pickedCount} / {totalMatchups}
          </span>
        )}
      </div>

      {/* Horizontal Week Rail */}
      <WeekRail
        currentNflWeek={currentNflWeek}
        selectedWeek={selectedWeek}
        onSelectWeek={onSelectWeek}
      />

      {/* Not Signed In Banner */}
      {!currentUser && (
        <div className="my-4 p-4 rounded-xl bg-[#121622] border border-[#6A85FA]/40 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-[#F2F2E8] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#6A85FA]" /> Select Your Team
            </h4>
            <p className="text-xs text-[#9AA0A6] mt-0.5">
              Claim your Sleeper team with a 4-digit PIN to save picks.
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-lg bg-[#6A85FA] text-white text-xs font-bold shadow-[0_0_12px_rgba(106,133,250,0.4)] hover:brightness-110 cursor-pointer"
          >
            Claim Team
          </button>
        </div>
      )}

      {/* Matchups List */}
      <div className="mt-4">
        {loadingMatchups ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-36 bg-[#0E1013] border border-[#1C1F26] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : matchups.length === 0 ? (
          <div className="text-center py-12 text-[#9AA0A6] text-sm">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No matchups found for this week.
          </div>
        ) : (
          matchups.map((m) => {
            const split = splits[m.id];
            return (
              <MatchupCard
                key={m.id}
                matchup={m}
                selectedRosterId={picks[m.id]}
                onPickTeam={(rid) => handlePick(m.id, rid)}
                splitA={split ? split[m.teamA.rosterId] : undefined}
                splitB={split ? split[m.teamB.rosterId] : undefined}
                disabled={isCurrentWeekLocked || !isWeekOpen}
              />
            );
          })
        )}
      </div>

      {/* Tiebreaker: only show when week is open AND not yet locked */}
      {isWeekOpen && !isCurrentWeekLocked && matchups.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-lg text-[#F2F2E8] tracking-wide">
              Tiebreaker: Player Ceiling
            </h3>
            <span className="text-[10px] font-bold text-[#6A85FA] uppercase tracking-wider bg-[#6A85FA]/10 px-2 py-0.5 rounded-full border border-[#6A85FA]/30">
              League High
            </span>
          </div>
          <p className="text-xs text-[#9AA0A6] mb-3">
            Guess the points scored by this week's single highest-scoring player (any roster, starters or bench).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="e.g. 38.5"
              min="0"
              max="99"
              step="0.1"
              value={tiebreaker}
              onChange={(e) => setTiebreakerState(e.target.value)}
              className="flex-1 bg-[#151820] border border-[#1C1F26] focus:border-[#6A85FA] rounded-xl px-3.5 py-2 text-sm text-[#F2F2E8] outline-none font-mono"
            />
            <span className="text-xs font-semibold text-[#9AA0A6] whitespace-nowrap">Top Pts</span>
          </div>
        </div>
      )}

      {/* Save Bar — only when open and unlocked */}
      {isWeekOpen && !isCurrentWeekLocked && matchups.length > 0 && (
        <div className="sticky bottom-20 z-40 mt-6 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || pickedCount === 0}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#6A85FA] hover:bg-[#5872ea] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-[0_0_24px_rgba(106,133,250,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            {isSaving ? 'Saving…' : `Save Picks (${pickedCount}/${totalMatchups})`}
          </button>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-semibold text-[#F2F2E8] shadow-[0_8px_24px_rgba(0,0,0,0.8)] flex items-center gap-2 whitespace-nowrap ${
            toastIsError
              ? 'bg-[#2A1010] border border-[#E5484D]'
              : 'bg-[#1C2230] border border-[#6A85FA]'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${toastIsError ? 'text-[#E5484D]' : 'text-[#6A85FA]'}`} />
          {toastMessage}
        </div>
      )}
    </div>
  );
};
