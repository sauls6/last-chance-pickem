import React from 'react';
import type { LeagueUser } from '../types';
import { Sparkles, Trophy } from 'lucide-react';

interface HeaderProps {
  currentUser: LeagueUser | null;
  onOpenAuth: () => void;
  onGoToProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuth,
  onGoToProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#050505]/80 backdrop-blur-xl border-b border-[#1C1F26]">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* League Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#141824] border border-[#6A85FA]/40 flex items-center justify-center text-[#6A85FA] shadow-[0_0_10px_rgba(106,133,250,0.3)]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-base tracking-wider text-[#F2F2E8] leading-none">
              LAST CHANCE PICK'EM
            </h1>
            <span className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase">
              12-Team Sleeper League
            </span>
          </div>
        </div>

        {/* User Pill / Login */}
        <div>
          {currentUser ? (
            <button
              onClick={onGoToProfile}
              className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-[#0E1013] border border-[#1C1F26] hover:border-[#6A85FA]/50 transition-colors cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden border border-[#6A85FA]">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.displayName}`;
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-[#F2F2E8] max-w-[90px] truncate">
                {currentUser.displayName}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#6A85FA] hover:bg-[#5872ea] text-white text-xs font-bold shadow-[0_0_12px_rgba(106,133,250,0.4)] transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Claim Team
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
