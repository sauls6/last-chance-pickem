import React from 'react';
import type { LeagueUser, UserProfileStats } from '../types';
import { Award, LogOut, Swords, Target, ThumbsUp, Zap } from 'lucide-react';

interface ProfileViewProps {
  user: LeagueUser;
  stats: UserProfileStats;
  isOwnProfile: boolean;
  onLogout: () => void;
}

// Badge SVGs adapted from the reference site's shield geometry & electric blue aesthetic
const BadgeIcon: React.FC<{ id: string; earned: boolean }> = ({ id, earned }) => {
  const strokeColor = earned ? '#6A85FA' : '#4A5060';
  const fillColor = earned ? '#0E1013' : '#0B0D10';

  const renderBadgeContent = () => {
    switch (id) {
      case 'first_down':
        return (
          <>
            <path d="M40 22v34M28 56h24" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="40" cy="30" rx="14" ry="9" transform="rotate(-30 40 30)" fill="none" stroke={earned ? '#F2F2E8' : '#64748B'} strokeWidth="2.5" />
            <path d="M34 33l12-7" stroke={earned ? '#F2F2E8' : '#64748B'} strokeWidth="2" />
          </>
        );
      case 'ironman':
        return (
          <>
            <path d="M40 20l14 6v10c0 9-6 15-14 19-8-4-14-10-14-19V26z" fill="none" stroke={earned ? '#F2F2E8' : '#64748B'} strokeWidth="3" />
            <path d="M40 28v18M32 37h16" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
          </>
        );
      case 'perfect_week':
        return (
          <>
            <text x="40" y="45" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="22" fill={earned ? '#F2F2E8' : '#64748B'}>6</text>
            <text x="40" y="58" textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="700" fontSize="9" fill={strokeColor}>OF 6</text>
            <path d="M40 14l2.5 5 5.5 0.8-4 3.9 1 5.3-5-2.6-5 2.6 1-5.3-4-3.9 5.5-0.8z" fill={strokeColor} />
          </>
        );
      case 'top_dog':
        return (
          <>
            <path d="M22 50l4-22 9 10 5-14 5 14 9-10 4 22z" fill={strokeColor} />
            <rect x="22" y="50" width="36" height="7" rx="2" fill={earned ? '#F2F2E8' : '#64748B'} />
          </>
        );
      case 'clutch':
        return (
          <>
            <circle cx="40" cy="40" r="18" fill="none" stroke={earned ? '#F2F2E8' : '#64748B'} strokeWidth="2.5" />
            <circle cx="40" cy="40" r="10" fill="none" stroke={strokeColor} strokeWidth="3" />
            <circle cx="40" cy="40" r="3.5" fill={earned ? '#F2F2E8' : '#64748B'} />
            <path d="M40 14v8M40 58v8M14 40h8M58 40h8" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'upset_artist':
        return (
          <path d="M44 16L30 42h10l-4 22 16-28H42z" fill={strokeColor} stroke={earned ? '#F2F2E8' : '#64748B'} strokeWidth="1.5" />
        );
      case 'rival_slayer':
        return (
          <>
            <path d="M28 28l24 24M52 28L28 52" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
            <circle cx="28" cy="28" r="3" fill={earned ? '#F2F2E8' : '#64748B'} />
            <circle cx="52" cy="28" r="3" fill={earned ? '#F2F2E8' : '#64748B'} />
          </>
        );
      case 'hot_take':
      default:
        return (
          <>
            <path d="M40 18c2 9 10 12 10 23a10 10 0 01-20 0c0-5 3-8 5-12 2 3 5 4 5-11z" fill={strokeColor} />
            <path d="M40 38c1 4 5 5 5 9a5 5 0 01-10 0c0-2 2-3 2-6 1 1 2 1 3-3z" fill={earned ? '#F2F2E8' : '#64748B'} />
          </>
        );
    }
  };

  return (
    <div className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all ${
      earned ? 'bg-[#10131B] border-[#6A85FA]/40 shadow-[0_0_15px_rgba(106,133,250,0.15)]' : 'bg-[#0B0D10] border-[#1C1F26] opacity-40 grayscale'
    }`}>
      <svg viewBox="0 0 80 80" className="w-14 h-14 mb-2 drop-shadow-sm">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={earned ? '#8FA3FF' : '#3A4050'} />
            <stop offset="100%" stopColor={earned ? '#4F63D6' : '#1C2028'} />
          </linearGradient>
        </defs>
        {/* Shield Frame */}
        <path
          d="M40 4 70 18v26c0 14-13 24-30 30C23 68 10 58 10 44V18z"
          fill={fillColor}
          stroke={`url(#grad-${id})`}
          strokeWidth="3"
        />
        {renderBadgeContent()}
      </svg>
    </div>
  );
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  stats,
  isOwnProfile,
  onLogout,
}) => {
  const earnedCount = stats.badges.filter((b) => b.earned).length;

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28">
      {/* ── 1. Profile Hero Card ──────────────────────────────── */}
      <div className="relative p-6 rounded-3xl bg-[#0E1013] border border-[#1C1F26] text-center mb-6 overflow-hidden">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#6A85FA]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden border-2 border-[#6A85FA] shadow-[0_0_20px_rgba(106,133,250,0.4)] bg-[#050505]">
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}&backgroundColor=1C1F26&textColor=F2F2E8`;
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

      {/* ── 2. Fantasy 4-Stat Grid ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Accuracy */}
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

        {/* Upsets Called */}
        <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between text-xs text-[#9AA0A6] mb-1">
            <span>Upsets Called</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-display text-3xl text-[#F2F2E8]">
            {stats.upsetsCalledCorrectly}
          </span>
          <span className="block text-[11px] text-[#64748B] mt-0.5">
            Pre-game underdogs
          </span>
        </div>

        {/* Best Week */}
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

        {/* Most Picked Team */}
        <div className="p-4 rounded-2xl bg-[#0E1013] border border-[#1C1F26]">
          <div className="flex items-center justify-between text-xs text-[#9AA0A6] mb-1">
            <span>Most Picked</span>
            <ThumbsUp className="w-4 h-4 text-[#6A85FA]" />
          </div>
          <span className="font-display text-lg text-[#F2F2E8] truncate block" title={stats.mostPickedTeam.teamName}>
            {stats.mostPickedTeam.teamName}
          </span>
          <span className="block text-[11px] text-[#64748B] mt-0.5">
            Picked {stats.mostPickedTeam.count}× ({stats.mostPickedTeam.correctCount}W)
          </span>
        </div>
      </div>

      {/* ── 3. Vs Rival Card ──────────────────────────────────── */}
      {stats.rivalRecord.rivalRosterId && (
        <div className="p-5 rounded-3xl bg-[#0E1013] border border-[#1C1F26] mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-[#1C1F26] pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>Rivalry Series (Ida y Vuelta)</span>
            </div>
            <span className="text-[10px] font-mono text-[#64748B] bg-[#161920] px-2 py-0.5 rounded-full border border-[#1C1F26]">
              W4 · W14
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            {/* User */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#6A85FA] bg-[#050505]">
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#F2F2E8] line-clamp-1">{user.displayName}</h4>
                <p className="text-[11px] text-[#9AA0A6] line-clamp-1">{user.teamName}</p>
              </div>
            </div>

            {/* Score / Status */}
            <div className="text-center px-4">
              <span className="font-display text-2xl text-[#F2F2E8] tracking-widest">
                {stats.rivalRecord.yourWins} – {stats.rivalRecord.rivalWins}
              </span>
              <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mt-0.5">
                {stats.rivalRecord.weeksPlayed === 0 ? 'Upcoming' : 'Series Record'}
              </span>
            </div>

            {/* Rival */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <h4 className="font-bold text-sm text-[#F2F2E8] line-clamp-1">{stats.rivalRecord.rivalDisplayName}</h4>
                <p className="text-[11px] text-[#9AA0A6] line-clamp-1">{stats.rivalRecord.rivalTeamName}</p>
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E5484D] bg-[#050505]">
                <img
                  src={stats.rivalRecord.rivalAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stats.rivalRecord.rivalDisplayName)}`}
                  alt={stats.rivalRecord.rivalDisplayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1C1F26] text-center">
            <p className="text-[11px] text-[#9AA0A6]">
              Week 4 is the first clash (no byes) · <span className="text-amber-400/90 font-semibold">Week 14 closes the regular season</span>
            </p>
          </div>
        </div>
      )}

      {/* ── 4. Season Grid (W3–W14) ───────────────────────────── */}
      <div className="p-5 rounded-3xl bg-[#0E1013] border border-[#1C1F26] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-[#F2F2E8] tracking-wide">
            Season (Regular Season W3–W14)
          </h3>
          <span className="text-[11px] text-[#64748B]">12 Weeks</span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {stats.weeklyHistory.map((wh) => {
            const hasPlayed = wh.total > 0;
            return (
              <div
                key={wh.week}
                className={`p-2.5 rounded-xl border text-center relative transition-all ${
                  wh.isRivalryWeek
                    ? 'border-amber-500/50 bg-[#16140D]'
                    : hasPlayed
                    ? 'border-[#2A2F3D] bg-[#111317]'
                    : 'border-[#1C1F26] bg-[#0A0C0E] opacity-50'
                }`}
              >
                {wh.isRivalryWeek && (
                  <span className="absolute -top-1.5 -right-1 text-[10px]" title="Rivalry Week">
                    ⚔️
                  </span>
                )}
                <span className="block text-[10px] font-bold text-[#64748B] uppercase">
                  W{wh.week}
                </span>
                <span className={`block font-display text-sm mt-0.5 ${
                  wh.isRivalryWeek ? 'text-amber-300' : hasPlayed ? 'text-[#F2F2E8]' : 'text-[#64748B]'
                }`}>
                  {hasPlayed ? `${wh.correct}-${wh.total - wh.correct}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-[#64748B] text-center mt-3">
          Regular fantasy season concludes in Week 14.
        </p>
      </div>

      {/* ── 5. Badges Section ─────────────────────────────────── */}
      <div className="p-5 rounded-3xl bg-[#0E1013] border border-[#1C1F26]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-[#F2F2E8] tracking-wide">
            Badges
          </h3>
          <span className="text-xs font-bold text-[#6A85FA] bg-[#6A85FA]/10 px-2.5 py-0.5 rounded-full border border-[#6A85FA]/20">
            {earnedCount} / {stats.badges.length}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {stats.badges.map((b) => (
            <div key={b.id} className="flex flex-col items-center text-center">
              <BadgeIcon id={b.id} earned={b.earned} />
              <span className={`text-[11px] font-bold mt-1.5 leading-tight ${
                b.earned ? 'text-[#F2F2E8]' : 'text-[#64748B]'
              }`}>
                {b.name}
              </span>
              <span className="text-[9px] text-[#64748B] leading-tight mt-0.5 line-clamp-2">
                {b.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
