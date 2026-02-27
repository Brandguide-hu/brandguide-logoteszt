import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { processVisualAnalysis } from '@/lib/analysis/visual-processor';

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return null;
  return user.id;
}

interface AnalysisRecord {
  id: string;
  status: string;
  result: unknown;
  user_id: string;
  logo_base64: string | null;
  logo_original_path: string | null;
  visual_analysis: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params;

  const adminId = await verifyAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get('force') === 'true';
  const supabase = getSupabaseAdmin();

  const { data, error: fetchError } = await supabase
    .from('analyses')
    .select('id, status, result, user_id, logo_base64, logo_original_path, visual_analysis')
    .eq('id', analysisId)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const analysis = data as unknown as AnalysisRecord;

  if (analysis.status !== 'completed' || !analysis.result) {
    return NextResponse.json(
      { error: 'Analysis must be completed before generating visual analysis' },
      { status: 400 }
    );
  }

  if (analysis.visual_analysis && !force) {
    return NextResponse.json(
      {
        error: 'ALREADY_EXISTS',
        message: 'Vizuális elemzés már létezik. Használd a force=true paramétert az újrageneráláshoz.',
        visual_url: `/dashboard/${analysisId}/visual`,
      },
      { status: 409 }
    );
  }

  try {
    let imageBuffer: Buffer;

    if (analysis.logo_base64) {
      imageBuffer = Buffer.from(analysis.logo_base64, 'base64');
    } else if (analysis.logo_original_path) {
      // Fallback: letöltés Supabase Storage-ból
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

    const result = await processVisualAnalysis(
      analysisId,
      analysis.user_id,
      imageBuffer
    );

    return NextResponse.json({
      success: true,
      analysis_id: analysisId,
      visual_url: `/dashboard/${analysisId}/visual`,
      generated_at: new Date().toISOString(),
      stats: {
        processing_time_ms: result.processingTimeMs,
        images_generated: result.imagesGenerated,
      },
    });
  } catch (err) {
    console.error('[visual-analysis] Processing error:', err);
    return NextResponse.json(
      { error: 'Visual analysis processing failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}
