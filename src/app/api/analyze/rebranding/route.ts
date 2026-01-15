import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getRatingFromScore } from '@/lib/utils';
import { analyzeImageWithVision, queryBrandguideAI, buildQueryWithVision, LOGO_SCORING_PROMPT, BrandguideAPIError, BrandguideResponse } from '@/lib/brandguide-api';

interface RebrandingResult {
  id: string;
  type: 'rebranding';
  osszefoglalo: string;
  oldLogoAnalysis: {
    osszpontszam: number;
    minosites: string;
    szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>;
    osszegzes: string;
  };
  newLogoAnalysis: {
    osszpontszam: number;
    minosites: string;
    szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>;
    osszegzes: string;
  };
  comparison: {
    successRate: number;
    criteriaChanges: Record<string, { valtozas: string }>;
    improvements: string[];
    regressions: string[];
    recommendations: string[];
  };
  sources?: BrandguideResponse['sources'];
  createdAt: string;
}

function calculateScore(szempontok: Record<string, { pont: number }>) {
  return (
    (szempontok.megkulonboztethetoseg?.pont || 0) +
    (szempontok.egyszuruseg?.pont || 0) +
    (szempontok.alkalmazhatosag?.pont || 0) +
    (szempontok.emlekezetesseg?.pont || 0) +
    (szempontok.idotallosasg?.pont || 0) +
    (szempontok.univerzalitas?.pont || 0) +
    (szempontok.lathatosag?.pont || 0)
  );
}

// Helper type for criteria data
type CriteriaData = { p?: number; m?: number; i?: string; pont?: number; max?: number; indoklas?: string };

// Helper to safely extract criteria data
function extractCriteria(data: unknown, maxDefault: number): { pont: number; maxPont: number; indoklas: string } {
  if (!data || typeof data !== 'object') {
    return { pont: 0, maxPont: maxDefault, indoklas: '' };
  }
  const d = data as CriteriaData;
  return {
    pont: d.p ?? d.pont ?? 0,
    maxPont: d.m ?? d.max ?? maxDefault,
    indoklas: d.i ?? d.indoklas ?? '',
  };
}

// Parse brandguideAI JSON response into our format
function parseBrandguideResponse(answer: string): { szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>; osszegzes: string } {
  // Try to parse JSON directly first, then with extraction
  let jsonData: Record<string, unknown>;
  try {
    jsonData = JSON.parse(answer.trim());
  } catch {
    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[PARSE ERROR] Raw answer:', answer);
      throw new Error('Nem található JSON a válaszban');
    }
    try {
      jsonData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[PARSE ERROR] JSON string:', jsonMatch[0]);
      console.error('[PARSE ERROR] Parse error:', parseErr);
      throw new Error('Érvénytelen JSON formátum a válaszban');
    }
  }

  console.log('[REBRANDING] Parsed JSON keys:', Object.keys(jsonData));

  const szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }> = {
    megkulonboztethetoseg: extractCriteria(jsonData.megkulonboztethetoseg, 20),
    egyszuruseg: extractCriteria(jsonData.egyszuruseg, 18),
    alkalmazhatosag: extractCriteria(jsonData.alkalmazhatosag, 15),
    emlekezetesseg: extractCriteria(jsonData.emlekezetesseg, 15),
    idotallosasg: extractCriteria(jsonData.idotallossag ?? jsonData.idotallosasg, 12),
    univerzalitas: extractCriteria(jsonData.univerzalitas, 10),
    lathatosag: extractCriteria(jsonData.lathatosag, 10),
  };

  const osszegzes = (jsonData.osszegzes ?? jsonData.osszefoglalo ?? jsonData.summary ?? 'A logó értékelése a brandguide kritériumok alapján készült.') as string;

  return { szempontok, osszegzes };
}

