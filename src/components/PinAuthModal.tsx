import React, { useState, useEffect } from 'react';
import type { LeagueUser } from '../types';
import { saveAuthUser, verifyUserPin } from '../lib/store';
import { Check, KeyRound, X } from 'lucide-react';

interface PinAuthModalProps {
  users: LeagueUser[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: LeagueUser) => void;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  users,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedUser, setSelectedUser] = useState<LeagueUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUser(null);
      setPin('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select your fantasy team');
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (!verifyUserPin(selectedUser.userId, pin)) {
      setError('Wrong PIN — try again');
      return;
    }
    saveAuthUser(selectedUser, pin);
    onSuccess(selectedUser);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md p-6 bg-[#0E1013] border border-[#1C1F26] rounded-3xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#9AA0A6] hover:text-white hover:bg-[#1C1F26] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-[#6A85FA]/10 border border-[#6A85FA]/30 flex items-center justify-center text-[#6A85FA]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-display text-2xl text-[#F2F2E8]">
            Claim Your Sleeper Team
          </h3>
          <p className="text-xs text-[#9AA0A6] mt-0.5">
            Select your manager profile and set a 4-digit PIN.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/30 text-xs font-semibold text-[#E5484D] text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Selection Grid */}
          <div>
            <label className="block text-xs font-bold text-[#9AA0A6] uppercase tracking-wider mb-2">
              Select Your Team
            </label>
            {users.length === 0 ? (
              <div className="h-24 rounded-xl bg-[#111317] border border-[#1C1F26] flex items-center justify-center text-xs text-[#9AA0A6]">
                Loading league members…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto no-scrollbar p-1">
                {users.map((u) => {
                  const isSelected = selectedUser?.userId === u.userId;
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setError(null);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#141824] border-[#6A85FA] shadow-[0_0_12px_rgba(106,133,250,0.3)]'
                          : 'bg-[#111317] border-[#1C1F26] hover:border-[#2A2F3D]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#1C1F26] flex-shrink-0 bg-[#050505]">
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.displayName)}&backgroundColor=1C1F26&textColor=F2F2E8`;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#F2F2E8] truncate leading-tight">
                          {u.displayName}
                        </p>
                        <p className="text-[10px] text-[#9AA0A6] truncate">
                          {u.teamName}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#6A85FA] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4-Digit PIN */}
          <div>
            <label className="block text-xs font-bold text-[#9AA0A6] uppercase tracking-wider mb-1.5">
              4-Digit PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError(null);
              }}
              className="w-full text-center tracking-[0.5em] font-display text-2xl py-2 px-4 rounded-xl bg-[#151820] border border-[#1C1F26] focus:border-[#6A85FA] text-[#F2F2E8] outline-none"
            />
            <p className="text-[10px] text-[#64748B] text-center mt-1">
              First time? This creates your PIN — remember it!
            </p>
          </div>

          <button
            type="submit"
            disabled={users.length === 0}
            className="w-full py-3 rounded-xl bg-[#6A85FA] hover:bg-[#5872ea] text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(106,133,250,0.4)] transition-all cursor-pointer disabled:opacity-50"
          >
            Confirm & Sign In
          </button>
        </form>
      </div>
    </div>
  );
};
