'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Stars01 } from '@untitledui/icons';
import { TransparentVideo } from '@/components/TransparentVideo';
import { ResultSkeleton } from '@/components/results';
import { pushToDataLayer } from '@/lib/gtm';

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

// Direct brandguideAI pipeline phases — 5 belső lépés, 4 vizuális fázis
type Phase = 'start' | 'vision' | 'analysis' | 'brandguide_analysis' | 'comparing' | 'processing' | 'visual' | 'saving' | 'complete';

const phaseProgress: Record<Phase, number> = {
  start: 5,
  vision: 10,
  analysis: 25,           // Step 2: Scoring
  brandguide_analysis: 25,
  comparing: 50,          // Step 3: Summary
  processing: 70,         // Step 4: Details
  visual: 92,
  saving: 97,
  complete: 100,
};

const phaseLabels: Record<Phase, string> = {
  start: 'Indítás',
  vision: 'Kép elemzés',
  analysis: 'Pontozás',
  brandguide_analysis: 'Pontozás',
  comparing: 'Összefoglaló',
  processing: 'Részletes elemzés',
  visual: 'Vizuális elemzés',
  saving: 'Mentés',
  complete: 'Kész',
};

// Vizuális lépések — 4 fázis amit a user lát
const phaseSteps: Phase[] = ['vision', 'brandguide_analysis', 'comparing', 'processing'];

// Scoring fázis (25–50%) al-lépés üzenetek
const SCORING_SUBSTEPS = [
  { pct: 25, label: 'Megkülönböztethetőség vizsgálata...' },
  { pct: 29, label: 'Egyszerűség elemzése...' },
  { pct: 33, label: 'Alkalmazhatóság tesztelése...' },
  { pct: 37, label: 'Emlékezetesség felmérése...' },
  { pct: 41, label: 'Időtállóság értékelése...' },
  { pct: 45, label: 'Univerzalitás ellenőrzése...' },
  { pct: 48, label: 'Láthatóság vizsgálata...' },
];

// Summary fázis (50–68%) al-lépés üzenetek
const SUMMARY_SUBSTEPS = [
  { pct: 50, label: 'Összefoglaló készítése...' },
  { pct: 55, label: 'Erősségek összegyűjtése...' },
  { pct: 60, label: 'Fejlesztendő területek...' },
  { pct: 65, label: 'Mentori értékelés...' },
];

