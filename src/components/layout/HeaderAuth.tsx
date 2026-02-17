'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useAuthModal } from '@/providers/auth-modal-provider';

/**
 * Compact auth section for minimal page headers (teszt, eredmeny).
 * Shows user avatar with dropdown or login button.
 */
export function HeaderAuth() {
  const router = useRouter();
  const { user, profile, isLoading, signOut, isAdmin } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    router.push('/');
  };

  if (isLoading) {
    return <div className="size-8 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal()}
        className="px-3 py-1.5 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
      >
        Bejelentkezés
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="size-7 rounded-full bg-[#FFF012] flex items-center justify-center text-xs font-bold text-gray-900">
          {(profile?.name || user.email || '?')[0].toUpperCase()}
        </div>
        <svg className={`size-3.5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { router.push('/dashboard'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Dashboard
            </button>
            {(isAdmin || profile?.is_admin) && (
              <button
                onClick={() => { router.push('/admin'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              >
                <span className="inline-block size-1.5 rounded-full bg-[#FFF012]" />
                Admin
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              Kijelentkezés
            </button>
          </div>
        </>
      )}
    </div>
  );
}