// Generate comparison data based on old and new scores
function generateComparison(
  oldSzempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>,
  newSzempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>
): { criteriaChanges: Record<string, { valtozas: string }>; improvements: string[]; regressions: string[]; recommendations: string[] } {
  const criteriaNames: Record<string, string> = {
    megkulonboztethetoseg: 'Megkülönböztethetőség',
    egyszuruseg: 'Egyszerűség',
    alkalmazhatosag: 'Alkalmazhatóság',
    emlekezetesseg: 'Emlékezetesség',
    idotallosasg: 'Időtállóság',
    univerzalitas: 'Univerzalitás',
    lathatosag: 'Láthatóság',
  };

  const criteriaChanges: Record<string, { valtozas: string }> = {};
  const improvements: string[] = [];
  const regressions: string[] = [];
  const recommendations: string[] = [];

  for (const key of Object.keys(oldSzempontok)) {
    const oldPont = oldSzempontok[key]?.pont || 0;
    const newPont = newSzempontok[key]?.pont || 0;
    const diff = newPont - oldPont;
    const name = criteriaNames[key] || key;

    if (diff > 0) {
      criteriaChanges[key] = { valtozas: `+${diff} pont javulás` };
      improvements.push(`${name}: ${oldPont} → ${newPont} (+${diff})`);
    } else if (diff < 0) {
      criteriaChanges[key] = { valtozas: `${diff} pont csökkenés` };
      regressions.push(`${name}: ${oldPont} → ${newPont} (${diff})`);
    } else {
      criteriaChanges[key] = { valtozas: 'Változatlan' };
    }
  }

  // Generate recommendations based on low scores in new logo
  for (const key of Object.keys(newSzempontok)) {
    const newPont = newSzempontok[key]?.pont || 0;
    const maxPont = newSzempontok[key]?.maxPont || 1;
    const percentage = (newPont / maxPont) * 100;
    const name = criteriaNames[key] || key;

    if (percentage < 60) {
      recommendations.push(`${name} területén további fejlesztés javasolt (jelenlegi: ${newPont}/${maxPont})`);
    }
  }

  return { criteriaChanges, improvements, regressions, recommendations };
}

