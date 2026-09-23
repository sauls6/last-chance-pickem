import React from 'react';
import type { LeagueUser, UserProfileStats } from '../types';
import { Award, Heart, LogOut, Target, TrendingUp } from 'lucide-react';

interface ProfileViewProps {
  user: LeagueUser;
  stats: UserProfileStats;
  isOwnProfile: boolean;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  stats,
  isOwnProfile,
  onLogout,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28">
      {/* Profile Hero Card */}
      <div className="relative p-6 rounded-3xl bg-[#0E1013] border border-[#1C1F26] text-center mb-6 overflow-hidden">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#6A85FA]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Big Avatar */}
        <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden border-2 border-[#6A85FA] shadow-[0_0_20px_rgba(106,133,250,0.4)] bg-[#050505]">
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`;
            }}
          />
        </div>

        <h2 className="font-display text-3xl text-[#F2F2E8] leading-tight">
          {user.displayName}
        </h2>
        <p className="text-sm font-semibold text-[#6A85FA] mt-0.5">
          {user.teamName}
        </p>
        <p className="text-xs text-[#9AA0A6] mt-1 font-mono">
          Rank #{stats.rank} in Last Chance Fantasy
        </p>

        {isOwnProfile && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1F26] hover:bg-[#2A2F3D] text-[#9AA0A6] hover:text-[#F2F2E8] text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Switch Team / Sign Out
            </button>
          </div>
        )}
      </div>

      {/* 4-Stat Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between text-xs text-[#9AA0A6] mb-1">
            <span>Accuracy</span>
            <Target className="w-4 h-4 text-[#6A85FA]" />
          </div>
          <span className="font-display text-3xl text-[#F2F2E8]">
            {stats.winPct.toFixed(1)}%
          </span>
          <span className="block text-[11px] text-[#64748B] mt-0.5">
            {stats.totalCorrect} / {stats.totalPicks} correct
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between text-xs text-[#9AA0A6] mb-1">
            <span>Current Streak</span>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <span className="font-display text-3xl text-[#F2F2E8]">
            {stats.currentStreak}
          </span>
          <span className="block text-[11px] text-[#64748B] mt-0.5">
            Active streak
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between text-xs text-[#9AA0A6] mb-1">
            <span>Best Week</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="font-display text-2xl text-[#F2F2E8]">
            {stats.bestWeek}
          </span>
          <span className="block text-[11px] text-[#64748B] mt-0.5">
            High-water mark
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between text-xs text-[#9AA0A6] mb-1">
            <span>Homer Index</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <span className="font-display text-2xl text-[#F2F2E8]">
            {stats.homerRate.pickedOwn} / {stats.homerRate.totalWeeks}
          </span>
          <span className="block text-[11px] text-[#64748B] mt-0.5">
            {stats.homerRate.winRatePct}% own win rate
          </span>
        </div>
      </div>

      {/* Weekly History Recap */}
      <div className="p-5 rounded-3xl bg-[#0E1013] border border-[#1C1F26]">
        <h3 className="font-display text-xl text-[#F2F2E8] tracking-wide mb-4">
          Past Week Results
        </h3>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-[#111317] border border-[#1C1F26] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-[#9AA0A6]">W1</span>
              <div>
                <h5 className="font-bold text-sm text-[#F2F2E8]">Week 1 Slate</h5>
                <p className="text-xs text-[#9AA0A6]">2 correct / 4 missed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl text-[#9AA0A6]">2-4</span>
              <span className="text-xs text-rose-400 font-bold">33%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#111317] border border-[#1C1F26] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-[#6A85FA]">W2</span>
              <div>
                <h5 className="font-bold text-sm text-[#F2F2E8]">Week 2 Slate</h5>
                <p className="text-xs text-[#9AA0A6]">3 correct / 3 missed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl text-[#6A85FA]">3-3</span>
              <span className="text-xs text-[#6A85FA] font-bold">50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
