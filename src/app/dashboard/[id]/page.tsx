'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreDisplay } from '@/components/results/ScoreDisplay';
import { RadarChart } from '@/components/results/RadarChart';
import { CriteriaCard } from '@/components/results/CriteriaCard';
import { ColorAnalysis } from '@/components/results/ColorAnalysis';
import { TypographyAnalysis } from '@/components/results/TypographyAnalysis';
import { VisualLanguageAnalysis } from '@/components/results/VisualLanguageAnalysis';
import { StrengthsWeaknesses } from '@/components/results/StrengthsWeaknesses';
import { ResultSkeleton } from '@/components/results/ResultSkeleton';
import { AnalysisResult, CRITERIA_META, CriteriaName, CATEGORIES, Category, Tier, TIER_INFO } from '@/types';

interface AnalysisData {
  id: string;
  user_id: string;
  tier: Tier;
  status: string;
  visibility: string;
  logo_name: string;
  creator_name: string;
  category: Category;
  logo_base64: string | null;
  logo_original_path: string | null;
  result: AnalysisResult | null;
  share_hash: string | null;
  rejection_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const analysisId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/login?redirect=/dashboard/${analysisId}`);
      return;
    }

    if (user && analysisId) {
      fetchAnalysis();
    }
  }, [user, authLoading, analysisId]);

  // Auto-poll when processing
  useEffect(() => {
    if (analysis?.status !== 'processing') return;
    const interval = setInterval(() => fetchAnalysis(), 5000);
    return () => clearInterval(interval);
  }, [analysis?.status]);

  const fetchAnalysis = async () => {
    const supabase = getSupabaseBrowserClient();

    const { data, error: fetchError } = await (supabase.from('analyses') as any)
      .select('id, user_id, tier, status, visibility, logo_name, creator_name, category, logo_base64, logo_original_path, result, share_hash, rejection_reason, created_at, completed_at')
      .eq('id', analysisId)
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) {
      console.error('[ANALYSIS] Fetch error:', fetchError);
      setError('Az elemzés nem található vagy nincs hozzáférés.');
      setIsLoading(false);
      return;
    }

    setAnalysis(data);

    // Build logo URL
    if (data.logo_original_path) {
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(data.logo_original_path);
      if (urlData?.publicUrl) {
        setLogoUrl(urlData.publicUrl);
      }
    } else if (data.logo_base64) {
      setLogoUrl(`data:image/png;base64,${data.logo_base64}`);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Biztosan törölni szeretnéd ezt az elemzést?')) return;

    const supabase = getSupabaseBrowserClient();
    const { error: deleteError } = await (supabase.from('analyses') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', analysisId)
      .eq('user_id', user!.id);

    if (deleteError) {
      alert('Hiba történt a törlés során.');
      return;
    }

    router.push('/dashboard');
  };

  const handleRequestPublish = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await (supabase.from('analyses') as any)
      .update({ visibility: 'pending_approval' })
      .eq('id', analysisId)
      .eq('user_id', user!.id);

    if (updateError) {
      alert('Hiba történt a publikálási kérés során.');
      return;
    }

    setAnalysis(prev => prev ? { ...prev, visibility: 'pending_approval' } : null);
  };

  const handleStartAnalysis = async () => {
    setIsStarting(true);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/start`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Hiba történt az elemzés indítása során.');
        setIsStarting(false);
        return;
      }
      // Set to processing and start polling
      setAnalysis(prev => prev ? { ...prev, status: 'processing' } : null);
    } catch {
      alert('Hiba történt az elemzés indítása során.');
      setIsStarting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <ResultSkeleton />
      </AppLayout>
    );
  }

  if (error || !analysis) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">{error || 'Az elemzés nem található.'}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-900 font-medium hover:underline"
            >
              Vissza a Dashboard-ra
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const result = analysis.result;
  const isFree = analysis.tier === 'free';
  const isPaid = analysis.tier === 'paid' || analysis.tier === 'consultation';
  const isProcessing = analysis.status === 'processing';
  const isFailed = analysis.status === 'failed';
  const isCompleted = analysis.status === 'completed';

  // Processing state
  if (isProcessing) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="animate-spin h-12 w-12 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Elemzés folyamatban...</h2>
            <p className="text-gray-500 mb-2">
              A logód elemzése még tart. Ez általában 1-2 percet vesz igénybe.
            </p>
            <p className="text-sm text-gray-400">
              {analysis.logo_name} &bull; {TIER_INFO[analysis.tier].label}
            </p>
            <button
              onClick={() => fetchAnalysis()}
              className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Frissítés
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Az elemzés sikertelen</h2>
            <p className="text-gray-500 mb-6">
              Sajnos hiba történt az elemzés során. Kérjük, próbáld újra.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Vissza
              </button>
              <button
                onClick={() => router.push('/elemzes/uj')}
                className="px-4 py-2 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 text-sm font-medium rounded-lg transition-colors"
              >
                Új elemzés
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Pending state - show start button
  if (analysis.status === 'pending' && !result) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Elemzés indítása</h2>
            <p className="text-gray-500 mb-2">
              A logód feltöltése sikeres volt. Kattints az alábbi gombra az elemzés elindításához.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {analysis.logo_name} &bull; {TIER_INFO[analysis.tier].label}
            </p>
            <button
              onClick={handleStartAnalysis}
              disabled={isStarting}
              className="px-8 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isStarting ? 'Indítás...' : 'Elemzés indítása'}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // No result but not pending
  if (!result) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">Az elemzés még nem készült el.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-900 font-medium hover:underline cursor-pointer"
            >
              Vissza a Dashboard-ra
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Completed — show results
  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Back button + meta */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {new Date(analysis.created_at).toLocaleDateString('hu-HU')}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                {TIER_INFO[analysis.tier].label}
              </span>
              {analysis.visibility === 'public' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  Publikus
                </span>
              )}
              {analysis.visibility === 'pending_approval' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                  Jóváhagyásra vár
                </span>
              )}
              {analysis.visibility === 'rejected' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                  Elutasítva
                </span>
              )}
            </div>
          </div>

          {analysis.visibility === 'rejected' && analysis.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <p className="text-sm text-red-700">
                <strong>Elutasítás indoka:</strong> {analysis.rejection_reason}
              </p>
            </div>
          )}

          {/* Main content grid: result + sidebar */}
          <div className="grid lg:grid-cols-[1fr_280px] gap-8">
            {/* Left: Main content */}
            <div className="space-y-8">
              {/* Hero: Logo + Score */}
              <div className="bg-white rounded-2xl p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {analysis.logo_name}
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                  {analysis.creator_name} &bull; {CATEGORIES[analysis.category] || analysis.category}
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Logo preview */}
                  {logoUrl && (
                    <div className="w-48 h-48 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center p-4">
                      <img
                        src={logoUrl}
                        alt={analysis.logo_name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Score */}
                  <ScoreDisplay
                    score={result.osszpontszam}
                    rating={result.minosites}
                  />
                </div>
              </div>

              {/* Summary - paid only */}
              {isPaid && result.osszegzes && (
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Összegzés</h2>
                  <p className="text-gray-600 leading-relaxed">{result.osszegzes}</p>
                </div>
              )}

              {/* Strengths / Weaknesses - paid only */}
              {isPaid && result.erossegek && result.fejlesztendo && (
                <StrengthsWeaknesses
                  strengths={result.erossegek}
                  weaknesses={result.fejlesztendo}
                />
              )}

              {/* Radar Chart - all tiers */}
              <div className="bg-white rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Szempontonkénti értékelés</h2>
                <RadarChart result={result} />
              </div>

              {/* Criteria cards - scores for all, details for paid */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Részletes pontszámok</h2>
                {(Object.keys(CRITERIA_META) as CriteriaName[]).map((key) => {
                  const score = result.szempontok[key];
                  if (!score) return null;

                  if (isFree) {
                    // Free tier: show score bar only, no expand
                    const meta = CRITERIA_META[key];
                    const percentage = (score.pont / score.maxPont) * 100;
                    return (
                      <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{meta.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900">{meta.displayName}</h3>
                              <span className="font-bold text-gray-900">
                                {score.pont}/{score.maxPont}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentage >= 80 ? 'bg-green-500' :
                                  percentage >= 60 ? 'bg-blue-500' :
                                  percentage >= 40 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <CriteriaCard
                      key={key}
                      criteria={CRITERIA_META[key]}
                      score={score}
                    />
                  );
                })}
              </div>

              {/* Color, Typography, Visual Language - paid only */}
              {isPaid && result.szinek && (
                <ColorAnalysis analysis={result.szinek} />
              )}

              {isPaid && result.tipografia && (
                <TypographyAnalysis analysis={result.tipografia} />
              )}

              {isPaid && result.vizualisNyelv && (
                <VisualLanguageAnalysis analysis={result.vizualisNyelv} />
              )}

              {/* Free tier upsell */}
              {isFree && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Többet szeretnél tudni a logódról?
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    A Zárt elemzés tartalmazza a szöveges indoklást, szín- és tipográfia elemzést,
                    erősségek/fejlesztendő listáját és megosztható linket.
                  </p>
                  <button
                    onClick={() => router.push('/elemzes/uj?tier=paid')}
                    className="px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Részletes elemzés feloldása &mdash; {TIER_INFO.paid.price}
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                {/* Publish to gallery (paid tiers, private only) */}
                {isPaid && analysis.visibility === 'private' && (
                  <button
                    onClick={handleRequestPublish}
                    className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Publikálás a galériába
                  </button>
                )}

                {/* Share link (paid tiers) */}
                {isPaid && analysis.share_hash && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/s/${analysis.share_hash}`;
                      navigator.clipboard.writeText(url);
                      alert('Link másolva!');
                    }}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Megosztási link másolása
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors ml-auto"
                >
                  Törlés
                </button>
              </div>
            </div>

            {/* Right: Sidebar (desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* Logo preview card */}
                {logoUrl && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4 mb-3">
                      <img
                        src={logoUrl}
                        alt={analysis.logo_name}
                        className="max-h-20 max-w-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.osszpontszam}<span className="text-sm font-normal text-gray-400">/100</span>
                      </div>
                      <div className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-700">
                        {result.minosites}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Logo neve</span>
                    <span className="font-medium text-gray-900">{analysis.logo_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Készítő</span>
                    <span className="font-medium text-gray-900">{analysis.creator_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kategória</span>
                    <span className="font-medium text-gray-900">{CATEGORIES[analysis.category] || analysis.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Csomag</span>
                    <span className="font-medium text-gray-900">{TIER_INFO[analysis.tier].label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dátum</span>
                    <span className="font-medium text-gray-900">
                      {new Date(analysis.created_at).toLocaleDateString('hu-HU')}
                    </span>
                  </div>
                </div>

                {/* Share buttons (all tiers) */}
                {isCompleted && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Megosztás</h3>
                    {isFree && analysis.visibility === 'pending_approval' && (
                      <p className="text-xs text-gray-400">Jóváhagyás után lesz elérhető</p>
                    )}
                    {isFree && analysis.visibility === 'rejected' && (
                      <p className="text-xs text-red-400">Az elemzés nem került jóváhagyásra</p>
                    )}
                    <div className="space-y-2">
                      {(isPaid || analysis.visibility === 'public') && (
                        <>
                          <button
                            onClick={() => {
                              let url: string;
                              if (isPaid && analysis.share_hash) {
                                url = `${window.location.origin}/megosztott/${analysis.share_hash}`;
                              } else if (analysis.visibility === 'public') {
                                url = `${window.location.origin}/galeria/${analysis.id}`;
                              } else {
                                url = window.location.href;
                              }
                              navigator.clipboard.writeText(url);
                              alert('Link másolva!');
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            Link másolása
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const shareUrl = isPaid && analysis.share_hash
                                  ? `${window.location.origin}/megosztott/${analysis.share_hash}`
                                  : window.location.href;
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
                              }}
                              className="flex-1 flex items-center justify-center rounded-lg bg-[#1877F2] px-3 py-2 text-sm text-white hover:bg-[#1877F2]/90 transition-colors cursor-pointer"
                            >
                              FB
                            </button>
                            <button
                              onClick={() => {
                                const shareUrl = isPaid && analysis.share_hash
                                  ? `${window.location.origin}/megosztott/${analysis.share_hash}`
                                  : window.location.href;
                                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
                              }}
                              className="flex-1 flex items-center justify-center rounded-lg bg-[#0A66C2] px-3 py-2 text-sm text-white hover:bg-[#0A66C2]/90 transition-colors cursor-pointer"
                            >
                              LI
                            </button>
                            <button
                              onClick={() => {
                                const shareUrl = isPaid && analysis.share_hash
                                  ? `${window.location.origin}/megosztott/${analysis.share_hash}`
                                  : window.location.href;
                                const text = encodeURIComponent(`A logom ${result.osszpontszam}/100 pontot kapott a LogoLab-on!`);
                                window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
                              }}
                              className="flex-1 flex items-center justify-center rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer"
                            >
                              X
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
