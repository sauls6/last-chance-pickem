import React from 'react';
import type { WeeklyMatchup } from '../types';
import { Check } from 'lucide-react';

interface MatchupCardProps {
  matchup: WeeklyMatchup;
  selectedRosterId?: number;
  onPickTeam: (rosterId: number) => void;
  splitA?: { count: number; pct: number };
  splitB?: { count: number; pct: number };
  disabled?: boolean;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  selectedRosterId,
  onPickTeam,
  splitA,
  splitB,
  disabled = false,
}) => {
  const isFinal = matchup.status === 'final';
  const isLive = matchup.status === 'in_progress';
  const isPickA = selectedRosterId === matchup.teamA.rosterId;
  const isPickB = selectedRosterId === matchup.teamB.rosterId;

  return (
    <div className="relative mb-4 bg-[#0E1013] border border-[#1C1F26] rounded-2xl p-3 md:p-4 transition-all duration-200">
      {/* Matchup Header / Status */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1C1F26] text-xs">
        <span className="font-semibold text-[#9AA0A6]">
          Matchup {matchup.matchupId}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 font-bold text-[#E5484D] px-2 py-0.5 rounded-full bg-[#E5484D]/10 border border-[#E5484D]/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]" />
              LIVE
            </span>
          )}
          {isFinal && (
            <span className="font-semibold text-[#9AA0A6] px-2 py-0.5 rounded-full bg-[#1C1F26]">
              Final
            </span>
          )}
          {!isLive && !isFinal && (
            <span className="text-[#9AA0A6]">
              {matchup.isLocked ? '🔒 Locked' : 'Thursday 8:15 PM ET'}
            </span>
          )}
        </div>
      </div>

      {/* Teams Grid: Left Team | VS | Right Team */}
      <div className="grid grid-cols-[1fr_48px_1fr] gap-2 items-stretch">
        {/* Team A */}
        <button
          type="button"
          disabled={disabled || matchup.isLocked}
          onClick={() => onPickTeam(matchup.teamA.rosterId)}
          className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
            isPickA
              ? 'glow-card bg-[#141824]'
              : 'bg-[#111317] border-[#1C1F26] hover:border-[#2C3240] hover:bg-[#151820]'
          } ${disabled || matchup.isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
        >
          {/* Selected Badge */}
          {isPickA && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6A85FA] flex items-center justify-center text-white shadow-[0_0_8px_#6A85FA]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}

          {/* Avatar & Team Info */}
          <div className="flex flex-col items-center w-full">
            <div className="relative w-12 h-12 mb-2 rounded-full overflow-hidden border-2 border-[#1C1F26] group-hover:border-[#6A85FA]/50 transition-colors bg-[#050505]">
              <img
                src={matchup.teamA.avatarUrl}
                alt={matchup.teamA.teamName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${matchup.teamA.displayName}`;
                }}
              />
            </div>
            <h4 className="font-bold text-sm text-[#F2F2E8] line-clamp-1 leading-tight mb-0.5">
              {matchup.teamA.teamName}
            </h4>
            <p className="text-[11px] text-[#9AA0A6] line-clamp-1 font-medium">
              {matchup.teamA.displayName}
            </p>
            <span className="text-[10px] text-[#64748B] font-mono mt-0.5">
              {matchup.teamA.record}
            </span>
          </div>

          {/* Points / Score Display */}
          {(isFinal || isLive) && (
            <div className="mt-2 pt-2 border-t border-[#1C1F26] w-full">
              <span
                className={`font-display text-xl ${
                  matchup.winnerRosterId === matchup.teamA.rosterId
                    ? 'text-[#6A85FA]'
                    : 'text-[#9AA0A6]'
                }`}
              >
                {matchup.teamA.points.toFixed(1)}
              </span>
            </div>
          )}
        </button>

        {/* Center VS Column */}
        <div className="flex flex-col items-center justify-center">
          <span className="font-display text-sm text-[#9AA0A6] tracking-widest">
            VS
          </span>
        </div>

        {/* Team B */}
        <button
          type="button"
          disabled={disabled || matchup.isLocked}
          onClick={() => onPickTeam(matchup.teamB.rosterId)}
          className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
            isPickB
              ? 'glow-card bg-[#141824]'
              : 'bg-[#111317] border-[#1C1F26] hover:border-[#2C3240] hover:bg-[#151820]'
          } ${disabled || matchup.isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
        >
          {/* Selected Badge */}
          {isPickB && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6A85FA] flex items-center justify-center text-white shadow-[0_0_8px_#6A85FA]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}

          {/* Avatar & Team Info */}
          <div className="flex flex-col items-center w-full">
            <div className="relative w-12 h-12 mb-2 rounded-full overflow-hidden border-2 border-[#1C1F26] group-hover:border-[#6A85FA]/50 transition-colors bg-[#050505]">
              <img
                src={matchup.teamB.avatarUrl}
                alt={matchup.teamB.teamName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${matchup.teamB.displayName}`;
                }}
              />
            </div>
            <h4 className="font-bold text-sm text-[#F2F2E8] line-clamp-1 leading-tight mb-0.5">
              {matchup.teamB.teamName}
            </h4>
            <p className="text-[11px] text-[#9AA0A6] line-clamp-1 font-medium">
              {matchup.teamB.displayName}
            </p>
            <span className="text-[10px] text-[#64748B] font-mono mt-0.5">
              {matchup.teamB.record}
            </span>
          </div>

          {/* Points / Score Display */}
          {(isFinal || isLive) && (
            <div className="mt-2 pt-2 border-t border-[#1C1F26] w-full">
              <span
                className={`font-display text-xl ${
                  matchup.winnerRosterId === matchup.teamB.rosterId
                    ? 'text-[#6A85FA]'
                    : 'text-[#9AA0A6]'
                }`}
              >
                {matchup.teamB.points.toFixed(1)}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Split Distribution Bar (League Consensus) */}
      {splitA && splitB && (
        <div className="mt-3 pt-2.5 border-t border-[#1C1F26]">
          <div className="flex justify-between text-[11px] font-semibold text-[#9AA0A6] mb-1">
            <span>
              {splitA.pct}% ({splitA.count} picks)
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#64748B]">
              League Split
            </span>
            <span>
              {splitB.pct}% ({splitB.count} picks)
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#1C1F26] rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                isPickA ? 'bg-[#6A85FA]' : 'bg-[#3A404F]'
              }`}
              style={{ width: `${splitA.pct}%` }}
            />
            <div
              className={`h-full transition-all duration-500 ${
                isPickB ? 'bg-[#6A85FA]' : 'bg-[#2A2F3D]'
              }`}
              style={{ width: `${splitB.pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
