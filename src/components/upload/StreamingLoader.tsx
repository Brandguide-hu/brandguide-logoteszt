'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Brain, Database, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingLoaderProps {
  status: string;
  phase: 'start' | 'analyzing' | 'processing' | 'saving' | 'complete';
  streamingText: string;
}

// Arculat és logótervezéshez kapcsolódó kifejezések
const designPhrases = [
  'Vizuális egyensúly elemzése',
  'Színharmónia vizsgálata',
  'Tipográfiai hierarchia',
  'Negatív tér használata',
  'Formai egyszerűség',
  'Méretarányok ellenőrzése',
  'Kontrasztok értékelése',
  'Márkaidentitás',
  'Felismerhetőség',
  'Időtálló design',
  'Skálázhatóság',
  'Alkalmazhatóság',
  'Egyediség vizsgálata',
  'Releváns szimbólumok',
  'Célcsoport illeszkedés',
  'Professzionális megjelenés',
  'Vizuális konzisztencia',
  'Olvashatóság',
  'Memorizálhatóság',
  'Márkaértékek tükrözése',
  'Geometriai pontosság',
  'Optikai korrekciók',
  'Karakteres vonalvezetés',
  'Harmonikus kompozíció',
];

const phases = [
  { id: 'start', label: 'Elemzés indítása', icon: Sparkles },
  { id: 'analyzing', label: 'Brandguide elemzi a logót', icon: Brain },
  { id: 'processing', label: 'Eredmények feldolgozása', icon: Loader2 },
  { id: 'saving', label: 'Mentés adatbázisba', icon: Database },
  { id: 'complete', label: 'Kész!', icon: CheckCircle },
];

export function StreamingLoader({ status, phase }: Omit<StreamingLoaderProps, 'streamingText'> & { streamingText?: string }) {
  const [dots, setDots] = useState('');
  const [currentPhrase, setCurrentPhrase] = useState(designPhrases[0]);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (phase === 'complete') return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  // Rotate through design phrases during analysis
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => {
        const next = (prev + 1) % designPhrases.length;
        setCurrentPhrase(designPhrases[next]);
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [phase]);

  const currentPhaseIndex = phases.findIndex((p) => p.id === phase);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center justify-between mb-8">
        {phases.slice(0, -1).map((p, index) => {
          const isActive = index === currentPhaseIndex;
          const isComplete = index < currentPhaseIndex;
          const Icon = p.icon;

          return (
            <div key={p.id} className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                  isComplete
                    ? 'bg-success text-white'
                    : isActive
                    ? 'bg-accent-yellow text-white'
                    : 'bg-bg-tertiary text-text-muted'
                )}
              >
                {isComplete ? (
                  <CheckCircle className="w-6 h-6" />
                ) : isActive ? (
                  <Icon className="w-6 h-6 animate-pulse" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 text-center',
                  isActive ? 'text-accent-yellow font-medium' : 'text-text-muted'
                )}
              >
                {p.label}
              </span>
              {index < phases.length - 2 && (
                <div
                  className={cn(
                    'absolute h-0.5 w-full top-6 left-1/2',
                    isComplete ? 'bg-success' : 'bg-bg-tertiary'
                  )}
                  style={{ width: 'calc(100% - 3rem)', marginLeft: '1.5rem' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Main status display */}
      <div className="bg-bg-primary rounded-2xl border border-bg-tertiary p-8 text-center shadow-sm">
        <div className="w-20 h-20 bg-highlight-yellow rounded-full flex items-center justify-center mx-auto mb-6">
          {phase === 'complete' ? (
            <CheckCircle className="w-10 h-10 text-success" />
          ) : (
            <Brain className="w-10 h-10 text-accent-yellow animate-pulse" />
          )}
        </div>

        <h3 className="text-xl font-semibold text-text-primary mb-2">
          {status}
          {phase !== 'complete' && <span className="text-accent-yellow">{dots}</span>}
        </h3>

        <p className="text-text-secondary text-sm mb-6">
          {phase === 'analyzing'
            ? 'A mesterséges intelligencia elemzi a logódat a 7 szempont szerint.'
            : phase === 'processing'
            ? 'Az elemzés feldolgozása és pontszámok számítása.'
            : phase === 'saving'
            ? 'Az eredmények mentése, hogy később is elérd.'
            : 'Kérlek várj...'}
        </p>

        {/* Design phrases animation */}
        {phase === 'analyzing' && (
          <div className="bg-bg-secondary rounded-lg p-6">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="w-5 h-5 text-accent-yellow animate-pulse" />
              <span
                key={phraseIndex}
                className="text-lg font-medium text-text-primary animate-fade-in"
              >
                {currentPhrase}
              </span>
              <span className="inline-block w-2 h-5 bg-accent-yellow animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {/* Tips while waiting */}
        {phase === 'start' && (
          <div className="bg-highlight-yellow rounded-lg p-4 text-left">
            <p className="text-sm text-text-primary">
              <strong>Tudtad?</strong> A Brandguide 100 pontos rendszere Paul Rand, a 20. század
              egyik legnevesebb grafikus tervezőjének 7 szempontját alapul véve készült.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
