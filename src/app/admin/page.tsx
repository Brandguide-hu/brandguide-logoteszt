'use client';

import { useEffect, useState } from 'react';
import { CATEGORIES, Category } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
  name: string | null;
  email: string | null;
  is_admin: boolean;
  is_email_verified: boolean;
  created_via: string | null;
  created_at: string;
  analysisCount: number;
  paidCount: number;
}

interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

interface FunnelData {
  days: number;
  uniqueSessions: number;
  abandoned: number;
  funnel: FunnelStep[];
}

type Tab = 'dashboard' | 'pending' | 'all' | 'users' | 'funnel' | 'featured' | 'test';

interface FeaturedAnalysis {
  id: string;
  display_order: number;
  logo_name: string;
  category: string;
  total_score: number;
  visibility: string;
}

interface AvailableAnalysis {
  id: string;
  logo_name: string;
  category: string;
  total_score: number;
  visibility: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingItems, setPendingItems] = useState<AdminAnalysis[]>([]);
  const [allItems, setAllItems] = useState<AdminAnalysis[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [funnelDays, setFunnelDays] = useState(7);
  const [homepageFeatured, setHomepageFeatured] = useState<FeaturedAnalysis[]>([]);
  const [galleryFeatured, setGalleryFeatured] = useState<FeaturedAnalysis[]>([]);
  const [availableItems, setAvailableItems] = useState<AvailableAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [featuredSaving, setFeaturedSaving] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'unauthorized' | 'authorized'>('loading');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Test analysis state
  const [testLogo, setTestLogo] = useState<string | null>(null);
  const [testLogoName, setTestLogoName] = useState('');
  const [testMediaType, setTestMediaType] = useState('image/png');
  const [testAnalysisRunning, setTestAnalysisRunning] = useState(false);
  const [testAnalysisPhase, setTestAnalysisPhase] = useState('');
  const [testAnalysisProgress, setTestAnalysisProgress] = useState(0);
  const [testAnalysisResult, setTestAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setAuthState('unauthorized');
        return;
      }

      const token = session.access_token;

      const res = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        setAuthState('unauthorized');
        return;
      }

      const data = await res.json();

      if (!data.profile?.is_admin) {
        setAuthState('unauthorized');
        return;
      }

      setAccessToken(token);
      setAuthState('authorized');
      fetchData(token);
    } catch (err) {
      console.error('[ADMIN] Auth check error:', err);
      setAuthState('unauthorized');
    }
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });

  const fetchData = async (token?: string) => {
    const headers = {
      'Authorization': `Bearer ${token || accessToken}`,
      'Content-Type': 'application/json',
    };

    const [statsRes, pendingRes, allRes, usersRes, funnelRes, featuredRes] = await Promise.all([
      fetch('/api/admin?action=dashboard', { headers }),
      fetch('/api/admin?action=pending', { headers }),
      fetch('/api/admin?action=all', { headers }),
      fetch('/api/admin?action=users', { headers }),
      fetch(`/api/admin/funnel?days=${funnelDays}`, { headers }),
      fetch('/api/admin/featured-analyses', { headers }),
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
    if (funnelRes.ok) {
      const data = await funnelRes.json();
      setFunnelData(data);
    }
    if (featuredRes.ok) {
      const data = await featuredRes.json();
      setHomepageFeatured(data.homepage || []);
      setGalleryFeatured(data.gallery || []);
      setAvailableItems(data.available || []);
    }
    setIsLoading(false);
  };

  const handleAction = async (action: string, analysisId: string, reason?: string) => {
    setActionLoading(analysisId);
    const headers = getAuthHeaders();

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

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Unauthorized
  if (authState === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full mx-4 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Hozzáférés megtagadva</h1>
          <p className="text-gray-600 mb-4">Nincs admin jogosultságod.</p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Vissza a főoldalra
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Statisztikák' },
    { key: 'pending', label: 'Jóváhagyás', badge: pendingItems.length },
    { key: 'all', label: 'Összes elemzés' },
    { key: 'users', label: 'Felhasználók', badge: users.length },
    { key: 'funnel', label: 'Funnel' },
    { key: 'featured', label: 'Minta elemzések', badge: homepageFeatured.length + galleryFeatured.length },
    { key: 'test', label: '🧪 Teszt elemzés' },
  ];

  // Test analysis functions
  const [testDragOver, setTestDragOver] = useState(false);

  const loadTestFile = (file: File) => {
    setTestLogoName(file.name);
    setTestMediaType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(',')[1];
      setTestLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleTestLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadTestFile(file);
  };

  const handleTestDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setTestDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    loadTestFile(file);
  };

  const runTestAnalysis = async () => {
    if (!testLogo) return;

    setTestAnalysisRunning(true);
    setTestAnalysisPhase('Indítás...');
    setTestAnalysisProgress(5);
    setTestAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo: testLogo,
          mediaType: testMediaType,
          testLevel: 'detailed',
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const phaseLabels: Record<string, string> = {
        start: 'Indítás...',
        vision: 'Kép feldolgozás...',
        analysis: 'Pontozás...',
        brandguide_analysis: 'Pontozás...',
        processing: 'Tipográfia elemzés...',
        visual: 'Vizuális elemzés...',
        saving: 'Mentés...',
        complete: 'Kész!',
      };

      const phaseProgress: Record<string, number> = {
        start: 5,
        vision: 15,
        analysis: 30,
        brandguide_analysis: 30,
        processing: 60,
        visual: 80,
        saving: 95,
        complete: 100,
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            if (phaseLabels[eventType]) {
              setTestAnalysisPhase(phaseLabels[eventType]);
            }
            if (phaseProgress[eventType]) {
              setTestAnalysisProgress(phaseProgress[eventType]);
            }
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.id) {
                setTestAnalysisResult(data.id);
                setTestAnalysisPhase('Kész! Átirányítás...');
                setTestAnalysisProgress(100);
                // Navigálj az eredmény oldalra mint a normál fizetési flow
                setTimeout(() => {
                  window.location.href = `/eredmeny/${data.id}`;
                }, 1200);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error('Test analysis error:', err);
      setTestAnalysisPhase('Hiba történt!');
    } finally {
      setTestAnalysisRunning(false);
    }
  };

  const resetTestAnalysis = () => {
    setTestLogo(null);
    setTestLogoName('');
    setTestMediaType('image/png');
    setTestAnalysisRunning(false);
    setTestAnalysisPhase('');
    setTestAnalysisProgress(0);
    setTestAnalysisResult(null);
  };

  // Featured elemzések kezelése
  const addToFeaturedList = (
    id: string,
    location: 'homepage' | 'gallery'
  ) => {
    const list = location === 'homepage' ? homepageFeatured : galleryFeatured;
    const setList = location === 'homepage' ? setHomepageFeatured : setGalleryFeatured;
    const max = location === 'homepage' ? 3 : 6;

    if (list.length >= max) {
      alert(`Maximum ${max} minta elemzés a ${location === 'homepage' ? 'főoldalra' : 'galériába'}!`);
      return;
    }
    if (list.some(f => f.id === id)) return;

    const analysis = availableItems.find(a => a.id === id);
    if (!analysis) return;

    setList([...list, {
      id: analysis.id,
      display_order: list.length,
      logo_name: analysis.logo_name,
      category: analysis.category,
      total_score: analysis.total_score,
      visibility: analysis.visibility || 'private',
    }]);
  };

  const removeFromFeaturedList = (id: string, location: 'homepage' | 'gallery') => {
    if (location === 'homepage') {
      setHomepageFeatured(homepageFeatured.filter(f => f.id !== id));
    } else {
      setGalleryFeatured(galleryFeatured.filter(f => f.id !== id));
    }
  };

  const moveFeaturedList = (id: string, direction: 'up' | 'down', location: 'homepage' | 'gallery') => {
    const list = location === 'homepage' ? homepageFeatured : galleryFeatured;
    const setList = location === 'homepage' ? setHomepageFeatured : setGalleryFeatured;

    const idx = list.findIndex(f => f.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === list.length - 1) return;

    const newItems = [...list];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
    setList(newItems);
  };

  const saveFeatured = async () => {
    setFeaturedSaving(true);
    const headers = getAuthHeaders();

    const res = await fetch('/api/admin/featured-analyses', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        homepage_ids: homepageFeatured.map(f => f.id),
        gallery_ids: galleryFeatured.map(f => f.id),
      }),
    });

    if (res.ok) {
      alert('Minta elemzések mentve!');
    } else {
      const data = await res.json();
      alert(data.error || 'Hiba történt a mentés során.');
    }
    setFeaturedSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900">LogoLab Admin</a>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← Vissza</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
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
                          {item.creator_name} • {CATEGORIES[item.category] || item.category} • {item.tier}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('hu-HU')}
                          {item.result?.osszpontszam && ` • ${item.result.osszpontszam}/100`}
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
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Forrás</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Szerep</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">Elemzések</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">Fizetős</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Regisztrált</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {u.name || u.display_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.email || '-'}</td>
                        <td className="px-4 py-3">
                          {u.created_via === 'stripe' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Stripe</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">Direct</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.is_admin ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Admin</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">User</span>
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

        {/* Funnel tab */}
        {tab === 'funnel' && (
          <div>
            <div className="flex gap-2 mb-6">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={async () => {
                    setFunnelDays(d);
                    const headers = getAuthHeaders();
                    const res = await fetch(`/api/admin/funnel?days=${d}`, { headers });
                    if (res.ok) {
                      const data = await res.json();
                      setFunnelData(data);
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    funnelDays === d
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d} nap
                </button>
              ))}
            </div>

            {funnelData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-3xl font-bold text-gray-900">{funnelData.uniqueSessions}</div>
                    <div className="text-sm text-gray-500 mt-1">Egyedi session</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-3xl font-bold text-green-600">
                      {funnelData.funnel.find(f => f.step === 'completed')?.count || 0}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Befejezett</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-3xl font-bold text-red-500">{funnelData.abandoned}</div>
                    <div className="text-sm text-gray-500 mt-1">Megszakított</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Feltöltési funnel</h3>
                  <div className="space-y-3">
                    {funnelData.funnel.map((step, index) => {
                      const maxCount = funnelData.funnel[0]?.count || 1;
                      const barWidth = Math.max((step.count / maxCount) * 100, 2);
                      const stepLabels: Record<string, string> = {
                        page_view: 'Oldal megtekintése',
                        tier_selected: 'Csomag kiválasztva',
                        logo_selected: 'Logó kiválasztva',
                        form_filled: 'Form kitöltve',
                        submit_clicked: 'Küldés gomb',
                        auth_started: 'Auth indítva',
                        stripe_redirect: 'Stripe átirányítás',
                        completed: 'Befejezve',
                      };

                      return (
                        <div key={step.step} className="flex items-center gap-4">
                          <div className="w-40 text-sm text-gray-600 flex-shrink-0">
                            {stepLabels[step.step] || step.step}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                index === funnelData.funnel.length - 1
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-gray-700">
                              {step.count}
                            </span>
                          </div>
                          <div className="w-16 text-right text-sm font-medium text-gray-500">
                            {index > 0 ? `${step.conversionRate}%` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <p className="text-gray-500">Funnel adatok betöltése...</p>
              </div>
            )}
          </div>
        )}

        {/* Featured tab */}
        {tab === 'featured' && (
          <div className="space-y-8">
            <div className="flex justify-end">
              <button
                onClick={saveFeatured}
                disabled={featuredSaving}
                className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {featuredSaving ? 'Mentés...' : '💾 Mentés'}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Bal oszlop: két lista */}
              <div className="space-y-6">
                {/* Főoldal lista */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🏠 Főoldal ({homepageFeatured.length}/3)</h3>
                  {homepageFeatured.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6 text-center">
                      <p className="text-sm text-gray-400">Nincs kiválasztva. Adj hozzá az alábbi listából.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {homepageFeatured.map((item, idx) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                          <div className="text-sm font-bold text-gray-400 w-5">{idx + 1}.</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{item.logo_name}</div>
                            <div className="text-xs text-gray-500">
                              {CATEGORIES[item.category as Category] || item.category} • {item.total_score}/100
                              {item.visibility !== 'public' && <span className="ml-1 text-orange-500">(nem publikus)</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => moveFeaturedList(item.id, 'up', 'homepage')} disabled={idx === 0} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 cursor-pointer text-xs">↑</button>
                            <button onClick={() => moveFeaturedList(item.id, 'down', 'homepage')} disabled={idx === homepageFeatured.length - 1} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 cursor-pointer text-xs">↓</button>
                            <button onClick={() => removeFromFeaturedList(item.id, 'homepage')} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer text-xs">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Galéria lista */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🖼 Galéria ({galleryFeatured.length}/6)</h3>
                  {galleryFeatured.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6 text-center">
                      <p className="text-sm text-gray-400">Nincs kiválasztva. Adj hozzá az alábbi listából.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {galleryFeatured.map((item, idx) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                          <div className="text-sm font-bold text-gray-400 w-5">{idx + 1}.</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{item.logo_name}</div>
                            <div className="text-xs text-gray-500">
                              {CATEGORIES[item.category as Category] || item.category} • {item.total_score}/100
                              {item.visibility !== 'public' && <span className="ml-1 text-orange-500">(nem publikus)</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => moveFeaturedList(item.id, 'up', 'gallery')} disabled={idx === 0} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 cursor-pointer text-xs">↑</button>
                            <button onClick={() => moveFeaturedList(item.id, 'down', 'gallery')} disabled={idx === galleryFeatured.length - 1} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 cursor-pointer text-xs">↓</button>
                            <button onClick={() => removeFromFeaturedList(item.id, 'gallery')} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer text-xs">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Jobb oszlop: elérhető elemzések */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Összes kész elemzés ({availableItems.length})</h3>
                {availableItems.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">Nincs kész elemzés.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-[700px] overflow-y-auto">
                    {availableItems.map(item => {
                      const inHomepage = homepageFeatured.some(f => f.id === item.id);
                      const inGallery = galleryFeatured.some(f => f.id === item.id);
                      return (
                        <div key={item.id} className="p-3 border-b border-gray-100 last:border-b-0 flex items-center gap-2 hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{item.logo_name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              {CATEGORIES[item.category as Category] || item.category} • {item.total_score}/100
                              {item.visibility === 'public' ? (
                                <span className="text-green-600">• publikus</span>
                              ) : (
                                <span className="text-orange-500">• {item.visibility}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => addToFeaturedList(item.id, 'homepage')}
                              disabled={inHomepage || homepageFeatured.length >= 3}
                              className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${inHomepage ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-30'}`}
                            >
                              {inHomepage ? '✓ Főoldal' : '+ Főoldal'}
                            </button>
                            <button
                              onClick={() => addToFeaturedList(item.id, 'gallery')}
                              disabled={inGallery || galleryFeatured.length >= 6}
                              className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${inGallery ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-30'}`}
                            >
                              {inGallery ? '✓ Galéria' : '+ Galéria'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Analysis tab */}
        {tab === 'test' && (
          <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Teszt elemzés indítása</h2>
              <p className="text-sm text-gray-500 mb-6">
                Tölts fel egy logót és indíts el egy elemzést fizetés nélkül. Az elemzés az adatbázisba kerül.
              </p>

              {!testLogo ? (
                <label
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${testDragOver ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 hover:border-yellow-400 hover:bg-yellow-50/50'}`}
                  onDragOver={(e) => { e.preventDefault(); setTestDragOver(true); }}
                  onDragLeave={() => setTestDragOver(false)}
                  onDrop={handleTestDrop}
                >
                  <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-sm text-gray-500">{testDragOver ? 'Engesd el!' : 'Kattints vagy húzd ide a logót'}</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, SVG</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleTestLogoUpload}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center p-2 border border-gray-200">
                      <img
                        src={`data:${testMediaType};base64,${testLogo}`}
                        alt="Feltöltött logó"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{testLogoName}</p>
                      <p className="text-sm text-gray-500">{testMediaType}</p>
                    </div>
                    {!testAnalysisRunning && !testAnalysisResult && (
                      <button
                        onClick={resetTestAnalysis}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Törlés
                      </button>
                    )}
                  </div>

                  {(testAnalysisRunning || testAnalysisResult) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{testAnalysisPhase}</span>
                        <span className="font-medium text-gray-900">{testAnalysisProgress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 transition-all duration-500"
                          style={{ width: `${testAnalysisProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!testAnalysisRunning && !testAnalysisResult && (
                      <button
                        onClick={runTestAnalysis}
                        className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        Elemzés indítása
                      </button>
                    )}

                    {testAnalysisResult && (
                      <>
                        <a
                          href={`/eredmeny/${testAnalysisResult}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-center cursor-pointer"
                        >
                          Eredmény megtekintése →
                        </a>
                        <button
                          onClick={resetTestAnalysis}
                          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Új teszt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700">
                <strong>Tipp:</strong> Ez a teszt közvetlenül a <code className="bg-blue-100 px-1 rounded">/api/analyze</code> endpointot hívja meg SSE streaminggel.
                Az elemzés a Supabase-be mentődik és megtekinthető az eredmény oldalon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
