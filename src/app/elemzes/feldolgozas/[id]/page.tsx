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
  comparing: 70,
  processing: 85,
  visual: 92,
  saving: 97,
  complete: 100,
};

const phaseLabels: Record<Phase, string> = {
  start: 'Indítás',
  vision: 'Kép elemzés',
  analysis: 'Pontozás',
  brandguide_analysis: 'Pontozás',
  comparing: 'Feldolgozás',
  processing: 'Részletek',
  visual: 'Vizuális elemzés',
  saving: 'Mentés',
  complete: 'Kész',
};

// Vizuális lépések — 5 lépés amit a user lát (ezek a "fake" közbülső állomások)
const phaseSteps: Phase[] = ['vision', 'brandguide_analysis', 'comparing', 'processing', 'saving'];

// A hosszú várakozás (30–70%) alatt megjelenő al-fázis üzenetek
const ANALYSIS_SUBSTEPS = [
  { pct: 30, label: 'Megkülönböztethetőség vizsgálata...' },
  { pct: 36, label: 'Egyszerűség elemzése...' },
  { pct: 42, label: 'Alkalmazhatóság tesztelése...' },
  { pct: 48, label: 'Emlékezetesség felmérése...' },
  { pct: 54, label: 'Időtállóság értékelése...' },
  { pct: 60, label: 'Univerzalitás ellenőrzése...' },
  { pct: 65, label: 'Láthatóság vizsgálata...' },
  { pct: 72, label: 'Vizuális elemzés készítése...' },
  { pct: 80, label: 'Színvakság szimulációk...' },
];

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

  // Debug state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [phaseStartTime, setPhaseStartTime] = useState<Record<string, number>>({});
  const addDebugLog = (msg: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    console.log(`[DEBUG ${ts}] ${msg}`);
    setDebugLogs(prev => [...prev.slice(-99), `[${ts}] ${msg}`]);
  };

  // Animált progress: a 30–70% közötti hosszú várakozásnál lassan auto-növekszik
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedSubLabel, setAnimatedSubLabel] = useState('');

  useEffect(() => {
    const baseProgress = phaseProgress[streamingPhase] ?? 0;
    // Ha elértük a valós phase progress-t, egyből ugrik
    if (streamingPhase !== 'analysis' && streamingPhase !== 'brandguide_analysis') {
      setAnimatedProgress(baseProgress);
      return;
    }

    // analysis fázisban: 30-tól lassan 68%-ig auto-növekszik (~75mp alatt)
    // 75mp / (68-30) = ~2s / 1%
    setAnimatedProgress(30);
    let current = 30;
    const interval = setInterval(() => {
      if (current < 68) {
        current += 1;
        setAnimatedProgress(current);
        // Keressük a legközelebbi substep üzenetet
        const step = [...ANALYSIS_SUBSTEPS].reverse().find(s => current >= s.pct);
        if (step) setAnimatedSubLabel(step.label);
      } else {
        clearInterval(interval);
      }
    }, 2000); // 2 másodpercenként +1% → 38 lépés = ~76mp

    return () => clearInterval(interval);
  }, [streamingPhase]);

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

  // Polling fallback: ha az SSE stream lezárul 'complete' event nélkül,
  // a backend function tovább fut a háttérben → pollingolunk amíg kész
  const startPollingFallback = useCallback(() => {
    addDebugLog('Polling fallback mód: SSE megszakadt, DB-t pollozom...');
    setStreamingPhase('brandguide_analysis');

    const pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/result/${analysisId}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          addDebugLog(`Poll: status=${pollData.status}`);
          if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            addDebugLog('Poll: KÉSZ! Redirect...');
            setStreamingPhase('complete');
            setTimeout(() => {
              router.push(`/eredmeny/${analysisId}`);
            }, 500);
          } else if (pollData.status === 'failed' || pollData.status === 'error') {
            clearInterval(pollInterval);
            addDebugLog(`Poll: HIBA! status=${pollData.status}`);
            setError('Az elemzés során hiba történt. Kérlek próbáld újra.');
          }
        }
      } catch {
        // hálózati hiba, következő iterációban újra
      }
    }, 3000);

    // Max 5 percig pollingolunk (100 * 3s)
    setTimeout(() => {
      clearInterval(pollInterval);
      addDebugLog('Poll timeout: 5 perc eltelt, megállok.');
    }, 300000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, router]);

  // SSE Stream kezelés - Light tier (egyetlen KB-Extract hívás)
  const runLightAnalysisWithSSE = useCallback(async () => {
    addDebugLog(`Light SSE indítás: analysisId=${analysisId}`);

    const response = await fetch('/api/analyze/light', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId }),
    });

    addDebugLog(`HTTP válasz: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba történt az elemzés során');
      }
      throw new Error('Hiba történt az elemzés során');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Nem sikerült olvasni a választ');

    addDebugLog('Light SSE stream megnyílt...');

    const decoder = new TextDecoder();
    let buffer = '';
    let lastEventTime = Date.now();
    let completed = false;

    const watchdogTimeout = setTimeout(() => {
      const elapsed = Math.round((Date.now() - lastEventTime) / 1000);
      addDebugLog(`WATCHDOG: ${elapsed}s óta nem jött adat! Polling fallback-re váltok.`);
      reader.cancel();
    }, 150000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { addDebugLog('Light SSE stream lezárva'); break; }

        lastEventTime = Date.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith(': ')) {
            addDebugLog('Heartbeat érkezett');
          } else if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (currentEvent) {
                case 'status':
                  addDebugLog(`Phase: ${parsed.phase} | "${parsed.message}"`);
                  setStreamingPhase(parsed.phase as Phase);
                  setPhaseStartTime(prev => ({ ...prev, [parsed.phase]: Date.now() }));
                  break;
                case 'debug':
                  addDebugLog(`[backend] ${parsed.message}`);
                  break;
                case 'complete':
                  addDebugLog(`KÉSZ! id=${parsed.id}`);
                  clearTimeout(watchdogTimeout);
                  completed = true;
                  setStreamingPhase('complete');
                  setTimeout(() => { router.push(`/eredmeny/${analysisId}`); }, 800);
                  return;
                case 'error':
                  addDebugLog(`HIBA: ${parsed.message}`);
                  clearTimeout(watchdogTimeout);
                  throw new Error(parsed.message || 'Hiba történt');
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Hiba történt') {
                addDebugLog(`JSON parse hiba: ${parseErr.message}`);
              } else { throw parseErr; }
            }
          }
        }
      }
    } finally {
      clearTimeout(watchdogTimeout);
    }

    if (!completed) startPollingFallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, router, startPollingFallback]);

  // SSE Stream kezelés - MAX tier
  // Vision SSE (~22s, <60s limit) → Background function trigger → Polling
  // A scoring+summary Netlify background function-ben fut (15 perc limit)
  const runAnalysisWithSSE = useCallback(async (logo: string, mediaType: string, tier?: string, brief?: string | null) => {
    addDebugLog(`MAX SSE indítás (vision+background): analysisId=${analysisId}, mediaType=${mediaType}, tier=${tier}`);

    // ========================================
    // STEP 1: Vision SSE (~22s) — szinkron, <60s
    // ========================================
    addDebugLog('Step 1/2: Vision...');
    setStreamingPhase('vision');
    setPhaseStartTime(prev => ({ ...prev, vision: Date.now() }));

    const visionResponse = await fetch('/api/analyze/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo, mediaType, brief }),
    });

    addDebugLog(`Vision HTTP: ${visionResponse.status}`);
    if (!visionResponse.ok) {
      const ct = visionResponse.headers.get('content-type');
      if (ct?.includes('application/json')) {
        const err = await visionResponse.json();
        throw new Error(err.error || 'Vision hiba');
      }
      throw new Error('Vision hiba');
    }

    // SSE stream olvasás a Vision-höz
    const reader = visionResponse.body?.getReader();
    if (!reader) throw new Error('Nem sikerült olvasni a választ');

    addDebugLog('Vision SSE stream megnyílt...');
    const decoder = new TextDecoder();
    let buffer = '';
    let lastEventTime = Date.now();
    let visionDescription = '';
    let visionCompleted = false;

    const watchdogTimeout = setTimeout(() => {
      const elapsed = Math.round((Date.now() - lastEventTime) / 1000);
      addDebugLog(`WATCHDOG (Vision): ${elapsed}s óta nem jött adat!`);
      reader.cancel();
    }, 65000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { addDebugLog('Vision stream lezárva'); break; }

        lastEventTime = Date.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith(': ') || line === '') continue;
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (currentEvent) {
                case 'status':
                  addDebugLog(`Phase: ${parsed.phase} | "${parsed.message}"`);
                  setStreamingPhase(parsed.phase as Phase);
                  setPhaseStartTime(prev => ({ ...prev, [parsed.phase]: Date.now() }));
                  break;
                case 'debug':
                  addDebugLog(`[backend] ${parsed.message}`);
                  break;
                case 'complete':
                  visionDescription = parsed.visionDescription || '';
                  visionCompleted = true;
                  addDebugLog(`Vision KÉSZ! Leírás: ${visionDescription.length} kar`);
                  clearTimeout(watchdogTimeout);
                  break;
                case 'error':
                  addDebugLog(`Vision HIBA: ${parsed.message}`);
                  clearTimeout(watchdogTimeout);
                  throw new Error(parsed.message || 'Vision hiba');
                case 'heartbeat':
                  break;
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Vision hiba') {
                addDebugLog(`JSON parse hiba: ${(parseErr as Error).message}`);
              } else { throw parseErr; }
            }
          }
        }
        if (visionCompleted) break;
      }
    } finally {
      clearTimeout(watchdogTimeout);
    }

    if (!visionCompleted || !visionDescription) {
      addDebugLog('Vision nem sikerült, polling fallback...');
      startPollingFallback();
      return;
    }

    // ========================================
    // STEP 2: Trigger background function → polling
    // ========================================
    addDebugLog('Step 2/2: Background function trigger...');
    setStreamingPhase('analysis');
    setPhaseStartTime(prev => ({ ...prev, analysis: Date.now() }));

    const triggerResponse = await fetch('/api/analyze/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visionDescription, logo, analysisId, tier, brief }),
    });

    addDebugLog(`Trigger HTTP: ${triggerResponse.status}`);

    if (!triggerResponse.ok) {
      addDebugLog('Trigger hiba, polling fallback...');
      startPollingFallback();
      return;
    }

    addDebugLog('Background function elindítva, polling mód...');
    startPollingFallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, router, startPollingFallback]);

  // Analysis adatok lekérése és elemzés indítása
  const startAnalysis = useCallback(async () => {
    if (isStarted) return;
    setIsStarted(true);

    addDebugLog(`startAnalysis: id=${analysisId}`);

    try {
      // Először lekérjük az analysis adatokat a DB-ből
      const infoRes = await fetch(`/api/result/${analysisId}`);
      addDebugLog(`DB lekérés: ${infoRes.status}`);
      if (!infoRes.ok) {
        throw new Error('Az elemzés nem található');
      }

      const analysisData = await infoRes.json();
      addDebugLog(`DB status: ${analysisData.status}, tier: ${analysisData.tier}, test_level: ${analysisData.test_level}, logo_base64: ${analysisData.logo_base64 ? `${String(analysisData.logo_base64).length} kar` : 'NINCS'}, result keys: ${analysisData.result ? Object.keys(analysisData.result).length : 0}`);

      // Ha már completed, egyből redirect
      if (analysisData.status === 'completed' && analysisData.result && Object.keys(analysisData.result).length > 0) {
        addDebugLog('Már kész, redirect...');
        router.push(`/eredmeny/${analysisId}`);
        return;
      }

      // Logó thumbnail beállítása — base64 elsődleges (mindig elérhető), storage URL fallback
      if (analysisData.logo_base64) {
        setLogoThumbnail(`data:image/png;base64,${analysisData.logo_base64}`);
      } else if (analysisData.logo_thumbnail_path) {
        const thumbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${analysisData.logo_thumbnail_path}`;
        setLogoThumbnail(thumbUrl);
      }

      // Ha processing ÉS VAN eredmény (valóban fut), akkor polling amíg kész lesz
      if (analysisData.status === 'processing' && analysisData.result && Object.keys(analysisData.result).length > 0) {
        addDebugLog('Már fut (processing+result), polling mód...');
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
            } else if (pollData.status === 'failed' || pollData.status === 'error') {
              clearInterval(pollInterval);
              addDebugLog(`Poll: HIBA! status=${pollData.status}`);
              setError('Az elemzés során hiba történt. Kérlek próbáld újra.');
            }
          }
        }, 2000);

        return;
      }

      // Ha pending VAGY processing stuck (üres result), indítsuk az SSE streaming elemzést
      if ((analysisData.status === 'pending' || analysisData.status === 'processing') && analysisData.logo_base64) {
        // Light tier: free + basic → Light endpoint (csak analysisId kell, logo DB-ből)
        const isLight = analysisData.tier === 'free' && (analysisData.test_level === 'basic' || !analysisData.test_level);
        addDebugLog(`SSE mód: ${isLight ? 'LIGHT' : 'MAX'}, status=${analysisData.status}`);

        if (isLight) {
          await runLightAnalysisWithSSE();
          return;
        }

        // MAX tier: logo küldése SSE-vel
        let mediaType = 'image/png';
        if (analysisData.logo_original_path) {
          const ext = analysisData.logo_original_path.split('.').pop()?.toLowerCase();
          if (ext === 'jpg' || ext === 'jpeg') mediaType = 'image/jpeg';
          else if (ext === 'webp') mediaType = 'image/webp';
        }

        addDebugLog(`MAX SSE mód: status=${analysisData.status}, mediaType=${mediaType}, tier=${analysisData.tier}`);
        await runAnalysisWithSSE(analysisData.logo_base64, mediaType, analysisData.tier, analysisData.brief);
        return;
      }

      // Ha nincs logo_base64, próbáljuk a start endpoint-ot (fallback)
      addDebugLog(`Fallback: start endpoint, logo_base64 NINCS`);
      const startRes = await fetch(`/api/analysis/${analysisId}/start`, {
        method: 'POST',
      });

      addDebugLog(`Start endpoint válasz: ${startRes.status}`);
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
          } else if (pollData.status === 'failed' || pollData.status === 'error') {
            clearInterval(pollInterval);
            setError('Az elemzés során hiba történt. Kérlek próbáld újra.');
          }
        }
      }, 2000);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
    }
  }, [analysisId, isStarted, router, runAnalysisWithSSE, runLightAnalysisWithSSE]);

  // Automatikus indítás
  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  // Loading state — animált progress-t használunk a progress barhoz
  const currentProgress = animatedProgress || (phaseProgress[streamingPhase] ?? 0);
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
      <div className="pointer-events-none">
        <ResultSkeleton />
      </div>

      {/* Overlay with dark card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
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
                onError={(e) => {
                  // Ha a thumbnail URL 404-et ad, elrejtjük a broken image-et
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* brandguide SCORE indicator */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1">
            <Stars01 className="size-3.5 text-[#fff012]" />
            <span className="text-xs font-medium text-gray-300">brandguide SCORE</span>
          </div>

          {/* Status text with cycling message */}
          <div className="mb-6">
            {streamingPhase !== 'complete' && (
              <p className="h-6 text-lg font-medium text-white">
                {(streamingPhase === 'analysis' || streamingPhase === 'brandguide_analysis') && animatedSubLabel
                  ? <>{animatedSubLabel}<span className="inline-block w-0.5 h-5 ml-0.5 bg-[#fff012] animate-pulse align-middle" /></>
                  : displayedMessage
                    ? <>{displayedMessage}<span className="inline-block w-0.5 h-5 ml-0.5 bg-[#fff012] animate-pulse align-middle" /></>
                    : null
                }
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
              const isActive = streamingPhase === phase ||
                (streamingPhase === 'analysis' && phase === 'brandguide_analysis');
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

          {/* Debug toggle button */}
          <button
            onClick={() => setShowDebug(prev => !prev)}
            className="mt-4 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showDebug ? '▲ debug elrejtése' : '▼ debug napló'}
          </button>
        </div>
      </div>

      {/* Debug panel - fixed bottom overlay */}
      {showDebug && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 border-t border-gray-700 max-h-64 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span className="text-xs font-mono font-bold text-green-400">DEBUG LOG — phase: {streamingPhase} ({currentProgress}%)</span>
            <button onClick={() => setDebugLogs([])} className="text-[10px] text-gray-500 hover:text-gray-300">törlés</button>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {debugLogs.length === 0 ? (
              <p className="text-xs text-gray-600 font-mono">Nincs napló még...</p>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-green-300 leading-5 border-b border-gray-900 py-0.5">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
