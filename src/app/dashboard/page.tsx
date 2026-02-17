'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';

interface AnalysisSummary {
  id: string;
  logo_name: string;
  tier: string;
  status: string;
  visibility: string;
  rejection_reason: string | null;
  category: string;
  created_at: string;
  result: { osszpontszam?: number } | null;
}

export default function DashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login?redirect=/dashboard');
      return;
    }

    if (user) {
      fetchAnalyses();
    }
  }, [user, isLoading, router]);

  const fetchAnalyses = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('analyses')
      .select('id, logo_name, tier, status, visibility, rejection_reason, category, created_at, result')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DASHBOARD] Fetch error:', error);
    } else {
      setAnalyses(data || []);
    }
    setIsLoadingData(false);
  };

  const handleDelete = async (e: React.MouseEvent, analysisId: string) => {
    e.stopPropagation();
    if (!confirm('Biztosan törölni szeretnéd ezt az elemzést?')) return;
    setDeletingId(analysisId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await (supabase.from('analyses') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', analysisId)
      .eq('user_id', user!.id);
    if (error) {
      alert('Hiba történt a törlés során.');
    } else {
      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const publicCount = analyses.filter(a => a.visibility === 'public').length;

  const getStatusBadge = (status: string, visibility: string) => {
    if (status === 'processing') return { label: 'Feldolgozás...', color: 'bg-blue-100 text-blue-700' };
    if (status === 'failed') return { label: 'Sikertelen', color: 'bg-red-100 text-red-700' };
    if (status === 'pending') return { label: 'Várakozik', color: 'bg-gray-100 text-gray-700' };
    if (visibility === 'public') return { label: 'Publikus', color: 'bg-green-100 text-green-700' };
    if (visibility === 'pending_approval') return { label: 'Jóváhagyásra vár', color: 'bg-yellow-100 text-yellow-700' };
    if (visibility === 'rejected') return { label: 'Elutasítva', color: 'bg-red-100 text-red-700' };
    return { label: 'Zárt', color: 'bg-gray-100 text-gray-700' };
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'free': return 'Light';
      case 'paid': return 'Max';
      case 'consultation': return 'Ultra';
      default: return tier;
    }
  };

  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Szia, {profile?.name || 'Felhasználó'}!
          </h1>
          <p className="text-gray-500 mt-1">
            {analyses.length} elemzésed van{publicCount > 0 ? ` \u2022 ${publicCount} publikus` : ''}
          </p>
        </div>

        {/* New analysis CTA */}
        <button
          onClick={() => router.push('/elemzes/uj')}
          className="w-full mb-8 py-4 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors text-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Új elemzés
        </button>

        {/* Analyses list */}
        {isLoadingData ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500 text-lg mb-2">Még nincs elemzésed</p>
            <p className="text-gray-400">Töltsd fel az első logódat és kapj részletes értékelést!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map(analysis => {
              const badge = getStatusBadge(analysis.status, analysis.visibility);
              const score = analysis.result?.osszpontszam;
              const isCompleted = analysis.status === 'completed';
              const isPending = analysis.status === 'pending' || analysis.status === 'processing';
              const isPaid = analysis.tier === 'paid' || analysis.tier === 'consultation';

              return (
                <div
                  key={analysis.id}
                  className="w-full bg-white rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/${analysis.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Score */}
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {score ? (
                        <span className="text-lg font-bold text-gray-900">{score}</span>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {analysis.logo_name || 'Névtelen logó'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString('hu-HU')} · {getTierLabel(analysis.tier)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span className={`hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Action row */}
                  <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                    {isCompleted && (
                      <button
                        onClick={() => router.push(`/eredmeny/${analysis.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Elemzés megtekintése
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => router.push(`/elemzes/feldolgozas/${analysis.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Elemzés indítása
                      </button>
                    )}
                    <div className="flex-1" />
                    {isPaid && (
                      <button
                        onClick={(e) => handleDelete(e, analysis.id)}
                        disabled={deletingId === analysis.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {deletingId === analysis.id ? 'Törlés...' : 'Törlés'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
