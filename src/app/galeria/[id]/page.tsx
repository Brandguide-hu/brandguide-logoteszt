'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ScoreDisplay } from '@/components/results/ScoreDisplay';
import { RadarChart } from '@/components/results/RadarChart';
import { ResultSkeleton } from '@/components/results/ResultSkeleton';
import { AnalysisResult, CATEGORIES, Category, CRITERIA_META, CriteriaName } from '@/types';

interface PublicAnalysis {
  id: string;
  logo_name: string;
  creator_name: string;
  category: Category;
  logo_thumbnail_path: string | null;
  logo_original_path: string | null;
  logo_base64: string | null;
  result: AnalysisResult | null;
  is_weekly_winner: boolean;
  created_at: string;
}

export default function GaleriaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<PublicAnalysis | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const analysisId = params.id as string;

  useEffect(() => {
    fetchAnalysis();
  }, [analysisId]);

  const fetchAnalysis = async () => {
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await (supabase.from('analyses') as any)
      .select('id, logo_name, creator_name, category, logo_thumbnail_path, logo_original_path, logo_base64, result, is_weekly_winner, created_at')
      .eq('id', analysisId)
      .eq('visibility', 'public')
      .eq('status', 'completed')
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      setIsLoading(false);
      return;
    }

    setAnalysis(data);

    // Logo URL
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
            <p className="text-gray-500 text-lg mb-4">Ez az elemzés nem található vagy nem publikus.</p>
            <button onClick={() => router.push('/galeria')} className="text-gray-900 font-medium hover:underline">
              Vissza a galeriahoz
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const result = analysis.result;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back */}
          <button
            onClick={() => router.push('/galeria')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-8"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Galeria
          </button>

          {/* Hero */}
          <div className="bg-white rounded-2xl p-8 text-center mb-8">
            {analysis.is_weekly_winner && (
              <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-1.5 mb-4">
                <span>🏆</span>
                <span className="text-sm font-semibold text-yellow-800">A hét logója</span>
              </div>
            )}

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

          {/* Radar Chart */}
          <div className="bg-white rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Szempontonkénti értékelés</h2>
            <RadarChart result={result} />
          </div>

          {/* Score bars (free-tier style, no details) */}
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">Pontszámok</h2>
            {(Object.keys(CRITERIA_META) as CriteriaName[]).map((key) => {
              const score = result.szempontok[key];
              if (!score) return null;
              const meta = CRITERIA_META[key];
              const percentage = (score.pont / score.maxPont) * 100;

              return (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{meta.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">{meta.displayName}</h3>
                        <span className="font-bold text-gray-900">{score.pont}/{score.maxPont}</span>
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
            })}
          </div>

          {/* CTA for own analysis */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Teszteld a saját logódat is!
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Készíts ingyenes elemzést vagy rendelj részletes, szöveges értékelést.
            </p>
            <button
              onClick={() => router.push('/dashboard/uj')}
              className="px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors"
            >
              Logo elemzés indítása
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
