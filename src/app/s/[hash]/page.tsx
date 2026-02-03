'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ScoreDisplay } from '@/components/results/ScoreDisplay';
import { RadarChart } from '@/components/results/RadarChart';
import { CriteriaCard } from '@/components/results/CriteriaCard';
import { ColorAnalysis } from '@/components/results/ColorAnalysis';
import { TypographyAnalysis } from '@/components/results/TypographyAnalysis';
import { VisualLanguageAnalysis } from '@/components/results/VisualLanguageAnalysis';
import { StrengthsWeaknesses } from '@/components/results/StrengthsWeaknesses';
import { ResultSkeleton } from '@/components/results/ResultSkeleton';
import { AnalysisResult, CATEGORIES, Category, CRITERIA_META, CriteriaName } from '@/types';

interface SharedAnalysis {
  id: string;
  logo_name: string;
  creator_name: string;
  category: Category;
  logo_original_path: string | null;
  logo_base64: string | null;
  result: AnalysisResult | null;
  created_at: string;
}

export default function SharedAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<SharedAnalysis | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const shareHash = params.hash as string;

  useEffect(() => {
    fetchSharedAnalysis();
  }, [shareHash]);

  const fetchSharedAnalysis = async () => {
    const supabase = getSupabaseBrowserClient();

    // Shared link works for paid analyses with share_hash
    const { data, error } = await (supabase.from('analyses') as any)
      .select('id, logo_name, creator_name, category, logo_original_path, logo_base64, result, created_at')
      .eq('share_hash', shareHash)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      setIsLoading(false);
      return;
    }

    setAnalysis(data);

    if (data.logo_original_path) {
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(data.logo_original_path);
      if (urlData?.publicUrl) setLogoUrl(urlData.publicUrl);
    } else if (data.logo_base64) {
      setLogoUrl(`data:image/png;base64,${data.logo_base64}`);
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return <AppLayout><ResultSkeleton /></AppLayout>;
  }

  if (!analysis || !analysis.result) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">Ez a megosztott elemzes nem talalhato.</p>
            <button onClick={() => router.push('/')} className="text-gray-900 font-medium hover:underline">
              Fooldal
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const result = analysis.result;

  // Shared pages show full paid content
  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Shared badge */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm font-medium text-blue-700">Megosztott elemzes</span>
            </div>
          </div>

          {/* Hero */}
          <div className="bg-white rounded-2xl p-8 text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{analysis.logo_name}</h1>
            <p className="text-gray-500 text-sm mb-6">
              {analysis.creator_name} &bull; {CATEGORIES[analysis.category] || analysis.category}
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {logoUrl && (
                <div className="w-48 h-48 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center p-4">
                  <img src={logoUrl} alt={analysis.logo_name} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <ScoreDisplay score={result.osszpontszam} rating={result.minosites} />
            </div>
          </div>

          {/* Summary */}
          {result.osszegzes && (
            <div className="bg-white rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Osszegzes</h2>
              <p className="text-gray-600 leading-relaxed">{result.osszegzes}</p>
            </div>
          )}

          {/* Strengths / Weaknesses */}
          {result.erossegek && result.fejlesztendo && (
            <div className="mb-8">
              <StrengthsWeaknesses strengths={result.erossegek} weaknesses={result.fejlesztendo} />
            </div>
          )}

          {/* Radar */}
          <div className="bg-white rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Szempontonkenti ertekeles</h2>
            <RadarChart result={result} />
          </div>

          {/* Criteria cards */}
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">Reszletes pontszamok</h2>
            {(Object.keys(CRITERIA_META) as CriteriaName[]).map((key) => {
              const score = result.szempontok[key];
              if (!score) return null;
              return (
                <CriteriaCard key={key} criteria={CRITERIA_META[key]} score={score} />
              );
            })}
          </div>

          {/* Color, Typography, Visual Language */}
          {result.szinek && (
            <div className="mb-8">
              <ColorAnalysis analysis={result.szinek} />
            </div>
          )}
          {result.tipografia && (
            <div className="mb-8">
              <TypographyAnalysis analysis={result.tipografia} />
            </div>
          )}
          {result.vizualisNyelv && (
            <div className="mb-8">
              <VisualLanguageAnalysis analysis={result.vizualisNyelv} />
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Teszteld a sajat logodat is!
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Keszits ingyenes elemzest vagy rendelj reszletes, szoveges erteketest.
            </p>
            <button
              onClick={() => router.push('/dashboard/uj')}
              className="px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors"
            >
              Logo elemzes inditasa
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
