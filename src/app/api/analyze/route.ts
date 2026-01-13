import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { getSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import { TestLevel, AnalysisResult } from '@/types';
import { getRatingFromScore } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API kulcs nincs beállítva' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const body = await request.json();
  const { logo, mediaType, testLevel, colors } = body as {
    logo: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    testLevel: TestLevel;
    colors?: string[];
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
  const responsePromise = (async () => {
    try {
      // Send initial status
      await sendEvent('status', { message: 'Elemzés indítása...', phase: 'start' });

      let fullText = '';

      // Use streaming API
      const streamResponse = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: logo,
                },
              },
              {
                type: 'text',
                text: buildUserPrompt(testLevel, colors),
              },
            ],
          },
        ],
        system: getSystemPrompt(testLevel),
      });

      await sendEvent('status', { message: 'Claude elemzi a logót...', phase: 'analyzing' });

      // Stream the text chunks
      for await (const event of streamResponse) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          await sendEvent('chunk', { text: event.delta.text });
        }
      }

      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

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

      // Calculate actual score from criteria (override AI's total if wrong)
      const szempontok = analysisData.szempontok;
      const calculatedScore =
        (szempontok.megkulonboztethetoseg?.pont || 0) +
        (szempontok.egyszuruseg?.pont || 0) +
        (szempontok.alkalmazhatosag?.pont || 0) +
        (szempontok.emlekezetesseg?.pont || 0) +
        (szempontok.idotallosasg?.pont || 0) +
        (szempontok.univerzalitas?.pont || 0) +
        (szempontok.lathatosag?.pont || 0);

      // Use calculated score to ensure consistency
      const score = calculatedScore;
      const rating = getRatingFromScore(score);

      // Build the result object
      const result: AnalysisResult = {
        id: '',
        osszpontszam: score,
        minosites: rating,
        szempontok: analysisData.szempontok,
        erossegek: analysisData.erossegek || [],
        fejlesztendo: analysisData.fejlesztendo || [],
        osszegzes: analysisData.osszegzes || '',
        szinek: analysisData.szinek,
        tipografia: analysisData.tipografia,
        createdAt: new Date().toISOString(),
        testLevel,
      };

      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      // Save to Supabase
      const { data: insertedData, error: dbError } = await getSupabase()
        .from('analyses')
        .insert({
          result: result as unknown as Record<string, unknown>,
          logo_base64: logo,
          test_level: testLevel,
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
