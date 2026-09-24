import React, { useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { LAUNCH_WEEK, isRivalryWeek } from '../lib/rivalries';

interface WeekRailProps {
  currentNflWeek: number;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  maxWeeks?: number;
}

export const WeekRail: React.FC<WeekRailProps> = ({
  currentNflWeek,
  selectedWeek,
  onSelectWeek,
  maxWeeks = 14,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Center active week pill on load
    if (scrollRef.current) {
      const activePill = scrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activePill) {
        activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedWeek]);

  const weeks = Array.from({ length: maxWeeks }, (_, i) => i + 1);

  return (
    <div className="w-full overflow-hidden py-2">
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar px-4 py-1"
      >
        {weeks.map((wk) => {
          const isSelected = wk === selectedWeek;
          const isPreLaunch = wk < LAUNCH_WEEK;
          const isFinal = !isPreLaunch && wk < currentNflWeek;
          const isOpen = wk === currentNflWeek;
          const isFuture = wk > currentNflWeek;
          const hasRivalry = isRivalryWeek(wk);

          return (
            <button
              key={wk}
              data-active={isSelected}
              onClick={() => onSelectWeek(wk)}
              className={`relative flex-shrink-0 flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#151820] border-[#6A85FA] shadow-[0_0_16px_rgba(106,133,250,0.3)]'
                  : isPreLaunch
                  ? 'bg-[#0A0C0F] border-[#16181F] opacity-60 hover:opacity-100 hover:border-[#2C313C]'
                  : 'bg-[#0E1013] border-[#1C1F26] hover:border-[#2C313C] hover:bg-[#12151A]'
              }`}
            >
              {hasRivalry && (
                <span className="absolute -top-1.5 -right-1 text-[11px]" title="Rivalries Week">
                  ⚔️
                </span>
              )}
              <span className="text-[11px] font-semibold text-[#9AA0A6] uppercase tracking-wider">
                Week
              </span>
              <span
                className={`font-display text-2xl leading-none my-0.5 ${
                  isSelected ? 'text-[#6A85FA]' : 'text-[#F2F2E8]'
                }`}
              >
                {wk}
              </span>
              <span className="text-[10px] font-bold tracking-tight">
                {isPreLaunch && <span className="text-[#64748B]">—</span>}
                {isFinal && <span className="text-[#9AA0A6]">Final</span>}
                {isOpen && <span className="text-[#6A85FA] animate-pulse">Open</span>}
                {isFuture && (
                  <span className="text-[#64748B] flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Lock
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

