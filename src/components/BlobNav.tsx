import React, { useRef, useEffect, useState } from 'react';
import { CheckSquare, Trophy, User } from 'lucide-react';

export type ActiveTab = 'picks' | 'leaderboard' | 'profile';

interface BlobNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const BlobNav: React.FC<BlobNavProps> = ({ activeTab, onTabChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blobStyle, setBlobStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'picks', label: 'Picks', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  useEffect(() => {
    if (!containerRef.current) return;
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button.nav-tab-btn');
    const targetBtn = buttons[activeIndex];

    if (targetBtn) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const btnRect = targetBtn.getBoundingClientRect();
      setBlobStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [activeTab]);

  return (
    <nav className="fixed left-1/2 -translate-x-1/2 bottom-4 md:bottom-6 z-50 w-[94vw] max-w-[520px]">
      <div
        ref={containerRef}
        className="relative flex items-center p-1.5 bg-[#0E1013]/90 backdrop-blur-xl border border-[#1C1F26] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
      >
        {/* Animated Spring Sliding Blob Indicator */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-full bg-[#1C2230] border border-[#6A85FA]/40 shadow-[0_0_15px_rgba(106,133,250,0.25)] transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.4,1)] pointer-events-none"
          style={{
            left: `${blobStyle.left}px`,
            width: `${blobStyle.width}px`,
          }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-tab-btn relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                isActive ? 'text-[#F2F2E8]' : 'text-[#9AA0A6] hover:text-[#F2F2E8]'
              }`}
            >
              <span className={isActive ? 'text-[#6A85FA]' : 'text-[#9AA0A6]'}>{tab.icon}</span>
              <span className="tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
