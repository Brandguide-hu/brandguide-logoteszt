import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { getRebrandingSystemPrompt, buildRebrandingUserPrompt } from '@/lib/prompts';
import { getRatingFromScore } from '@/lib/utils';

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

export async function POST(request: NextRequest) {
  console.log('Rebranding API called');
  console.log('ENV keys:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('SUPABASE')));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey?.length);

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set!');
    return new Response(
      JSON.stringify({ error: 'API kulcs nincs beállítva' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

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

      let fullText = '';

      // Use streaming API with both images
      const streamResponse = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: oldMediaType,
                  data: oldLogo,
                },
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: newMediaType,
                  data: newLogo,
                },
              },
              {
                type: 'text',
                text: buildRebrandingUserPrompt(),
              },
            ],
          },
        ],
        system: getRebrandingSystemPrompt(),
      });

      await sendEvent('status', { message: 'Régi logó elemzése...', phase: 'analyzing_old' });

      let chunkCount = 0;
      for await (const event of streamResponse) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          chunkCount++;

          // Update phase based on progress
          if (chunkCount === 20) {
            await sendEvent('status', { message: 'Új logó elemzése...', phase: 'analyzing_new' });
          } else if (chunkCount === 40) {
            await sendEvent('status', { message: 'Összehasonlítás készítése...', phase: 'comparing' });
          }
        }
      }

      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'comparing' });

      // Parse JSON response
      let analysisData;
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Nem található JSON a válaszban');
        }
        analysisData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', fullText);
        throw new Error('Nem sikerült feldolgozni az elemzést');
      }

      // Calculate actual scores
      const oldScore = calculateScore(analysisData.oldLogoAnalysis.szempontok);
      const newScore = calculateScore(analysisData.newLogoAnalysis.szempontok);
      const successRate = oldScore > 0 ? ((newScore - oldScore) / oldScore) * 100 : 0;

      // Build the result object
      const result: RebrandingResult = {
        id: '',
        type: 'rebranding',
        osszefoglalo: analysisData.osszefoglalo || '',
        oldLogoAnalysis: {
          osszpontszam: oldScore,
          minosites: getRatingFromScore(oldScore),
          szempontok: analysisData.oldLogoAnalysis.szempontok,
          osszegzes: analysisData.oldLogoAnalysis.osszegzes || '',
        },
        newLogoAnalysis: {
          osszpontszam: newScore,
          minosites: getRatingFromScore(newScore),
          szempontok: analysisData.newLogoAnalysis.szempontok,
          osszegzes: analysisData.newLogoAnalysis.osszegzes || '',
        },
        comparison: {
          successRate: Math.round(successRate * 10) / 10,
          criteriaChanges: analysisData.comparison?.criteriaChanges || {},
          improvements: analysisData.comparison?.improvements || [],
          regressions: analysisData.comparison?.regressions || [],
          recommendations: analysisData.comparison?.recommendations || [],
        },
        createdAt: new Date().toISOString(),
      };

      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      // Save to Supabase
      const { data: insertedData, error: dbError } = await getSupabase()
        .from('analyses')
        .insert({
          result: result as unknown as Record<string, unknown>,
          logo_base64: newLogo, // Store the new logo as the primary
          test_level: 'rebranding',
          old_logo_base64: oldLogo, // Store old logo separately
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
