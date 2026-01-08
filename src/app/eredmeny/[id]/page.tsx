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
import { ArrowRight, RefreshCw, Copy, Check, Loader2 } from 'lucide-react';

export default function ResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  };

  const getShareText = () => {
    return `A logóm ${result?.osszpontszam}/100 pontot kapott a Brandguide Logóteszten!`;
  };

  const handleCopyUrl = async () => {
    const url = getShareUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(getShareText());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
  };

  const handleShareX = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
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

        {/* Share Actions */}
        <Card className="mb-8">
          <CardContent>
            <h2 className="text-xl font-semibold text-text-primary mb-4 text-center">
              Eredmény megosztása
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Copy URL */}
              <Button variant="outline" onClick={handleCopyUrl} className="min-w-[140px]">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Másolva!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Link másolása
                  </>
                )}
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                onClick={handleShareFacebook}
                className="min-w-[140px] hover:bg-[#1877f2] hover:text-white hover:border-[#1877f2]"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>

              {/* LinkedIn */}
              <Button
                variant="outline"
                onClick={handleShareLinkedIn}
                className="min-w-[140px] hover:bg-[#0a66c2] hover:text-white hover:border-[#0a66c2]"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </Button>

              {/* X (Twitter) */}
              <Button
                variant="outline"
                onClick={handleShareX}
                className="min-w-[140px] hover:bg-black hover:text-white hover:border-black"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* New Test Button */}
        <div className="flex justify-center mb-8">
          <Link href="/teszt">
            <Button variant="secondary" size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Új teszt indítása
            </Button>
          </Link>
        </div>

        {/* CTA */}
        <Card className="bg-text-primary text-white">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-3">
              Szeretnéd továbbfejleszteni a brandedet?
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
