'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { AnalysisResult, CRITERIA_META, CriteriaName, CATEGORIES, Category, TIER_INFO, Tier } from '@/types';

interface SharedAnalysisData {
  id: string;
  tier: Tier;
  status: string;
  logo_name: string;
  creator_name: string | null;
  category: Category | null;
  logo_original_path: string | null;
  logo_base64: string | null;
  result: AnalysisResult | null;
  created_at: string;
}

export default function SharedAnalysisPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [analysis, setAnalysis] = useState<SharedAnalysisData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hash) fetchSharedAnalysis();
  }, [hash]);

  const fetchSharedAnalysis = async () => {
    const supabase = getSupabaseBrowserClient();

    const { data, error: fetchError } = await (supabase.from('analyses') as any)
      .select('id, tier, status, logo_name, creator_name, category, logo_original_path, logo_base64, result, created_at')
      .eq('share_hash', hash)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) {
      setError('Az elemzés nem található vagy a link érvénytelen.');
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

  if (isLoading) {
    return (
      <AppLayout>
        <ResultSkeleton />
      </AppLayout>
    );
  }

  if (error || !analysis || !analysis.result) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">{error || 'Az elemzés nem található.'}</p>
            <a href="/" className="text-gray-900 font-medium hover:underline">
              Vissza a főoldalra
            </a>
          </div>
        </div>
      </AppLayout>
    );
  }

  const result = analysis.result;
  const isPaid = analysis.tier === 'paid' || analysis.tier === 'consultation';

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Shared badge */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-sm text-blue-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Megosztott elemzés
            </span>
          </div>

          {/* Hero: Logo + Score */}
          <div className="bg-white rounded-2xl p-8 text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {analysis.logo_name}
            </h1>
            {(analysis.creator_name || analysis.category) && (
              <p className="text-gray-500 text-sm mb-6">
                {analysis.creator_name}{analysis.creator_name && analysis.category ? ' \u2022 ' : ''}
                {analysis.category ? CATEGORIES[analysis.category] || analysis.category : ''}
              </p>
            )}

            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {logoUrl && (
                <div className="w-48 h-48 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center p-4">
                  <img
                    src={logoUrl}
                    alt={analysis.logo_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <ScoreDisplay score={result.osszpontszam} rating={result.minosites} />
            </div>

            <p className="text-xs text-gray-400 mt-6">
              Elemezve: {new Date(analysis.created_at).toLocaleDateString('hu-HU')} &bull; {TIER_INFO[analysis.tier].label}
            </p>
          </div>

          {/* Summary - paid only */}
          {isPaid && result.osszegzes && (
            <div className="bg-white rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Összegzés</h2>
              <p className="text-gray-600 leading-relaxed">{result.osszegzes}</p>
            </div>
          )}

          {/* Strengths / Weaknesses - paid only */}
          {isPaid && result.erossegek && result.fejlesztendo && (
            <div className="mb-8">
              <StrengthsWeaknesses
                strengths={result.erossegek}
                weaknesses={result.fejlesztendo}
              />
            </div>
          )}

          {/* Radar Chart */}
          <div className="bg-white rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Szempontonkénti értékelés</h2>
            <RadarChart result={result} />
          </div>

          {/* Criteria cards */}
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">Részletes pontszámok</h2>
            {(Object.keys(CRITERIA_META) as CriteriaName[]).map((key) => {
              const score = result.szempontok[key];
              if (!score) return null;

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
            <div className="mb-8">
              <ColorAnalysis analysis={result.szinek} />
            </div>
          )}

          {isPaid && result.tipografia && (
            <div className="mb-8">
              <TypographyAnalysis analysis={result.tipografia} />
            </div>
          )}

          {isPaid && result.vizualisNyelv && (
            <div className="mb-8">
              <VisualLanguageAnalysis analysis={result.vizualisNyelv} />
            </div>
          )}

          {/* CTA */}
          <div className="text-center py-8 border-t border-gray-200">
            <p className="text-gray-500 mb-4">Szeretnéd te is elemeztetni a logódat?</p>
            <a
              href="/elemzes/uj"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors"
            >
              Saját logó elemzése
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
