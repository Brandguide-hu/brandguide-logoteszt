import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { AnalysisResult, ColorAnalysis, TypographyAnalysis, VisualLanguageAnalysis } from '@/types';
import { getRatingFromScore } from '@/lib/utils';
import { analyzeImageWithVision, queryBrandguideAI, buildQueryWithVision, LOGO_SCORING_PROMPT, LOGO_SUMMARY_PROMPT, LOGO_COLORS_PROMPT, LOGO_TYPO_PROMPT, LOGO_VISUAL_PROMPT, BrandguideAPIError, BrandguideResponse } from '@/lib/brandguide-api';

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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { logo, mediaType } = body as {
    logo: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  };

  if (!logo) {
    return new Response(
      JSON.stringify({ error: 'Logó megadása kötelező' }),
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
  // Helper to parse JSON from brandguideAI response
  const parseJsonResponse = (answer: string, promptName: string): Record<string, unknown> => {
    // Check if response looks like "no context" message
    if (answer.includes('nem találok releváns') ||
        answer.includes('nem tartalmaz elegendő') ||
        answer.includes('Sajnos a kontextusban')) {
      console.error(`[PARSE ERROR] ${promptName}: brandguideAI did not find relevant context`);
      console.error('[PARSE ERROR] Response preview:', answer.slice(0, 300));
      throw new Error(`brandguideAI nem talált releváns kontextust a ${promptName} elemzéshez. Próbáld újra egy másik logóval.`);
    }

    try {
      return JSON.parse(answer.trim());
    } catch {
      const jsonMatch = answer.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`[PARSE ERROR] ${promptName}: No JSON found in response`);
        console.error('[PARSE ERROR] Full answer:', answer);
        throw new Error(`brandguideAI nem adott vissza JSON formátumú választ (${promptName})`);
      }
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error(`[PARSE ERROR] ${promptName}: JSON parse failed`);
        console.error('[PARSE ERROR] JSON string:', jsonMatch[0]);
        console.error('[PARSE ERROR] Parse error:', parseErr);
        throw new Error(`brandguideAI válasz nem parse-olható JSON-ként (${promptName})`);
      }
    }
  };

  // Helper to safely extract criteria data
  type CriteriaData = { p?: number; m?: number; i?: string; pont?: number; max?: number; indoklas?: string };
  const extractCriteria = (data: unknown, maxDefault: number): { pont: number; maxPont: number; indoklas: string } => {
    if (!data || typeof data !== 'object') {
      return { pont: 0, maxPont: maxDefault, indoklas: '' };
    }
    const d = data as CriteriaData;
    return {
      pont: d.p ?? d.pont ?? 0,
      maxPont: d.m ?? d.max ?? maxDefault,
      indoklas: d.i ?? d.indoklas ?? '',
    };
  };

  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Elemzés indítása...', phase: 'start' });

      let scoringResponse: BrandguideResponse;
      let analysisData: {
        szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>;
        osszegzes: string;
        erossegek: string[];
        fejlesztendo: string[];
        szinek?: ColorAnalysis;
        tipografia?: TypographyAnalysis;
        vizualisNyelv?: VisualLanguageAnalysis;
      };

      try {
        // ========================================
        // STEP 0: Claude Vision - Technical Inventory
        // ========================================
        console.log('[ANALYZE] Step 0: Analyzing image with Claude Vision...');
        await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

        let visionDescription: string;
        try {
          visionDescription = await analyzeImageWithVision(logo, mediaType);
          console.log('[ANALYZE] Vision description length:', visionDescription.length);
        } catch (visionError) {
          console.error('[ANALYZE] Vision error:', visionError);
          throw new Error('Claude Vision hiba: nem sikerült a kép feldolgozása');
        }

        // ========================================
        // ROUND 1A: Scoring analysis (7 criteria only)
        // ========================================
        console.log('[ANALYZE] Round 1A: Sending scoring prompt (7 criteria)...');
        await sendEvent('status', { message: 'Pontozás elemzése (1/5)...', phase: 'brandguide_analysis' });

        const scoringQuery = buildQueryWithVision(visionDescription, LOGO_SCORING_PROMPT);
        scoringResponse = await queryBrandguideAI(scoringQuery);
        console.log('[ANALYZE] Round 1A response received, length:', scoringResponse.answer.length);

        const scoringData = parseJsonResponse(scoringResponse.answer, 'Scoring');
        console.log('[ANALYZE] Scoring JSON keys:', Object.keys(scoringData));

        // Map JSON fields to our internal format
        const parsedScores: Record<string, { pont: number; maxPont: number; indoklas: string }> = {
          megkulonboztethetoseg: extractCriteria(scoringData.megkulonboztethetoseg, 20),
          egyszuruseg: extractCriteria(scoringData.egyszuruseg, 18),
          alkalmazhatosag: extractCriteria(scoringData.alkalmazhatosag, 15),
          emlekezetesseg: extractCriteria(scoringData.emlekezetesseg, 15),
          idotallosasg: extractCriteria(scoringData.idotallossag ?? scoringData.idotallosasg, 12),
          univerzalitas: extractCriteria(scoringData.univerzalitas, 10),
          lathatosag: extractCriteria(scoringData.lathatosag, 10),
        };

        const totalScore = Object.values(parsedScores).reduce((sum, s) => sum + s.pont, 0);
        console.log('[ANALYZE] Total score:', totalScore);

        // ========================================
        // ROUND 1B: Summary analysis (separate call due to token limit)
        // ========================================
        console.log('[ANALYZE] Round 1B: Sending summary prompt...');
        await sendEvent('status', { message: 'Összegzés készítése (2/5)...', phase: 'brandguide_analysis' });

        // Create a shorter context for summary - include scores
        const summaryContext = `[Logó rövid leírás]
${visionDescription.slice(0, 1500)}

[Előző értékelés pontszámai]
Megkülönböztethetőség: ${parsedScores.megkulonboztethetoseg.pont}/20
Egyszerűség: ${parsedScores.egyszuruseg.pont}/18
Alkalmazhatóság: ${parsedScores.alkalmazhatosag.pont}/15
Emlékezetesség: ${parsedScores.emlekezetesseg.pont}/15
Időtállóság: ${parsedScores.idotallosasg.pont}/12
Univerzalitás: ${parsedScores.univerzalitas.pont}/10
Láthatóság: ${parsedScores.lathatosag.pont}/10
ÖSSZESEN: ${totalScore}/100

[Feladat]
${LOGO_SUMMARY_PROMPT}`;

        const summaryResponse = await queryBrandguideAI(summaryContext);
        console.log('[ANALYZE] Round 1B response received, length:', summaryResponse.answer.length);

        const summaryData = parseJsonResponse(summaryResponse.answer, 'Summary');
        console.log('[ANALYZE] Summary JSON keys:', Object.keys(summaryData));

        // Get summary and lists
        const osszegzes = (summaryData.osszegzes ?? 'A logó értékelése a brandguide kritériumok alapján készült.') as string;

        const rawErossegek = (summaryData.erossegek ?? []) as string[];
        const erossegek = Array.isArray(rawErossegek) ? rawErossegek.filter(e => e && e.length > 0) : [];

        const rawFejlesztendo = (summaryData.fejlesztendo ?? []) as string[];
        const fejlesztendo = Array.isArray(rawFejlesztendo) ? rawFejlesztendo.filter(f => f && f.length > 0) : [];

        // Create shorter vision summary for remaining calls
        const visionShort = visionDescription.slice(0, 1200);

        // ========================================
        // ROUND 3: Color analysis (using shorter vision)
        // ========================================
        console.log('[ANALYZE] Round 3: Sending colors prompt...');
        await sendEvent('status', { message: 'Színek elemzése (3/5)...', phase: 'comparing' });

        const colorsQuery = buildQueryWithVision(visionShort, LOGO_COLORS_PROMPT);
        const colorsResponse = await queryBrandguideAI(colorsQuery);
        console.log('[ANALYZE] Round 3 response received, length:', colorsResponse.answer.length);

        const colorsData = parseJsonResponse(colorsResponse.answer, 'Colors');
        console.log('[ANALYZE] Colors JSON keys:', Object.keys(colorsData));

        // Parse color analysis
        let szinek: ColorAnalysis | undefined;
        szinek = {
          harmonia: (colorsData.harmonia as string) || '',
          pszichologia: (colorsData.pszichologia as string) || '',
          technikai: (colorsData.technikai as string) || '',
          javaslatok: Array.isArray(colorsData.javaslatok) ? colorsData.javaslatok.filter((j): j is string => typeof j === 'string' && j.length > 0) : [],
        };

        // ========================================
        // ROUND 4: Typography analysis (using shorter vision)
        // ========================================
        console.log('[ANALYZE] Round 4: Sending typography prompt...');
        await sendEvent('status', { message: 'Tipográfia elemzése (4/5)...', phase: 'processing' });

        const typoQuery = buildQueryWithVision(visionShort, LOGO_TYPO_PROMPT);
        const typoResponse = await queryBrandguideAI(typoQuery);
        console.log('[ANALYZE] Round 4 response received, length:', typoResponse.answer.length);

        const typoData = parseJsonResponse(typoResponse.answer, 'Typography');
        console.log('[ANALYZE] Typography JSON keys:', Object.keys(typoData));

        // Parse typography analysis
        let tipografia: TypographyAnalysis | undefined;
        tipografia = {
          karakter: (typoData.karakter as string) || '',
          olvashatosag: (typoData.olvashatosag as string) || '',
          illeszkedés: ((typoData.illeszkedés ?? typoData.illeszked) as string) || '',
          javaslatok: Array.isArray(typoData.javaslatok) ? typoData.javaslatok.filter((j): j is string => typeof j === 'string' && j.length > 0) : [],
        };

        // ========================================
        // ROUND 5: Visual language analysis (using shorter vision)
        // ========================================
        console.log('[ANALYZE] Round 5: Sending visual prompt...');
        await sendEvent('status', { message: 'Vizuális nyelv elemzése (5/5)...', phase: 'visual' });

        const visualQuery = buildQueryWithVision(visionShort, LOGO_VISUAL_PROMPT);
        const visualResponse = await queryBrandguideAI(visualQuery);
        console.log('[ANALYZE] Round 5 response received, length:', visualResponse.answer.length);

        const visualData = parseJsonResponse(visualResponse.answer, 'Visual');
        console.log('[ANALYZE] Visual JSON keys:', Object.keys(visualData));

        // Parse visual language analysis
        let vizualisNyelv: VisualLanguageAnalysis | undefined;
        vizualisNyelv = {
          formak: (visualData.formak as string) || '',
          arculatiElemek: (visualData.arculatiElemek as string) || '',
          stilusEgyseg: (visualData.stilusEgyseg as string) || '',
          javaslatok: Array.isArray(visualData.javaslatok) ? visualData.javaslatok.filter((j): j is string => typeof j === 'string' && j.length > 0) : [],
        };

        analysisData = {
          szempontok: parsedScores,
          osszegzes,
          erossegek: erossegek.length > 0 ? erossegek : ['Az elemzés nem tartalmazott külön erősségeket'],
          fejlesztendo: fejlesztendo.length > 0 ? fejlesztendo : ['Az elemzés nem tartalmazott külön fejlesztendő területeket'],
          szinek,
          tipografia,
          vizualisNyelv,
        };

      } catch (error) {
        if (error instanceof BrandguideAPIError) {
          console.error('brandguideAI error:', error.code, error.message);
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

      // Calculate final score
      const score = calculateScore(analysisData.szempontok as Record<string, { pont: number }>);
      const rating = getRatingFromScore(score);

      // Build the result object
      const result: AnalysisResult & { sources?: BrandguideResponse['sources'] } = {
        id: '',
        osszpontszam: score,
        minosites: rating,
        szempontok: analysisData.szempontok as AnalysisResult['szempontok'],
        erossegek: analysisData.erossegek,
        fejlesztendo: analysisData.fejlesztendo,
        osszegzes: analysisData.osszegzes,
        szinek: analysisData.szinek,
        tipografia: analysisData.tipografia,
        vizualisNyelv: analysisData.vizualisNyelv,
        createdAt: new Date().toISOString(),
        testLevel: 'detailed', // Keep for backwards compatibility
      };

      // Add sources from brandguideAI (from scoring response)
      if (scoringResponse.sources && scoringResponse.sources.length > 0) {
        result.sources = scoringResponse.sources;
      }

      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      // Save to Supabase
      const { data: insertedData, error: dbError } = await getSupabase()
        .from('analyses')
        .insert({
          result: result as unknown as Record<string, unknown>,
          logo_base64: logo,
          test_level: 'detailed',
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
