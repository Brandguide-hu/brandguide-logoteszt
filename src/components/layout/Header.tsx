'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useAuthModal } from '@/providers/auth-modal-provider';
import { cx } from '@/utils/cx';

const NAV_ITEMS = [
  { label: 'Így működik', href: '/igy-mukodik', authRequired: false },
  { label: 'Logó elemzés', href: '/elemzes/uj', authRequired: false },
  { label: 'Árak', href: '/arak', authRequired: false },
  { label: 'Logó galéria', href: '/galeria', authRequired: false },
  { label: 'Dashboard', href: '/dashboard', authRequired: true },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(item => !item.authRequired || user);

  const handleLogoClick = () => {
    router.push('/');
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setProfileMenuOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img src="/logolab-logo-newLL.svg" alt="LogoLab" className="h-11" />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map(item => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cx(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
                  pathname === item.href || pathname?.startsWith(item.href + '/') || (item.href === '/elemzes/uj' && pathname?.startsWith('/elemzes'))
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FFF012] flex items-center justify-center text-sm font-bold text-gray-900">
                    {(profile?.name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <svg className={cx('w-4 h-4 text-gray-500 transition-transform', profileMenuOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { router.push('/dashboard'); setProfileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Dashboard
                      </button>
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
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="px-4 py-2 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Bejelentkezés
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Menü"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {visibleItems.map(item => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cx(
                  'w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer',
                  pathname === item.href || pathname?.startsWith(item.href + '/') || (item.href === '/elemzes/uj' && pathname?.startsWith('/elemzes'))
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-gray-100">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-[#FFF012] flex items-center justify-center text-sm font-bold text-gray-900">
                    {(profile?.name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  Kijelentkezés
                </button>
              </div>
            ) : (
              <button
                onClick={() => { openAuthModal(); setMobileMenuOpen(false); }}
                className="w-full py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Bejelentkezés
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