export async function POST(request: NextRequest) {
  console.log('Rebranding API called - direct brandguideAI image analysis');

  const body = await request.json();
  const { oldLogo, oldMediaType, newLogo, newMediaType } = body as {
    oldLogo: string;
    oldMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    newLogo: string;
    newMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  };

  if (!oldLogo || !newLogo) {
    return new Response(
      JSON.stringify({ error: 'Mindkét logó megadása kötelező' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a TransformStream for streaming
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Start the streaming response
  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Elemzés indítása...', phase: 'start' });

      // ========================================
      // Step 1: Claude Vision analysis for OLD logo
      // ========================================
      console.log('[REBRANDING] Step 1: Analyzing old logo with Claude Vision...');
      await sendEvent('status', { message: 'Régi logó feldolgozása...', phase: 'vision_old' });

      let oldVisionDescription: string;
      try {
        oldVisionDescription = await analyzeImageWithVision(oldLogo, oldMediaType);
        console.log('[REBRANDING] Old logo Vision description length:', oldVisionDescription.length);
      } catch (error) {
        console.error('[REBRANDING] Vision error (old):', error);
        throw new Error('Claude Vision hiba: nem sikerült a régi logó feldolgozása');
      }

      // ========================================
      // Step 2: brandguideAI analysis for OLD logo
      // ========================================
      console.log('[REBRANDING] Step 2: Sending old logo to brandguideAI...');
      await sendEvent('status', { message: 'Régi logó brandguideAI elemzés...', phase: 'brandguide_old' });

      let oldLogoAnalysis: { szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>; osszegzes: string };

      try {
        const oldQuery = buildQueryWithVision(oldVisionDescription, LOGO_SCORING_PROMPT);
        const oldBrandguideResponse = await queryBrandguideAI(oldQuery);
        console.log('[REBRANDING] Old logo brandguideAI response received');
        oldLogoAnalysis = parseBrandguideResponse(oldBrandguideResponse.answer);
      } catch (error) {
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba (régi logó): ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // Step 3: Claude Vision analysis for NEW logo
      // ========================================
      console.log('[REBRANDING] Step 3: Analyzing new logo with Claude Vision...');
      await sendEvent('status', { message: 'Új logó feldolgozása...', phase: 'vision_new' });

      let newVisionDescription: string;
      try {
        newVisionDescription = await analyzeImageWithVision(newLogo, newMediaType);
        console.log('[REBRANDING] New logo Vision description length:', newVisionDescription.length);
      } catch (error) {
        console.error('[REBRANDING] Vision error (new):', error);
        throw new Error('Claude Vision hiba: nem sikerült az új logó feldolgozása');
      }

      // ========================================
      // Step 4: brandguideAI analysis for NEW logo
      // ========================================
      console.log('[REBRANDING] Step 4: Sending new logo to brandguideAI...');
      await sendEvent('status', { message: 'Új logó brandguideAI elemzés...', phase: 'brandguide_new' });

      let newLogoAnalysis: { szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>; osszegzes: string };
      let newBrandguideSources: BrandguideResponse['sources'] | undefined;

      try {
        const newQuery = buildQueryWithVision(newVisionDescription, LOGO_SCORING_PROMPT);
        const newBrandguideResponse = await queryBrandguideAI(newQuery);
        console.log('[REBRANDING] New logo brandguideAI response received');
        newLogoAnalysis = parseBrandguideResponse(newBrandguideResponse.answer);
        newBrandguideSources = newBrandguideResponse.sources;
      } catch (error) {
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba (új logó): ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // Step 3: Calculate scores and generate comparison
      // ========================================
      await sendEvent('status', { message: 'Összehasonlítás készítése...', phase: 'comparing' });

      const oldScore = calculateScore(oldLogoAnalysis.szempontok);
      const newScore = calculateScore(newLogoAnalysis.szempontok);
      const successRate = oldScore > 0 ? ((newScore - oldScore) / oldScore) * 100 : 0;

      const comparison = generateComparison(oldLogoAnalysis.szempontok, newLogoAnalysis.szempontok);

      // Generate summary
      const scoreDiff = newScore - oldScore;
      let osszefoglalo = '';
      if (scoreDiff > 10) {
        osszefoglalo = `A rebranding jelentős sikert hozott: az új logó ${scoreDiff} ponttal jobb eredményt ért el (${oldScore} → ${newScore}). `;
      } else if (scoreDiff > 0) {
        osszefoglalo = `A rebranding mérsékelt javulást eredményezett: az új logó ${scoreDiff} ponttal jobb (${oldScore} → ${newScore}). `;
      } else if (scoreDiff === 0) {
        osszefoglalo = `A rebranding nem hozott számottevő változást az összpontszámban (${oldScore} pont mindkét esetben). `;
      } else {
        osszefoglalo = `A rebranding visszalépést eredményezett: az új logó ${Math.abs(scoreDiff)} ponttal gyengébb (${oldScore} → ${newScore}). `;
      }

      if (comparison.improvements.length > 0) {
        osszefoglalo += `Javult területek: ${comparison.improvements.length}. `;
      }
      if (comparison.regressions.length > 0) {
        osszefoglalo += `Visszalépés: ${comparison.regressions.length} területen. `;
      }

      // Build the result object
      const result: RebrandingResult = {
        id: '',
        type: 'rebranding',
        osszefoglalo,
        oldLogoAnalysis: {
          osszpontszam: oldScore,
          minosites: getRatingFromScore(oldScore),
          szempontok: oldLogoAnalysis.szempontok,
          osszegzes: oldLogoAnalysis.osszegzes,
        },
        newLogoAnalysis: {
          osszpontszam: newScore,
          minosites: getRatingFromScore(newScore),
          szempontok: newLogoAnalysis.szempontok,
          osszegzes: newLogoAnalysis.osszegzes,
        },
        comparison: {
          successRate: Math.round(successRate * 10) / 10,
          ...comparison,
        },
        createdAt: new Date().toISOString(),
      };

      // Add sources if available
      if (newBrandguideSources && newBrandguideSources.length > 0) {
        result.sources = newBrandguideSources;
      }

      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      // Save to Supabase
      const { data: insertedData, error: dbError } = await getSupabase()
        .from('analyses')
        .insert({
          result: result as unknown as Record<string, unknown>,
          logo_base64: newLogo,
          test_level: 'rebranding',
          old_logo_base64: oldLogo,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Supabase error:', dbError);
        throw new Error('Nem sikerült menteni az elemzést');
      }

      result.id = insertedData.id;

      // Send final result
      await sendEvent('complete', { id: insertedData.id, result });
      await writer.close();

    } catch (error) {
      console.error('Analysis error:', error);
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
      await writer.close();
    }
  })();

  // Don't await - let it run in background
  responsePromise.catch(console.error);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
