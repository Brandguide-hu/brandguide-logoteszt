/**
 * Public endpoint for lazy visual analysis triggering.
 * Called by the result page when tier is paid/consultation and visual_analysis is missing.
 * No auth required — protected by tier check + idempotency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { processVisualAnalysis } from '@/lib/analysis/visual-processor';

interface AnalysisRecord {
  id: string;
  user_id: string;
  tier: string;
  logo_base64: string | null;
  logo_original_path: string | null;
  visual_analysis: unknown;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { analysisId } = body as { analysisId: string };

  if (!analysisId) {
    return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: fetchError } = await (supabase
    .from('analyses') as any)
    .select('id, user_id, tier, logo_base64, logo_original_path, visual_analysis')
    .eq('id', analysisId)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const analysis = data as unknown as AnalysisRecord;

  // Tier check — only paid/consultation get visual analysis
  if (analysis.tier !== 'paid' && analysis.tier !== 'consultation') {
    return NextResponse.json({ error: 'Visual analysis not available for this tier' }, { status: 403 });
  }

  // Idempotency — skip if already exists
  if (analysis.visual_analysis) {
    return NextResponse.json({ success: true, skipped: true });
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
        return NextResponse.json({ error: 'No logo image found' }, { status: 400 });
      }
      imageBuffer = Buffer.from(await fileData.arrayBuffer());
    } else {
      return NextResponse.json({ error: 'No logo image found' }, { status: 400 });
    }

    console.log(`[VISUAL-TRIGGER] Starting for ${analysisId}`);

    const result = await processVisualAnalysis(
      analysisId,
      analysis.user_id,
      imageBuffer
    );

    console.log(`[VISUAL-TRIGGER] Done in ${result.processingTimeMs}ms — ${result.imagesGenerated} images`);

    return NextResponse.json({
      success: true,
      processing_time_ms: result.processingTimeMs,
      images_generated: result.imagesGenerated,
    });
  } catch (err) {
    console.error('[VISUAL-TRIGGER] Error:', err);
    return NextResponse.json(
      { error: 'Visual analysis failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}
