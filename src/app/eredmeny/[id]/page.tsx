'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AnalysisResult, CRITERIA_META, CriteriaName } from '@/types';
import { Button, Card, CardContent } from '@/components/ui';
import {
  ScoreDisplay,
  RadarChart,
  CriteriaCard,
  StrengthsWeaknesses,
  ColorAnalysis,
  TypographyAnalysis,
} from '@/components/results';
import { ArrowRight, RefreshCw, Share2, Loader2 } from 'lucide-react';

export default function ResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        const { data, error: dbError } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) throw dbError;
        if (!data) throw new Error('Eredmény nem található');

        setResult(data.result as unknown as AnalysisResult);
        setLogoUrl(`data:image/png;base64,${data.logo_base64}`);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Nem sikerült betölteni az eredményt');
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Logóteszt eredményem',
          text: `A logóm ${result?.osszpontszam}/100 pontot kapott a Brandguide Logóteszten!`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link másolva a vágólapra!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-yellow animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Eredmény betöltése...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="py-8">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {error || 'Eredmény nem található'}
            </h2>
            <p className="text-text-secondary mb-6">
              Lehet, hogy az elemzés már nem elérhető, vagy hibás a link.
            </p>
            <Link href="/teszt">
              <Button>
                <RefreshCw className="w-4 h-4 mr-2" />
                Új teszt indítása
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary py-8 md:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Elemzési eredmény
          </h1>
          <p className="text-text-secondary">
            A logód részletes értékelése a Brandguide 100 rendszer alapján
          </p>
        </div>

        {/* Main Score Section */}
        <Card className="mb-8">
          <CardContent className="py-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Logo preview */}
              <div className="flex justify-center">
                {logoUrl && (
                  <div className="bg-bg-secondary rounded-2xl p-8 max-w-xs">
                    <img
                      src={logoUrl}
                      alt="Feltöltött logó"
                      className="max-w-full max-h-48 object-contain mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="flex justify-center">
                <ScoreDisplay score={result.osszpontszam} rating={result.minosites} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-8">
          <CardContent>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Összefoglaló</h2>
            <p className="text-text-secondary leading-relaxed">{result.osszegzes}</p>
          </CardContent>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="mb-8">
          <StrengthsWeaknesses
            strengths={result.erossegek}
            weaknesses={result.fejlesztendo}
          />
        </div>

        {/* Radar Chart */}
        <Card className="mb-8">
          <CardContent>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Szempontok áttekintése
            </h2>
            <RadarChart result={result} />
          </CardContent>
        </Card>

        {/* Criteria Details */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Részletes értékelés
          </h2>
          <div className="space-y-3">
            {Object.entries(result.szempontok).map(([key, value]) => {
              const criteriaKey = key as CriteriaName;
              const meta = CRITERIA_META[criteriaKey];
              if (!meta) return null;
              return (
                <CriteriaCard
                  key={key}
                  criteria={meta}
                  score={value}
                />
              );
            })}
          </div>
        </div>

        {/* Color & Typography Analysis (if detailed test) */}
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Eredmény megosztása
          </Button>
          <Link href="/teszt">
            <Button variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Új teszt
            </Button>
          </Link>
        </div>

        {/* CTA */}
        <Card className="bg-text-primary text-white">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-3">
              Szeretnéd továbbfejleszteni a brandodat?
            </h2>
            <p className="text-gray-300 mb-6 max-w-xl mx-auto">
              A Brandguide/AI segít kidolgozni a teljes brand alapjaidat – a stratégiától
              a vizuális rendszerig.
            </p>
            <a href="https://brandguide.hu" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-accent-yellow hover:bg-accent-yellow-hover">
                Ismerkedj meg a Brandguide/AI-jal
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
