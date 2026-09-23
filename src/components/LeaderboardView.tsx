import React, { useState } from 'react';
import type { LeaderboardEntry, LeagueUser } from '../types';
import { Crown, Flame, Snowflake } from 'lucide-react';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentUser: LeagueUser | null;
  onSelectUser: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  currentUser,
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
          <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#6A85FA]/10 border border-[#6A85FA]/40 flex items-center justify-center text-[#6A85FA]">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#6A85FA] uppercase tracking-wider">
                  Week 1 Champion
                </span>
                <h4 className="font-bold text-sm text-[#F2F2E8]">
                  Diegocr21 (The Maye-Trix)
                </h4>
                <p className="text-xs text-[#9AA0A6]">5 of 6 correct picks</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-display text-2xl text-[#6A85FA]">5-1</span>
              <span className="block text-[10px] text-[#9AA0A6]">83.3%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#6A85FA]/10 border border-[#6A85FA]/40 flex items-center justify-center text-[#6A85FA]">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#6A85FA] uppercase tracking-wider">
                  Week 2 Champion
                </span>
                <h4 className="font-bold text-sm text-[#F2F2E8]">
                  lsemilio05 (CEEDEE’S NUTS)
                </h4>
                <p className="text-xs text-[#9AA0A6]">5 of 6 correct picks</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-display text-2xl text-[#6A85FA]">5-1</span>
              <span className="block text-[10px] text-[#9AA0A6]">83.3%</span>
            </div>
          </div>
        </div>
      ) : (
        /* Season Table */
        <div className="bg-[#0E1013] border border-[#1C1F26] rounded-2xl overflow-hidden divide-y divide-[#1C1F26]">
          {entries.map((r) => {
            const isUser = currentUser && r.userId === currentUser.userId;
            const isTop3 = r.rank <= 3;
            const isFire = r.streak.includes('🔥');

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
                  {/* Streak badge */}
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#111317] border border-[#1C1F26]">
                    {isFire ? (
                      <Flame className="w-3 h-3 text-orange-400" />
                    ) : (
                      <Snowflake className="w-3 h-3 text-blue-300" />
                    )}
                    {r.streak}
                  </span>

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
