'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { CATEGORIES, Category } from '@/types';

interface Stats {
  totalAnalyses: number;
  pendingApprovals: number;
  publicAnalyses: number;
  totalUsers: number;
  paidAnalyses: number;
}

interface AdminAnalysis {
  id: string;
  logo_name: string;
  creator_name: string;
  category: Category;
  tier: string;
  status: string;
  visibility: string;
  is_weekly_winner: boolean;
  logo_base64: string | null;
  result: { osszpontszam?: number; minosites?: string } | null;
  created_at: string;
  user_id: string;
}

interface AdminUser {
  id: string;
  display_name: string | null;
  email: string | null;
  is_admin: boolean;
  is_email_verified: boolean;
  created_at: string;
  analysisCount: number;
  paidCount: number;
}

type Tab = 'dashboard' | 'pending' | 'all' | 'users';

const TRUSTED_TOKEN_KEY = 'logolab_admin_trusted';

export default function AdminPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingItems, setPendingItems] = useState<AdminAnalysis[]>([]);
  const [allItems, setAllItems] = useState<AdminAnalysis[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 2FA state
  const [twoFAState, setTwoFAState] = useState<'checking' | 'needs_code' | 'entering' | 'verified'>('checking');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASending, setTwoFASending] = useState(false);
  const [trustBrowser, setTrustBrowser] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/');
      return;
    }
    if (user && isAdmin) {
      check2FA();
    }
  }, [user, authLoading, isAdmin]);

  const check2FA = async () => {
    const headers = await getAuthHeaders();
    const trustedToken = localStorage.getItem(TRUSTED_TOKEN_KEY);

    if (trustedToken) {
      const res = await fetch('/api/auth/check-trusted', {
        method: 'POST',
        headers,
        body: JSON.stringify({ trustedToken }),
      });
      const data = await res.json();
      if (data.trusted) {
        setTwoFAState('verified');
        fetchData();
        return;
      }
      localStorage.removeItem(TRUSTED_TOKEN_KEY);
    }

    setTwoFAState('needs_code');
  };

  const send2FACode = async () => {
    setTwoFASending(true);
    setTwoFAError('');
    const headers = await getAuthHeaders();

    const res = await fetch('/api/auth/admin-2fa', {
      method: 'POST',
      headers,
    });

    if (res.ok) {
      setTwoFAState('entering');
    } else {
      setTwoFAError('Nem sikerült a kód küldése.');
    }
    setTwoFASending(false);
  };

  const verify2FACode = async () => {
    setTwoFASending(true);
    setTwoFAError('');
    const headers = await getAuthHeaders();

    const res = await fetch('/api/auth/verify-2fa', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: twoFACode, trustBrowser }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.trustedToken) {
        localStorage.setItem(TRUSTED_TOKEN_KEY, data.trustedToken);
      }
      setTwoFAState('verified');
      fetchData();
    } else {
      setTwoFAError(data.error || 'Hibás kód');
    }
    setTwoFASending(false);
  };

  const getAuthHeaders = async () => {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session?.access_token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchData = async () => {
    const headers = await getAuthHeaders();

    const [statsRes, pendingRes, allRes, usersRes] = await Promise.all([
      fetch('/api/admin?action=dashboard', { headers }),
      fetch('/api/admin?action=pending', { headers }),
      fetch('/api/admin?action=all', { headers }),
      fetch('/api/admin?action=users', { headers }),
    ]);

    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats(data.stats);
    }
    if (pendingRes.ok) {
      const data = await pendingRes.json();
      setPendingItems(data.analyses || []);
    }
    if (allRes.ok) {
      const data = await allRes.json();
      setAllItems(data.analyses || []);
    }
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users || []);
    }
    setIsLoading(false);
  };

  const handleAction = async (action: string, analysisId: string, reason?: string) => {
    setActionLoading(analysisId);
    const headers = await getAuthHeaders();

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, analysisId, reason }),
    });

    if (res.ok) {
      await fetchData();
    } else {
      alert('Hiba történt a művelet során.');
    }
    setActionLoading(null);
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  // 2FA gate
  if (twoFAState !== 'verified') {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full mx-4">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Admin hitelesítés</h1>

            {twoFAState === 'checking' && (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="animate-spin h-5 w-5 border-2 border-yellow-400 border-t-transparent rounded-full" />
                <span>Ellenőrzés...</span>
              </div>
            )}

            {twoFAState === 'needs_code' && (
              <div>
                <p className="text-gray-600 mb-4 text-sm">
                  A biztonságod érdekében egy egyszer használatos kódot küldünk az email címedre.
                </p>
                <button
                  onClick={send2FACode}
                  disabled={twoFASending}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {twoFASending ? 'Küldés...' : 'Kód küldése emailben'}
                </button>
              </div>
            )}

            {twoFAState === 'entering' && (
              <div>
                <p className="text-gray-600 mb-4 text-sm">
                  Írd be az emailben kapott 6 jegyű kódot.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && twoFACode.length === 6 && verify2FACode()}
                />
                <label className="flex items-center gap-2 mb-4 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trustBrowser}
                    onChange={e => setTrustBrowser(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Böngésző megjegyzése 30 napra
                </label>
                <button
                  onClick={verify2FACode}
                  disabled={twoFASending || twoFACode.length !== 6}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {twoFASending ? 'Ellenőrzés...' : 'Ellenőrzés'}
                </button>
                <button
                  onClick={send2FACode}
                  disabled={twoFASending}
                  className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  Új kód küldése
                </button>
              </div>
            )}

            {twoFAError && (
              <p className="mt-3 text-sm text-red-600">{twoFAError}</p>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Statisztikák' },
    { key: 'pending', label: 'Jóváhagyás', badge: pendingItems.length },
    { key: 'all', label: 'Összes elemzés' },
    { key: 'users', label: 'Felhasználók', badge: users.length },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h1>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-gray-200">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  tab === t.key
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Dashboard tab */}
          {tab === 'dashboard' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Összes elemzés', value: stats.totalAnalyses, color: 'bg-blue-50 text-blue-700' },
                { label: 'Jóváhagyásra vár', value: stats.pendingApprovals, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Publikus', value: stats.publicAnalyses, color: 'bg-green-50 text-green-700' },
                { label: 'Fizetős', value: stats.paidAnalyses, color: 'bg-purple-50 text-purple-700' },
                { label: 'Felhasználók', value: stats.totalUsers, color: 'bg-gray-100 text-gray-700' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl p-5 ${stat.color}`}>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm mt-1 opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pending tab */}
          {tab === 'pending' && (
            <div>
              {pendingItems.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <p className="text-gray-500 text-lg">Nincs jóváhagyásra váró elemzés</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingItems.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-4">
                        {item.logo_base64 && (
                          <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center p-2 flex-shrink-0">
                            <img
                              src={`data:image/png;base64,${item.logo_base64}`}
                              alt={item.logo_name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{item.logo_name}</h3>
                          <p className="text-sm text-gray-500">
                            {item.creator_name} &bull; {CATEGORIES[item.category] || item.category} &bull; {item.tier}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(item.created_at).toLocaleDateString('hu-HU')}
                            {item.result?.osszpontszam && ` \u2022 ${item.result.osszpontszam}/100`}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAction('approve', item.id)}
                            disabled={actionLoading === item.id}
                            className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Jóváhagyás
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Elutasítás oka (opcionális):');
                              if (reason !== null) handleAction('reject', item.id, reason || undefined);
                            }}
                            disabled={actionLoading === item.id}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Elutasítás
                          </button>
                          <button
                            onClick={() => handleAction('set_weekly_winner', item.id)}
                            disabled={actionLoading === item.id}
                            className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            title="Hét logója"
                          >
                            🏆
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All analyses tab */}
          {tab === 'all' && (
            <div>
              {allItems.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <p className="text-gray-500 text-lg">Nincs elemzés</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Logo</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Kategória</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Tier</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Státusz</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Pont</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Dátum</th>
                        <th className="text-right px-4 py-3 text-gray-500 font-medium">Műveletek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {item.is_weekly_winner && <span>🏆</span>}
                              <span className="font-medium text-gray-900 truncate max-w-[150px]">{item.logo_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{CATEGORIES[item.category] || item.category}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{item.tier}</span>
                          </td>
                          <td className="px-4 py-3">
                            {item.visibility === 'public' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Publikus</span>}
                            {item.visibility === 'pending_approval' && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Váró</span>}
                            {item.visibility === 'rejected' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Elutasítva</span>}
                            {item.visibility === 'private' && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">Zárt</span>}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {item.result?.osszpontszam || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(item.created_at).toLocaleDateString('hu-HU')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              {item.visibility === 'pending_approval' && (
                                <>
                                  <button
                                    onClick={() => handleAction('approve', item.id)}
                                    disabled={actionLoading === item.id}
                                    className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50 cursor-pointer"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => handleAction('reject', item.id)}
                                    disabled={actionLoading === item.id}
                                    className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                                  >
                                    ✗
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleAction('set_weekly_winner', item.id)}
                                disabled={actionLoading === item.id}
                                className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 disabled:opacity-50 cursor-pointer"
                                title="Hét logója"
                              >
                                🏆
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Users tab */}
          {tab === 'users' && (
            <div>
              {users.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <p className="text-gray-500 text-lg">Nincs felhasználó</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Név</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Szerep</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Email ok</th>
                        <th className="text-right px-4 py-3 text-gray-500 font-medium">Elemzések</th>
                        <th className="text-right px-4 py-3 text-gray-500 font-medium">Fizetős</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Regisztrált</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {u.display_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{u.email || '-'}</td>
                          <td className="px-4 py-3">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Admin</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">User</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.is_email_verified ? (
                              <span className="text-green-600 text-xs">Igen</span>
                            ) : (
                              <span className="text-red-500 text-xs">Nem</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {u.analysisCount}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {u.paidCount > 0 ? (
                              <span className="text-purple-700 font-medium">{u.paidCount}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(u.created_at).toLocaleDateString('hu-HU')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
