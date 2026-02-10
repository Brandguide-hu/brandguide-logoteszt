'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Stars01 } from '@untitledui/icons';
import { TransparentVideo } from '@/components/TransparentVideo';
import { ResultSkeleton } from '@/components/results';

// Loading messages that cycle during analysis
const LOADING_MESSAGES = {
  vision: [
    'Színek azonosítása...',
    'Formák felismerése...',
    'Tipográfia elemzése...',
    'Elrendezés vizsgálata...',
    'Technikai részletek...',
    'Stílus meghatározása...',
  ],
  scoring: [
    'Megkülönböztethetőség vizsgálata...',
    'Egyszerűség elemzése...',
    'Alkalmazhatóság tesztelése...',
    'Emlékezetesség felmérése...',
    'Időtállóság értékelése...',
    'Univerzalitás ellenőrzése...',
    'Láthatóság vizsgálata...',
    'Erősségek összegyűjtése...',
    'Fejlesztendő területek azonosítása...',
  ],
  colors: [
    'Színpaletta elemzése...',
    'Színharmónia vizsgálata...',
    'Színpszichológia értékelése...',
    'Technikai reprodukálhatóság...',
  ],
  typography: [
    'Betűtípus karakter vizsgálata...',
    'Olvashatóság elemzése...',
    'Tipográfiai illeszkedés...',
  ],
  visual: [
    'Formai elemek elemzése...',
    'Arculati elemek vizsgálata...',
    'Stílusegység értékelése...',
  ],
  processing: [
    'Eredmények feldolgozása...',
    'Pontszámok kiszámítása...',
    'Értékelés véglegesítése...',
  ],
};

// Direct brandguideAI pipeline phases
type Phase = 'start' | 'vision' | 'analysis' | 'brandguide_analysis' | 'comparing' | 'processing' | 'visual' | 'saving' | 'complete';

const phaseProgress: Record<Phase, number> = {
  start: 5,
  vision: 15,
  analysis: 30,  // Az API ezt küldi
  brandguide_analysis: 30,
  comparing: 50,
  processing: 70,
  visual: 85,
  saving: 95,
  complete: 100,
};

const phaseLabels: Record<Phase, string> = {
  start: 'Indítás',
  vision: 'Kép feldolgozás',
  analysis: 'Pontozás',  // Az API ezt küldi
  brandguide_analysis: 'Pontozás',
  comparing: 'Színek',
  processing: 'Tipográfia',
  visual: 'Vizuális nyelv',
  saving: 'Mentés',
  complete: 'Kész',
};

// Phase steps for the progress indicator
const phaseSteps: Phase[] = ['vision', 'brandguide_analysis', 'comparing', 'processing', 'visual', 'saving'];

