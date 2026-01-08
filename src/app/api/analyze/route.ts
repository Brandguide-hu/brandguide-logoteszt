import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import { TestLevel, AnalysisResult } from '@/types';
import { getRatingFromScore } from '@/lib/utils';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually to override any system env vars
function getApiKey(): string | undefined {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      return envConfig.ANTHROPIC_API_KEY;
    }
  } catch (e) {
    console.error('Error reading .env.local:', e);
  }
  return process.env.ANTHROPIC_API_KEY;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();

    console.log('API Key check:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'NOT FOUND');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API kulcs nincs beállítva' },
        { status: 500 }
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
      return NextResponse.json(
        { error: 'Logó megadása kötelező' },
        { status: 400 }
      );
    }

    // Call Claude API
    const message = await anthropic.messages.create({
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

    // Extract text from response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Nem sikerült elemzést kapni a Claude-tól');
    }

    // Parse JSON response
    let analysisData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Nem található JSON a válaszban');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', textContent.text);
      throw new Error('Nem sikerült feldolgozni az elemzést');
    }

    // Validate and ensure rating is correct
    const score = analysisData.osszpontszam;
    const rating = getRatingFromScore(score);

    // Build the result object
    const result: AnalysisResult = {
      id: '', // Will be set after DB insert
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

    // Save to Supabase
    const { data: insertedData, error: dbError } = await supabase
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

    // Update result with ID
    result.id = insertedData.id;

    return NextResponse.json({ id: insertedData.id, result });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ismeretlen hiba' },
      { status: 500 }
    );
  }
}
