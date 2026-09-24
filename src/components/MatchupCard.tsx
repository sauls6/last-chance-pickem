import React, { useState } from 'react';
import type { WeeklyMatchup } from '../types';
import { Check, ChevronDown, ExternalLink } from 'lucide-react';

const SLEEPER_LEAGUE_ID = '1390903684027670528';

interface MatchupCardProps {
  matchup: WeeklyMatchup;
  selectedRosterId?: number;
  onPickTeam: (rosterId: number) => void;
  splitA?: { count: number; pct: number };
  splitB?: { count: number; pct: number };
  disabled?: boolean;
  currentUserRosterId?: number;
}

function StatCompare({
  label,
  valA,
  valB,
}: {
  label: string;
  valA: string;
  valB: string;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#1C1F26] last:border-0">
      <span className="font-display text-sm text-[#F2F2E8] w-16 text-right shrink-0">{valA}</span>
      <span className="flex-1 text-center text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
        {label}
      </span>
      <span className="font-display text-sm text-[#F2F2E8] w-16 text-left shrink-0">{valB}</span>
    </div>
  );
}

export const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  selectedRosterId,
  onPickTeam,
  splitA,
  splitB,
  disabled = false,
  currentUserRosterId,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const isFinal = matchup.status === 'final';
  const isLive = matchup.status === 'in_progress';
  const isPickA = selectedRosterId === matchup.teamA.rosterId;
  const isPickB = selectedRosterId === matchup.teamB.rosterId;

  const projA = matchup.teamA.projectedPoints;
  const projB = matchup.teamB.projectedPoints;
  const winProbA = matchup.winProbabilityA;
  const winProbB = matchup.winProbabilityB;

  const isUserMatchup =
    Boolean(currentUserRosterId) &&
    (matchup.teamA.rosterId === currentUserRosterId ||
      matchup.teamB.rosterId === currentUserRosterId);

  const sleeperMatchupUrl = isUserMatchup
    ? `https://sleeper.com/leagues/${SLEEPER_LEAGUE_ID}/matchup`
    : `https://sleeper.com/leagues/${SLEEPER_LEAGUE_ID}/league`;

  return (
    <div className="relative mb-4 bg-[#0E1013] border border-[#1C1F26] rounded-2xl overflow-hidden transition-all duration-200">
      <div className="p-3 md:p-4">
        {/* ── Header / Status ────────────────────────────────── */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1C1F26] text-xs">
          <span className="font-semibold text-[#9AA0A6]">Matchup {matchup.matchupId}</span>
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

        {/* ── Teams Grid ─────────────────────────────────────── */}
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
            {isPickA && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6A85FA] flex items-center justify-center text-white shadow-[0_0_8px_#6A85FA]">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div className="flex flex-col items-center w-full">
              <div className="relative w-12 h-12 mb-2 rounded-full overflow-hidden border-2 border-[#1C1F26] group-hover:border-[#6A85FA]/50 transition-colors bg-[#050505]">
                <img
                  src={matchup.teamA.avatarUrl}
                  alt={matchup.teamA.teamName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(matchup.teamA.displayName)}`;
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

            {/* Score / Projected Points */}
            <div className="mt-2 pt-2 border-t border-[#1C1F26] w-full">
              {(isFinal || isLive) ? (
                <span
                  className={`font-display text-xl ${
                    matchup.winnerRosterId === matchup.teamA.rosterId
                      ? 'text-[#6A85FA]'
                      : 'text-[#9AA0A6]'
                  }`}
                >
                  {matchup.teamA.points.toFixed(1)}
                  {isLive && projA !== undefined && (
                    <span className="text-[11px] text-[#64748B] font-sans font-normal ml-1">
                      / {projA.toFixed(1)}
                    </span>
                  )}
                </span>
              ) : projA !== undefined ? (
                <span className="font-display text-base text-[#9AA0A6]">
                  Proj{' '}
                  <span className="text-[#F2F2E8]">{projA.toFixed(1)}</span>
                </span>
              ) : null}
            </div>
          </button>

          {/* VS */}
          <div className="flex flex-col items-center justify-center">
            <span className="font-display text-sm text-[#9AA0A6] tracking-widest">VS</span>
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
            {isPickB && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6A85FA] flex items-center justify-center text-white shadow-[0_0_8px_#6A85FA]">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div className="flex flex-col items-center w-full">
              <div className="relative w-12 h-12 mb-2 rounded-full overflow-hidden border-2 border-[#1C1F26] group-hover:border-[#6A85FA]/50 transition-colors bg-[#050505]">
                <img
                  src={matchup.teamB.avatarUrl}
                  alt={matchup.teamB.teamName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(matchup.teamB.displayName)}`;
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

            {/* Score / Projected Points */}
            <div className="mt-2 pt-2 border-t border-[#1C1F26] w-full">
              {(isFinal || isLive) ? (
                <span
                  className={`font-display text-xl ${
                    matchup.winnerRosterId === matchup.teamB.rosterId
                      ? 'text-[#6A85FA]'
                      : 'text-[#9AA0A6]'
                  }`}
                >
                  {matchup.teamB.points.toFixed(1)}
                  {isLive && projB !== undefined && (
                    <span className="text-[11px] text-[#64748B] font-sans font-normal ml-1">
                      / {projB.toFixed(1)}
                    </span>
                  )}
                </span>
              ) : projB !== undefined ? (
                <span className="font-display text-base text-[#9AA0A6]">
                  Proj{' '}
                  <span className="text-[#F2F2E8]">{projB.toFixed(1)}</span>
                </span>
              ) : null}
            </div>
          </button>
        </div>

        {/* ── Split Distribution Bar ─────────────────────────── */}
        {splitA && splitB && (
          <div className="mt-3 pt-2.5 border-t border-[#1C1F26]">
            <div className="flex justify-between text-[11px] font-semibold text-[#9AA0A6] mb-1">
              <span>{splitA.pct}% ({splitA.count} picks)</span>
              <span className="text-[10px] uppercase tracking-wider text-[#64748B]">League Split</span>
              <span>{splitB.pct}% ({splitB.count} picks)</span>
            </div>
            <div className="h-1.5 w-full bg-[#1C1F26] rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 ${isPickA ? 'bg-[#6A85FA]' : 'bg-[#3A404F]'}`}
                style={{ width: `${splitA.pct}%` }}
              />
              <div
                className={`h-full transition-all duration-500 ${isPickB ? 'bg-[#6A85FA]' : 'bg-[#2A2F3D]'}`}
                style={{ width: `${splitB.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Footer Bar: Win prob badge + Preview toggle ─────── */}
        {winProbA !== undefined && winProbB !== undefined && (
          <div className="mt-3 pt-2.5 border-t border-[#1C1F26] flex items-center justify-between">
            {/* Win probability favourite badge */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#9AA0A6]">
              <span
                className={`font-bold text-xs ${
                  winProbA > winProbB ? 'text-[#6A85FA]' : 'text-[#9AA0A6]'
                }`}
              >
                {matchup.teamA.displayName} {winProbA}%
              </span>
              <span className="text-[#2A2F3D]">·</span>
              <span
                className={`font-bold text-xs ${
                  winProbB > winProbA ? 'text-[#6A85FA]' : 'text-[#9AA0A6]'
                }`}
              >
                {winProbB}% {matchup.teamB.displayName}
              </span>
            </div>

            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#9AA0A6] hover:text-[#F2F2E8] transition-colors cursor-pointer"
            >
              Matchup preview
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${previewOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        )}
      </div>

      {/* ── Inline Accordion Tray ──────────────────────────────── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          previewOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="px-3 pb-4 pt-1 bg-[#0A0C0F] border-t border-[#1C1F26]">
          {/* Win probability gauge */}
          {winProbA !== undefined && winProbB !== undefined && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className={winProbA >= winProbB ? 'text-[#6A85FA]' : 'text-[#9AA0A6]'}>
                  {winProbA}%
                </span>
                <span className="text-[#64748B] uppercase tracking-wider text-[10px] font-semibold">
                  Win Probability
                </span>
                <span className={winProbB > winProbA ? 'text-[#6A85FA]' : 'text-[#9AA0A6]'}>
                  {winProbB}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#1C1F26] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#6A85FA] transition-all duration-500"
                  style={{ width: `${winProbA}%` }}
                />
                <div
                  className="h-full bg-[#2A2F3D] transition-all duration-500"
                  style={{ width: `${winProbB}%` }}
                />
              </div>
              {matchup.projectedSpread && (
                <p className="text-[10px] text-[#64748B] text-center mt-1">
                  Proj. favourite: <em className="text-[#9AA0A6] not-italic font-semibold">{matchup.projectedSpread}</em>
                </p>
              )}
            </div>
          )}

          {/* Stat comparison grid */}
          <StatCompare
            label="AVG. FPTS"
            valA={matchup.teamA.avgPoints?.toFixed(2) ?? '—'}
            valB={matchup.teamB.avgPoints?.toFixed(2) ?? '—'}
          />
          <StatCompare
            label="Start & Sit Accuracy"
            valA={matchup.teamA.startSitAccuracy !== undefined ? `${matchup.teamA.startSitAccuracy.toFixed(1)}%` : '—'}
            valB={matchup.teamB.startSitAccuracy !== undefined ? `${matchup.teamB.startSitAccuracy.toFixed(1)}%` : '—'}
          />

          {/* Open in Sleeper link */}
          <a
            href={sleeperMatchupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-[#1C1F26] hover:bg-[#2A2F3D] text-[#9AA0A6] hover:text-[#F2F2E8] text-xs font-semibold transition-colors"
          >
            Open in Sleeper
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
