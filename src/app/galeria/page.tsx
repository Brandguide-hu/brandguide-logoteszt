'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { CATEGORIES, Category } from '@/types';

interface GalleryItem {
  id: string;
  logo_name: string;
  creator_name: string;
  category: Category;
  logo_thumbnail_path: string | null;
  logo_base64: string | null;
  result: { osszpontszam: number; minosites: string } | null;
  is_weekly_winner: boolean;
  weekly_winner_date: string | null;
  created_at: string;
}

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Minden' },
  ...Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })),
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Legújabb' },
  { value: 'highest', label: 'Legjobb pontszám' },
  { value: 'lowest', label: 'Legalacsonyabb pontszám' },
];

export default function GaleriaPage() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [weeklyWinner, setWeeklyWinner] = useState<GalleryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/gallery');
      if (!res.ok) {
        console.error('[GALLERY] Fetch error:', res.status);
        setIsLoading(false);
        return;
      }
      const { analyses } = await res.json();
      const allItems = (analyses || []) as GalleryItem[];

    // Find current weekly winner
    const winner = allItems.find(item => item.is_weekly_winner);
    if (winner) {
      setWeeklyWinner(winner);
    }

    setItems(allItems);
    setIsLoading(false);
    } catch (err) {
      console.error('[GALLERY] Fetch error:', err);
      setIsLoading(false);
    }
  };

  const getLogoUrl = (item: GalleryItem): string | null => {
    if (item.logo_thumbnail_path) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return `${supabaseUrl}/storage/v1/object/public/logos/${item.logo_thumbnail_path}`;
    }
    if (item.logo_base64) {
      return `data:image/png;base64,${item.logo_base64}`;
    }
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-cyan-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-violet-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Apply filters and sorting
  const filteredItems = items
    .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'highest') {
        return (b.result?.osszpontszam || 0) - (a.result?.osszpontszam || 0);
      }
      if (sortBy === 'lowest') {
        return (a.result?.osszpontszam || 0) - (b.result?.osszpontszam || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Logo Galéria</h1>
            <p className="text-gray-500 mt-1">
              Publikusan megosztott logo elemzések
            </p>
          </div>

          {/* Weekly Winner */}
          {weeklyWinner && (
            <div className="mb-8 bg-gradient-to-r from-yellow-50 via-yellow-100/50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <h2 className="text-lg font-bold text-gray-900">A hét logója</h2>
                {weeklyWinner.weekly_winner_date && (
                  <span className="text-sm text-gray-500">
                    — {new Date(weeklyWinner.weekly_winner_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )}
              </div>
              <button
                onClick={() => router.push(`/galeria/${weeklyWinner.id}`)}
                className="flex items-center gap-6 w-full text-left hover:opacity-90 transition-opacity cursor-pointer"
              >
                {/* Logo */}
                <div className="w-24 h-24 bg-white rounded-xl border border-yellow-200 flex items-center justify-center p-3 flex-shrink-0">
                  {getLogoUrl(weeklyWinner) ? (
                    <img
                      src={getLogoUrl(weeklyWinner)!}
                      alt={weeklyWinner.logo_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-300 text-sm">Logo</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{weeklyWinner.logo_name}</h3>
                  <p className="text-gray-500 text-sm">
                    {weeklyWinner.creator_name} &bull; {CATEGORIES[weeklyWinner.category] || weeklyWinner.category}
                  </p>
                </div>
                {/* Score */}
                {weeklyWinner.result && (
                  <div className="text-center flex-shrink-0">
                    <div className={`text-3xl font-bold ${getScoreColor(weeklyWinner.result.osszpontszam)}`}>
                      {weeklyWinner.result.osszpontszam}
                    </div>
                    <div className="text-xs text-gray-400">/100</div>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Category filter */}
            <div className="flex-1">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
              >
                {CATEGORY_FILTERS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-400 mb-4">
            {filteredItems.length} logo
          </p>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">Nincs találat</p>
              <p className="text-gray-400 text-sm">Próbáld más kategóriával vagy rendezéssel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const logoUrl = getLogoUrl(item);
                const score = item.result?.osszpontszam;

                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/galeria/${item.id}`)}
                    className="bg-white rounded-xl p-4 hover:shadow-lg transition-all text-left group cursor-pointer"
                  >
                    {/* Logo image */}
                    <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center p-4 mb-3 group-hover:bg-gray-100 transition-colors relative">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={item.logo_name}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-gray-300 text-sm">Logo</span>
                      )}
                      {/* Weekly winner badge */}
                      {item.is_weekly_winner && (
                        <span className="absolute top-2 left-2 text-lg">🏆</span>
                      )}
                    </div>

                    {/* Info */}
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {item.logo_name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {item.creator_name}
                    </p>

                    {/* Score + category */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {CATEGORIES[item.category] || item.category}
                      </span>
                      {score !== undefined && (
                        <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