// Details + Javaslatok fázis (70–90%) al-lépés üzenetek
const DETAILS_SUBSTEPS = [
  { pct: 70, label: 'Színpaletta elemzése...' },
  { pct: 74, label: 'Tipográfia értékelése...' },
  { pct: 78, label: 'Vizuális nyelv elemzése...' },
  { pct: 82, label: 'Javaslatok generálása...' },
  { pct: 86, label: 'Részletes javaslatok...' },
  { pct: 90, label: 'Eredmények véglegesítése...' },
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

    // Scoring fázis: 25-tól lassan 48%-ig auto-növekszik (~40s alatt)
    if (streamingPhase === 'analysis' || streamingPhase === 'brandguide_analysis') {
      setAnimatedProgress(25);
      let current = 25;
      const interval = setInterval(() => {
        if (current < 48) {
          current += 1;
          setAnimatedProgress(current);
          const step = [...SCORING_SUBSTEPS].reverse().find(s => current >= s.pct);
          if (step) setAnimatedSubLabel(step.label);
        } else {
          clearInterval(interval);
        }
      }, 1700); // ~1.7s / 1% → 23 lépés = ~39s
      return () => clearInterval(interval);
    }

    // Summary fázis: 50-től lassan 68%-ig auto-növekszik (~30s alatt)
    if (streamingPhase === 'comparing') {
      setAnimatedProgress(50);
      let current = 50;
      const interval = setInterval(() => {
        if (current < 68) {
          current += 1;
          setAnimatedProgress(current);
          const step = [...SUMMARY_SUBSTEPS].reverse().find(s => current >= s.pct);
          if (step) setAnimatedSubLabel(step.label);
        } else {
          clearInterval(interval);
        }
      }, 1700); // ~1.7s / 1% → 18 lépés = ~30s
      return () => clearInterval(interval);
    }

    // Details + Javaslatok fázis: 70-től lassan 90%-ig auto-növekszik (~40s alatt)
    if (streamingPhase === 'processing') {
      setAnimatedProgress(70);
      let current = 70;
      const interval = setInterval(() => {
        if (current < 90) {
          current += 1;
          setAnimatedProgress(current);
          const step = [...DETAILS_SUBSTEPS].reverse().find(s => current >= s.pct);
          if (step) setAnimatedSubLabel(step.label);
        } else {
          clearInterval(interval);
        }
      }, 2000); // ~2s / 1% → 20 lépés = ~40s
      return () => clearInterval(interval);
    }

    // Minden más fázis: egyből a valós értékre ugrik
    setAnimatedProgress(baseProgress);
    setAnimatedSubLabel('');
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
      // Summary fázis — színek, tipográfia, vizuális nyelv
      messages = [...LOADING_MESSAGES.colors, ...LOADING_MESSAGES.typography, ...LOADING_MESSAGES.visual];
    } else if (streamingPhase === 'processing') {
      // Suggestions fázis
      messages = LOADING_MESSAGES.processing;
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
                  pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: 'free' });
                  // Email notification fallback (fire-and-forget)
                  fetch('/api/email/send-completion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ analysisId }),
                  }).catch(err => addDebugLog(`Email notify hiba: ${err.message}`));
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

    if (!completed) {
      addDebugLog('Light SSE stream lezárult complete nélkül');
      throw new Error('Az elemzés megszakadt. Kérlek próbáld újra.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, router]);

  // Generikus SSE stream olvasó — újrahasznosítható Vision, Scoring, Summary lépésekhez
  const readSSEStream = useCallback(async (
    response: Response,
    label: string,
    options: {
      watchdogMs?: number;
      onComplete?: (parsed: any) => void;
      onVisionComplete?: (visionDescription: string) => void;
    }
  ): Promise<boolean> => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Nem sikerült olvasni a választ');

    addDebugLog(`${label} SSE stream megnyílt...`);
    const decoder = new TextDecoder();
    let buffer = '';
    let lastEventTime = Date.now();
    let completed = false;

    const watchdog = setTimeout(() => {
      const elapsed = Math.round((Date.now() - lastEventTime) / 1000);
      addDebugLog(`WATCHDOG (${label}): ${elapsed}s óta nem jött adat!`);
      reader.cancel();
    }, options.watchdogMs || 65000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { addDebugLog(`${label} stream lezárva`); break; }

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
                  clearTimeout(watchdog);
                  completed = true;
                  if (options.onVisionComplete && parsed.visionDescription) {
                    options.onVisionComplete(parsed.visionDescription);
                  }
                  if (options.onComplete) {
                    options.onComplete(parsed);
                  }
                  addDebugLog(`${label} KÉSZ!`);
                  return true;
                case 'error':
                  addDebugLog(`${label} HIBA: ${parsed.message}`);
                  clearTimeout(watchdog);
                  throw new Error(parsed.message || `${label} hiba`);
                case 'heartbeat':
                  break;
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && !parseErr.message.includes('hiba')) {
                addDebugLog(`JSON parse hiba: ${(parseErr as Error).message}`);
              } else { throw parseErr; }
            }
          }
        }
        if (completed) break;
      }
    } finally {
      clearTimeout(watchdog);
    }

    return completed;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE Stream kezelés - MAX tier
  // Vision SSE (Next.js) → Scoring (Supabase function) → Summary (Supabase function)
  const runAnalysisWithSSE = useCallback(async (logo: string, mediaType: string, tier?: string, brief?: string | null) => {
    addDebugLog(`MAX elemzés indítás: analysisId=${analysisId}, mediaType=${mediaType}, tier=${tier}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase konfiguráció hiányzik');
    }

    // ========================================
    // STEP 1: Vision SSE (~22s) — Next.js route
    // ========================================
    addDebugLog('Step 1/6: Vision...');
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

    let visionDescription = '';
    const visionOk = await readSSEStream(visionResponse, 'Vision', {
      watchdogMs: 65000,
      onVisionComplete: (vd) => {
        visionDescription = vd;
        addDebugLog(`Vision leírás: ${vd.length} kar`);
      },
    });

    if (!visionOk || !visionDescription) {
      throw new Error('Vision elemzés sikertelen. Kérlek próbáld újra.');
    }

    // ========================================
    // STEP 2: Scoring — Supabase Edge Function (nincs 60s limit)
    // ========================================
    addDebugLog('Step 2/6: Scoring (Supabase function)...');
    setStreamingPhase('analysis');
    setPhaseStartTime(prev => ({ ...prev, analysis: Date.now() }));

    const scoringStartTime = Date.now();
    const scoringRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ analysisId, visionDescription, step: 'scoring', brief }),
    });

    const scoringElapsed = ((Date.now() - scoringStartTime) / 1000).toFixed(1);

    if (!scoringRes.ok) {
      const scoringErr = await scoringRes.json().catch(() => ({ error: 'Scoring hiba' }));
      addDebugLog(`Scoring HIBA (${scoringElapsed}s): ${scoringErr.error}`);
      throw new Error(`Scoring hiba (${scoringElapsed}s): ${scoringErr.error || 'ismeretlen'}`);
    }

    const scoringData = await scoringRes.json();
    addDebugLog(`Scoring kész (${scoringElapsed}s)! Pontszám: ${scoringData.score}`);

    // ========================================
    // STEP 3: Summary — Supabase Edge Function (összefoglaló, erősségek, fejlesztendő)
    // ========================================
    addDebugLog('Step 3/6: Summary (Supabase function)...');
    setStreamingPhase('comparing');
    setPhaseStartTime(prev => ({ ...prev, comparing: Date.now() }));

    const summaryStartTime = Date.now();
    const summaryRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ analysisId, visionDescription, step: 'summary', brief }),
    });

    const summaryElapsed = ((Date.now() - summaryStartTime) / 1000).toFixed(1);

    if (!summaryRes.ok) {
      const summaryErr = await summaryRes.json().catch(() => ({ error: 'Summary hiba' }));
      addDebugLog(`Summary HIBA (${summaryElapsed}s): ${summaryErr.error}`);
      throw new Error(`Summary hiba (${summaryElapsed}s): ${summaryErr.error || 'ismeretlen'}`);
    }

    addDebugLog(`Summary kész (${summaryElapsed}s)!`);

    // ========================================
    // STEP 4: Details — Supabase Edge Function (színek, tipográfia, vizuális nyelv)
    // ========================================
    addDebugLog('Step 4/6: Details (Supabase function)...');
    setStreamingPhase('processing');
    setPhaseStartTime(prev => ({ ...prev, processing: Date.now() }));

    const detailsStartTime = Date.now();
    const detailsRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ analysisId, visionDescription, step: 'details', brief }),
    });

    const detailsElapsed = ((Date.now() - detailsStartTime) / 1000).toFixed(1);

    if (!detailsRes.ok) {
      const detailsErr = await detailsRes.json().catch(() => ({ error: 'Details hiba' }));
      addDebugLog(`Details HIBA (${detailsElapsed}s): ${detailsErr.error}`);
      throw new Error(`Details hiba (${detailsElapsed}s): ${detailsErr.error || 'ismeretlen'}`);
    }

    addDebugLog(`Details kész (${detailsElapsed}s)!`);

    // ========================================
    // STEP 5: Párhuzamos javaslatok (suggestions-a + suggestions-b + detail-suggestions)
    // ========================================
    addDebugLog('Step 5/6: Párhuzamos javaslatok (3 fetch egyszerre)...');

    const parallelStartTime = Date.now();
    const edgeFnHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    };

    const [sugARes, sugBRes, detSugRes] = await Promise.all([
      fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
        method: 'POST',
        headers: edgeFnHeaders,
        body: JSON.stringify({ analysisId, visionDescription, step: 'suggestions-a' }),
      }),
      fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
        method: 'POST',
        headers: edgeFnHeaders,
        body: JSON.stringify({ analysisId, visionDescription, step: 'suggestions-b' }),
      }),
      fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
        method: 'POST',
        headers: edgeFnHeaders,
        body: JSON.stringify({ analysisId, visionDescription, step: 'detail-suggestions' }),
      }),
    ]);

    const parallelElapsed = ((Date.now() - parallelStartTime) / 1000).toFixed(1);

    // Mindhárom critical — bármelyik hiba → throw
    if (!sugARes.ok) {
      const sugAErr = await sugARes.json().catch(() => ({ error: 'Suggestions-A hiba' }));
      addDebugLog(`Suggestions-A HIBA (${parallelElapsed}s): ${sugAErr.error}`);
      throw new Error(`Suggestions-A hiba (${parallelElapsed}s): ${sugAErr.error || 'ismeretlen'}`);
    }
    if (!sugBRes.ok) {
      const sugBErr = await sugBRes.json().catch(() => ({ error: 'Suggestions-B hiba' }));
      addDebugLog(`Suggestions-B HIBA (${parallelElapsed}s): ${sugBErr.error}`);
      throw new Error(`Suggestions-B hiba (${parallelElapsed}s): ${sugBErr.error || 'ismeretlen'}`);
    }
    if (!detSugRes.ok) {
      const detSugErr = await detSugRes.json().catch(() => ({ error: 'Detail-suggestions hiba' }));
      addDebugLog(`Detail-suggestions HIBA (${parallelElapsed}s): ${detSugErr.error}`);
      throw new Error(`Detail-suggestions hiba (${parallelElapsed}s): ${detSugErr.error || 'ismeretlen'}`);
    }

    const sugAData = await sugARes.json();
    const sugBData = await sugBRes.json();
    const detSugData = await detSugRes.json();

    addDebugLog(`Párhuzamos javaslatok kész (${parallelElapsed}s)! A: ${sugAData.elapsed}, B: ${sugBData.elapsed}, Det: ${detSugData.elapsed}`);

    // ========================================
    // STEP 6: Finalize — merge + DB save + completed
    // ========================================
    addDebugLog('Step 6/6: Finalize (merge + DB save)...');

    const finalizeStartTime = Date.now();
    const finalizeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
      method: 'POST',
      headers: edgeFnHeaders,
      body: JSON.stringify({
        analysisId,
        step: 'finalize',
        suggestionsAData: sugAData.data?.javaslatok,
        suggestionsBData: sugBData.data?.javaslatok,
        detailSuggestionsData: detSugData.data,
      }),
    });

    const finalizeElapsed = ((Date.now() - finalizeStartTime) / 1000).toFixed(1);

    if (!finalizeRes.ok) {
      const finalizeErr = await finalizeRes.json().catch(() => ({ error: 'Finalize hiba' }));
      addDebugLog(`Finalize HIBA (${finalizeElapsed}s): ${finalizeErr.error}`);
      throw new Error(`Finalize hiba (${finalizeElapsed}s): ${finalizeErr.error || 'ismeretlen'}`);
    }

    addDebugLog(`Finalize kész (${finalizeElapsed}s)!`);

    // Visual analysis trigger (paid/consultation tier)
    if (tier === 'paid' || tier === 'consultation') {
      addDebugLog(`Visual analysis trigger (tier=${tier})...`);
      fetch('/api/analyze/visual-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      }).catch(err => {
        addDebugLog(`Visual trigger hiba: ${err.message}`);
      });
    }

    // Email: finalize step-ben már elküldtük (analysis-notify), itt NEM kell duplikálni

    // Redirect to results
    addDebugLog('Elemzés kész! Redirect...');
    setStreamingPhase('complete');
    pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: 'free' });
    setTimeout(() => { router.push(`/eredmeny/${analysisId}`); }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, router, readSSEStream]);

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
        pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: analysisData.tier });
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

      // Ha processing ÉS VAN eredmény → ellenőrizzük, hogy stale-e
      if (analysisData.status === 'processing' && analysisData.result && Object.keys(analysisData.result).length > 0) {
        const resultObj = analysisData.result as Record<string, unknown>;
        const hasOsszegzes = !!resultObj.osszegzes;
        const resultCreatedAt = resultObj.createdAt ? new Date(resultObj.createdAt as string).getTime() : 0;
        const ageSeconds = resultCreatedAt ? (Date.now() - resultCreatedAt) / 1000 : Infinity;

        addDebugLog(`Processing+result: osszegzes=${hasOsszegzes}, age=${ageSeconds.toFixed(0)}s`);

        // Ha van összegzés → redirect (summary lefutott de status nem frissült)
        if (hasOsszegzes) {
          addDebugLog('Van összegzés, redirect...');
          pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: analysisData.tier });
          router.push(`/eredmeny/${analysisId}`);
          return;
        }

        // Ha friss (< 120s) → valaki éppen dolgozik rajta, polling
        if (ageSeconds < 120) {
          addDebugLog(`Friss (${ageSeconds.toFixed(0)}s), polling mód...`);
          setStreamingPhase('brandguide_analysis');

          const pollInterval = setInterval(async () => {
            const pollRes = await fetch(`/api/result/${analysisId}`);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.status === 'completed') {
                clearInterval(pollInterval);
                setStreamingPhase('complete');
                pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: analysisData.tier });
                fetch('/api/email/send-completion', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ analysisId }),
                }).catch(() => {});
                setTimeout(() => { router.push(`/eredmeny/${analysisId}`); }, 500);
              } else if (pollData.status === 'failed' || pollData.status === 'error') {
                clearInterval(pollInterval);
                addDebugLog(`Poll: HIBA! status=${pollData.status}`);
                setError('Az elemzés során hiba történt. Kérlek próbáld újra.');
              }
            }
          }, 2000);

          return;
        }

        // Stale (> 120s) — scoring kész, summary/details nem futott le → folytatás
        addDebugLog(`Stale processing (${ageSeconds.toFixed(0)}s) — folytatás summary-tól...`);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase konfiguráció hiányzik');
        }

        const edgeFnHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        };

        // Resume Step 3: Summary
        setStreamingPhase('comparing');
        setPhaseStartTime(prev => ({ ...prev, comparing: Date.now() }));
        addDebugLog('Resume Step 3/6: Summary...');

        const summaryStartTime = Date.now();
        const summaryRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
          method: 'POST',
          headers: edgeFnHeaders,
          body: JSON.stringify({ analysisId, step: 'summary', brief: analysisData.brief }),
        });

        const summaryElapsed = ((Date.now() - summaryStartTime) / 1000).toFixed(1);
        if (!summaryRes.ok) {
          const summaryErr = await summaryRes.json().catch(() => ({ error: 'Summary hiba' }));
          addDebugLog(`Summary HIBA (${summaryElapsed}s): ${summaryErr.error}`);
          throw new Error(`Summary hiba (${summaryElapsed}s): ${summaryErr.error || 'ismeretlen'}`);
        }
        addDebugLog(`Summary kész (${summaryElapsed}s)!`);

        // Resume Step 4: Details
        setStreamingPhase('processing');
        setPhaseStartTime(prev => ({ ...prev, processing: Date.now() }));
        addDebugLog('Resume Step 4/6: Details...');

        const detailsStartTime = Date.now();
        const detailsRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
          method: 'POST',
          headers: edgeFnHeaders,
          body: JSON.stringify({ analysisId, step: 'details', brief: analysisData.brief }),
        });

        const detailsElapsed = ((Date.now() - detailsStartTime) / 1000).toFixed(1);
        if (!detailsRes.ok) {
          const detailsErr = await detailsRes.json().catch(() => ({ error: 'Details hiba' }));
          addDebugLog(`Details HIBA (${detailsElapsed}s): ${detailsErr.error}`);
          throw new Error(`Details hiba (${detailsElapsed}s): ${detailsErr.error || 'ismeretlen'}`);
        }
        addDebugLog(`Details kész (${detailsElapsed}s)!`);

        // Resume Step 5: Párhuzamos javaslatok
        addDebugLog('Resume Step 5/6: Párhuzamos javaslatok (3 fetch egyszerre)...');
        const parallelStartTime = Date.now();

        const [sugARes, sugBRes, detSugRes] = await Promise.all([
          fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
            method: 'POST',
            headers: edgeFnHeaders,
            body: JSON.stringify({ analysisId, step: 'suggestions-a' }),
          }),
          fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
            method: 'POST',
            headers: edgeFnHeaders,
            body: JSON.stringify({ analysisId, step: 'suggestions-b' }),
          }),
          fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
            method: 'POST',
            headers: edgeFnHeaders,
            body: JSON.stringify({ analysisId, step: 'detail-suggestions' }),
          }),
        ]);

        const parallelElapsed = ((Date.now() - parallelStartTime) / 1000).toFixed(1);

        if (!sugARes.ok) {
          const sugAErr = await sugARes.json().catch(() => ({ error: 'Suggestions-A hiba' }));
          addDebugLog(`Suggestions-A HIBA (${parallelElapsed}s): ${sugAErr.error}`);
          throw new Error(`Suggestions-A hiba (${parallelElapsed}s): ${sugAErr.error || 'ismeretlen'}`);
        }
        if (!sugBRes.ok) {
          const sugBErr = await sugBRes.json().catch(() => ({ error: 'Suggestions-B hiba' }));
          addDebugLog(`Suggestions-B HIBA (${parallelElapsed}s): ${sugBErr.error}`);
          throw new Error(`Suggestions-B hiba (${parallelElapsed}s): ${sugBErr.error || 'ismeretlen'}`);
        }
        if (!detSugRes.ok) {
          const detSugErr = await detSugRes.json().catch(() => ({ error: 'Detail-suggestions hiba' }));
          addDebugLog(`Detail-suggestions HIBA (${parallelElapsed}s): ${detSugErr.error}`);
          throw new Error(`Detail-suggestions hiba (${parallelElapsed}s): ${detSugErr.error || 'ismeretlen'}`);
        }

        const sugAData = await sugARes.json();
        const sugBData = await sugBRes.json();
        const detSugData = await detSugRes.json();

        addDebugLog(`Párhuzamos javaslatok kész (${parallelElapsed}s)!`);

        // Resume Step 6: Finalize
        addDebugLog('Resume Step 6/6: Finalize...');
        const finalizeStartTime = Date.now();
        const finalizeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-pipeline`, {
          method: 'POST',
          headers: edgeFnHeaders,
          body: JSON.stringify({
            analysisId,
            step: 'finalize',
            suggestionsAData: sugAData.data?.javaslatok,
            suggestionsBData: sugBData.data?.javaslatok,
            detailSuggestionsData: detSugData.data,
          }),
        });

        const finalizeElapsed = ((Date.now() - finalizeStartTime) / 1000).toFixed(1);
        if (!finalizeRes.ok) {
          const finalizeErr = await finalizeRes.json().catch(() => ({ error: 'Finalize hiba' }));
          addDebugLog(`Finalize HIBA (${finalizeElapsed}s): ${finalizeErr.error}`);
          throw new Error(`Finalize hiba (${finalizeElapsed}s): ${finalizeErr.error || 'ismeretlen'}`);
        }
        addDebugLog(`Finalize kész (${finalizeElapsed}s)!`);

        // Visual analysis trigger (paid/consultation tier)
        if (analysisData.tier === 'paid' || analysisData.tier === 'consultation') {
          fetch('/api/analyze/visual-trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysisId }),
          }).catch(err => addDebugLog(`Visual trigger hiba: ${err.message}`));
        }

        // Email: finalize step-ben már elküldtük (analysis-notify), itt NEM kell duplikálni

        addDebugLog('Resume kész! Redirect...');
        setStreamingPhase('complete');
        pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: analysisData.tier });
        setTimeout(() => { router.push(`/eredmeny/${analysisId}`); }, 800);
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
            pushToDataLayer('analysis_complete', { analysis_id: analysisId, tier: analysisData.tier });
            // Email notification fallback (fire-and-forget)
            fetch('/api/email/send-completion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ analysisId }),
            }).catch(() => {});
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
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1">
            <Stars01 className="size-3.5 text-[#fff012]" />
            <span className="text-xs font-medium text-gray-300">brandguide SCORE</span>
          </div>

          {/* Tájékoztató szöveg */}
          <p className="mb-4 text-sm text-gray-400">
            Az elemzés 3-4 percet vesz igénybe.
            <br />
            <span className="text-gray-500">Addig nyugodtan hozz egy kávét ☕ vagy teát 🍵</span>
          </p>

          {/* Status text with cycling message */}
          <div className="mb-6">
            {streamingPhase !== 'complete' && (
              <p className="h-6 text-lg font-medium text-white">
                {(streamingPhase === 'analysis' || streamingPhase === 'brandguide_analysis' || streamingPhase === 'comparing') && animatedSubLabel
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
