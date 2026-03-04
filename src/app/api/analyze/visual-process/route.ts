/**
 * Internal endpoint for visual analysis processing.
 * Called by the background function after scoring+summary completes.
 * Protected by INTERNAL_API_SECRET (not user auth).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { processVisualAnalysis } from '@/lib/analysis/visual-processor';

interface AnalysisRecord {
  id: string;
  user_id: string;
  logo_base64: string | null;
  logo_original_path: string | null;
  visual_analysis: unknown;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { analysisId, secret } = body as { analysisId: string; secret: string };

  // Verify internal secret
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!analysisId) {
    return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: fetchError } = await (supabase
    .from('analyses') as any)
    .select('id, user_id, logo_base64, logo_original_path, visual_analysis')
    .eq('id', analysisId)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const analysis = data as unknown as AnalysisRecord;

  // Skip if already has visual analysis
  if (analysis.visual_analysis) {
    return NextResponse.json({ success: true, skipped: true, reason: 'already_exists' });
  }

  try {
    let imageBuffer: Buffer;

    if (analysis.logo_base64) {
      imageBuffer = Buffer.from(analysis.logo_base64, 'base64');
    } else if (analysis.logo_original_path) {
      const { data: fileData, error: dlError } = await supabase.storage
        .from('logos')
        .download(analysis.logo_original_path);

      if (dlError || !fileData) {
        return NextResponse.json(
          { error: 'No logo image found', details: 'logo_base64 is null and storage download failed' },
          { status: 400 }
        );
      }
      imageBuffer = Buffer.from(await fileData.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: 'No logo image found', details: 'Both logo_base64 and logo_original_path are null' },
        { status: 400 }
      );
    }

    console.log(`[VISUAL-PROCESS] Starting visual analysis for ${analysisId}`);
    const startTime = Date.now();

    const result = await processVisualAnalysis(
      analysisId,
      analysis.user_id,
      imageBuffer
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[VISUAL-PROCESS] Done in ${elapsed}s — ${result.imagesGenerated} images`);

    return NextResponse.json({
      success: true,
      processing_time_ms: result.processingTimeMs,
      images_generated: result.imagesGenerated,
    });
  } catch (err) {
    console.error('[VISUAL-PROCESS] Processing error:', err);
    return NextResponse.json(
      { error: 'Visual analysis processing failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}