function FeldolgozasContent() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoThumbnail, setLogoThumbnail] = useState<string | null>(null);

  // Streaming state
  const [streamingPhase, setStreamingPhase] = useState<Phase>('start');
  const [streamingText, setStreamingText] = useState('');
  const [cyclingMessage, setCyclingMessage] = useState('');
  const [displayedMessage, setDisplayedMessage] = useState('');

  // Cycle through loading messages based on current phase
  useEffect(() => {
    if (!isStarted || streamingPhase === 'complete') return;

    let messages: string[] = [];
    if (streamingPhase === 'start' || streamingPhase === 'vision') {
      messages = LOADING_MESSAGES.vision;
    } else if (streamingPhase === 'brandguide_analysis' || streamingPhase === 'analysis') {
      messages = LOADING_MESSAGES.scoring;
    } else if (streamingPhase === 'comparing') {
      messages = LOADING_MESSAGES.colors;
    } else if (streamingPhase === 'processing') {
      messages = LOADING_MESSAGES.typography;
    } else if (streamingPhase === 'visual') {
      messages = LOADING_MESSAGES.visual;
    } else if (streamingPhase === 'saving') {
      messages = LOADING_MESSAGES.processing;
    }

    if (messages.length === 0) return;

    let index = 0;
    setCyclingMessage(messages[0]);

    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setCyclingMessage(messages[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isStarted, streamingPhase]);

  // Typewriter effect for cycling message
  useEffect(() => {
    if (!cyclingMessage) {
      setDisplayedMessage('');
      return;
    }

    setDisplayedMessage('');
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      if (charIndex < cyclingMessage.length) {
        setDisplayedMessage(cyclingMessage.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 40);

    return () => clearInterval(typeInterval);
  }, [cyclingMessage]);

  // SSE Stream kezelés - a régi teszt oldal logikája
  const runAnalysisWithSSE = useCallback(async (logo: string, mediaType: string) => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logo,
        mediaType,
        testLevel: 'detailed',
        analysisId, // Így a backend UPDATE-eli a meglévő rekordot
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba történt az elemzés során');
      }
      throw new Error('Hiba történt az elemzés során');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Nem sikerült olvasni a választ');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);

            switch (currentEvent) {
              case 'status':
                setStreamingPhase(parsed.phase as Phase);
                break;
              case 'chunk':
                setStreamingText((prev) => prev + parsed.text);
                break;
              case 'complete':
                setStreamingPhase('complete');
                // Redirect az eredmény oldalra
                setTimeout(() => {
                  router.push(`/eredmeny/${analysisId}`);
                }, 800);
                return;
              case 'error':
                throw new Error(parsed.message || 'Hiba történt');
            }
          } catch {
            // JSON parse error, skip
          }
        }
      }
    }
  }, [analysisId, router]);

  // Analysis adatok lekérése és elemzés indítása
  const startAnalysis = useCallback(async () => {
    if (isStarted) return;
    setIsStarted(true);

    try {
      // Először lekérjük az analysis adatokat a DB-ből
      const infoRes = await fetch(`/api/result/${analysisId}`);
      if (!infoRes.ok) {
        throw new Error('Az elemzés nem található');
      }

      const analysisData = await infoRes.json();

      // Ha már completed, egyből redirect
      if (analysisData.status === 'completed' && analysisData.result && Object.keys(analysisData.result).length > 0) {
        router.push(`/eredmeny/${analysisId}`);
        return;
      }

      // Logó thumbnail beállítása
      if (analysisData.logo_thumbnail_path) {
        const thumbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${analysisData.logo_thumbnail_path}`;
        setLogoThumbnail(thumbUrl);
      }

      // Ha processing ÉS VAN eredmény (valóban fut), akkor polling amíg kész lesz
      if (analysisData.status === 'processing' && analysisData.result && Object.keys(analysisData.result).length > 0) {
        setStreamingPhase('brandguide_analysis');

        const pollInterval = setInterval(async () => {
          const pollRes = await fetch(`/api/result/${analysisId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === 'completed') {
              clearInterval(pollInterval);
              setStreamingPhase('complete');
              setTimeout(() => {
                router.push(`/eredmeny/${analysisId}`);
              }, 500);
            }
          }
        }, 2000);

        return;
      }

      // Ha pending VAGY processing stuck (üres result), indítsuk az SSE streaming elemzést
      if ((analysisData.status === 'pending' || analysisData.status === 'processing') && analysisData.logo_base64) {
        // Determine media type from the base64 or default to png
        let mediaType = 'image/png';
        if (analysisData.logo_original_path) {
          const ext = analysisData.logo_original_path.split('.').pop()?.toLowerCase();
          if (ext === 'jpg' || ext === 'jpeg') mediaType = 'image/jpeg';
          else if (ext === 'webp') mediaType = 'image/webp';
        }

        // SSE streaming elemzés indítása - mint a régi teszt oldalon
        await runAnalysisWithSSE(analysisData.logo_base64, mediaType);
        return;
      }

      // Ha nincs logo_base64, próbáljuk a start endpoint-ot (fallback)
      const startRes = await fetch(`/api/analysis/${analysisId}/start`, {
        method: 'POST',
      });

      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || 'Nem sikerült elindítani az elemzést');
      }

      // Polling amíg az elemzés elkészül
      setStreamingPhase('brandguide_analysis');

      const pollInterval = setInterval(async () => {
        const pollRes = await fetch(`/api/result/${analysisId}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            setStreamingPhase('complete');
            setTimeout(() => {
              router.push(`/eredmeny/${analysisId}`);
            }, 500);
          }
        }
      }, 2000);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
    }
  }, [analysisId, isStarted, router, runAnalysisWithSSE]);

  // Automatikus indítás
  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  // Loading state
  const currentProgress = phaseProgress[streamingPhase] ?? 0;
  const currentLabel = phaseLabels[streamingPhase] ?? streamingPhase;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Hiba történt</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => router.push('/elemzes/uj')}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Újra próbálom
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background: Result page skeleton */}
      <div className="pointer-events-none opacity-50">
        <ResultSkeleton />
      </div>

      {/* Overlay with dark card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        {/* Dark card container */}
        <div className="w-full max-w-lg rounded-3xl bg-gray-900 p-8 text-center shadow-2xl mx-4">
          {/* SCORE Animation at top */}
          <div className="mb-6 flex justify-center">
            <TransparentVideo
              src="/score-animation.webm"
              maxSize={200}
              threshold={40}
            />
          </div>

          {/* Logo preview - smaller, below animation */}
          {logoThumbnail && (
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 p-3">
              <img
                src={logoThumbnail}
                alt="Logo"
                className="max-h-full max-w-full object-contain opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
              />
            </div>
          )}

          {/* brandguideAI indicator */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1">
            <Stars01 className="size-3.5 text-[#fff012]" />
            <span className="text-xs font-medium text-gray-300">brandguideAI elemzés</span>
          </div>

          {/* Status text with cycling message */}
          <div className="mb-6">
            {streamingPhase !== 'complete' && (
              <p className="h-6 text-lg font-medium text-white">
                {displayedMessage}
                {displayedMessage && <span className="inline-block w-0.5 h-5 ml-0.5 bg-[#fff012] animate-pulse align-middle" />}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full bg-[#fff012] transition-all duration-500 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>{currentProgress}%</span>
              <span>{currentLabel}</span>
            </div>
          </div>

          {/* Phase steps - equal spacing with flex-1 */}
          <div className="flex justify-between">
            {phaseSteps.map((phase, index) => {
              const isActive = streamingPhase === phase;
              const stepProgress = phaseProgress[phase] ?? 0;
              const isComplete = currentProgress > stepProgress;
              const stepLabel = phaseLabels[phase] ?? phase;

              const getStepColors = () => {
                if (isComplete) return 'bg-[#fff012] text-gray-900';
                if (isActive) return 'bg-white text-gray-900';
                return 'bg-gray-800 text-gray-500';
              };

              return (
                <div key={phase} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${getStepColors()}`}
                  >
                    {isComplete ? <CheckCircle className="size-4" /> : index + 1}
                  </div>
                  <span className={`text-center text-[10px] leading-tight ${isActive ? 'font-medium text-gray-300' : 'text-gray-500'}`}>
                    {stepLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Streaming preview */}
          {streamingText && (
            <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800/50 p-4 text-left">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
                Előnézet
              </p>
              <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-gray-400">
                {streamingText.slice(0, 300)}
                {streamingText.length > 300 && '...'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function FeldolgozasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    }>
      <FeldolgozasContent />
    </Suspense>
  );
}
