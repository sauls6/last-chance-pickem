import React, { useState } from 'react';
import type { LeaderboardEntry, LeagueUser } from '../types';
import type { WeeklyChampion } from '../lib/store';
import { Crown, Trophy } from 'lucide-react';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentUser: LeagueUser | null;
  loading?: boolean;
  weeklyChampions?: WeeklyChampion[];
  onSelectUser: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  currentUser,
  loading = false,
  weeklyChampions = [],
  onSelectUser,
}) => {
  const [filterMode, setFilterMode] = useState<'season' | 'weekly'>('season');

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28">
      {/* Title */}
      <div className="mb-4 text-center">
        <h1 className="font-display text-4xl md:text-5xl text-[#F2F2E8] tracking-wider mb-1">
          Leaderboard
        </h1>
        <p className="text-xs text-[#9AA0A6]">
          Last Chance Fantasy Pick'em Season Standings
        </p>
      </div>

      {/* View Toggle Tabs */}
      <div className="flex p-1 bg-[#0E1013] border border-[#1C1F26] rounded-xl mb-5">
        <button
          onClick={() => setFilterMode('season')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterMode === 'season'
              ? 'bg-[#1C2230] text-[#6A85FA] border border-[#6A85FA]/30 shadow-sm'
              : 'text-[#9AA0A6] hover:text-[#F2F2E8]'
          }`}
        >
          Season Standings
        </button>
        <button
          onClick={() => setFilterMode('weekly')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterMode === 'weekly'
              ? 'bg-[#1C2230] text-[#6A85FA] border border-[#6A85FA]/30 shadow-sm'
              : 'text-[#9AA0A6] hover:text-[#F2F2E8]'
          }`}
        >
          Weekly Champions
        </button>
      </div>

      {filterMode === 'weekly' ? (
        /* Weekly Winners Cards */
        <div className="space-y-3">
          {weeklyChampions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#0E1013] border border-[#1C1F26] text-center">
              <div className="w-12 h-12 rounded-full bg-[#161922] border border-[#242A38] flex items-center justify-center mx-auto mb-3 text-xl">
                👑
              </div>
              <h4 className="font-display text-lg text-[#F2F2E8] mb-1">
                No Weekly Champions Yet
              </h4>
              <p className="text-xs text-[#9AA0A6] max-w-xs mx-auto leading-relaxed">
                The Week 3 champion will be crowned on Tuesday morning once Monday Night Football finishes!
              </p>
            </div>
          ) : (
            weeklyChampions.map((c) => (
              <div
                key={c.week}
                onClick={() => onSelectUser(c.winnerUser.userId)}
                className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26] hover:border-[#6A85FA]/40 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6A85FA]/10 border border-[#6A85FA]/40 flex items-center justify-center text-[#6A85FA]">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#6A85FA] uppercase tracking-wider">
                      Week {c.week} Champion
                    </span>
                    <h4 className="font-bold text-sm text-[#F2F2E8]">
                      {c.winnerUser.displayName} ({c.winnerUser.teamName})
                    </h4>
                    <p className="text-xs text-[#9AA0A6]">
                      {c.correct} of {c.total} correct picks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl text-[#6A85FA]">
                    {c.correct}-{c.total - c.correct}
                  </span>
                  <span className="block text-[10px] text-[#9AA0A6]">
                    {c.winPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Season Table */
        <div className="bg-[#0E1013] border border-[#1C1F26] rounded-2xl overflow-hidden divide-y divide-[#1C1F26]">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[36px_1fr_auto] gap-3 items-center p-3">
                  <div className="w-8 h-6 bg-[#1C1F26] rounded animate-pulse" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1C1F26] animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3 bg-[#1C1F26] rounded animate-pulse" />
                      <div className="w-16 h-2.5 bg-[#1C1F26] rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-14 h-6 bg-[#1C1F26] rounded animate-pulse" />
                </div>
              ))
            : entries.map((r) => {
            const isUser = currentUser && r.userId === currentUser.userId;
            const isTop3 = r.rank <= 3;

            return (
              <div
                key={r.userId}
                onClick={() => onSelectUser(r.userId)}
                className={`grid grid-cols-[36px_1fr_auto] gap-3 items-center p-3 md:p-3.5 transition-colors cursor-pointer hover:bg-[#151820] ${
                  isUser ? 'bg-[#141824] border-l-4 border-l-[#6A85FA]' : ''
                }`}
              >
                {/* Rank */}
                <div className="text-center">
                  <span
                    className={`font-display text-xl leading-none ${
                      isTop3 ? 'text-[#6A85FA]' : 'text-[#9AA0A6]'
                    }`}
                  >
                    {r.rank === 1 ? '👑' : `#${r.rank}`}
                  </span>
                </div>

                {/* Member Avatar & Team Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[#1C1F26] flex-shrink-0 bg-[#050505]">
                    <img
                      src={r.avatarUrl}
                      alt={r.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${r.displayName}`;
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-[#F2F2E8] truncate leading-tight">
                        {r.displayName}
                      </h4>
                      {isUser && (
                        <span className="text-[10px] bg-[#6A85FA]/20 text-[#6A85FA] px-1.5 py-0.2 rounded font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9AA0A6] truncate">
                      {r.teamName}
                    </p>
                  </div>
                </div>

                {/* Record & Stats */}
                <div className="text-right flex items-center gap-3">
                  {/* Weekly Wins / Trophies badge */}
                  {r.weeklyWins > 0 ? (
                    <span
                      title={`${r.weeklyWins} Weekly 1st Place ${r.weeklyWins === 1 ? 'Finish' : 'Finishes'}`}
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    >
                      <Trophy className="w-3 h-3 text-amber-400" />
                      {r.weeklyWins}W
                    </span>
                  ) : (
                    <span
                      title="0 Weekly 1st Place Finishes"
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#111317] text-[#64748B] border border-[#1C1F26]"
                    >
                      0W
                    </span>
                  )}

                  <div>
                    <span className="font-display text-xl text-[#F2F2E8] leading-none block">
                      {r.totalCorrect}-{r.totalPicks - r.totalCorrect}
                    </span>
                    <span className="text-[10px] text-[#9AA0A6] font-mono">
                      {r.winPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
