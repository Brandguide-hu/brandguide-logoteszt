import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface VisualAnalysisRecord {
  id: string;
  logo_name: string;
  result: unknown;
  visual_analysis: unknown;
  logo_base64: string | null;
  created_at: string;
  creator_name: string | null;
  category: string | null;
  tier: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('analyses')
    .select('id, logo_name, result, visual_analysis, logo_base64, created_at, creator_name, category, tier')
    .eq('id', analysisId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const analysis = data as unknown as VisualAnalysisRecord;

  if (!analysis.visual_analysis) {
    return NextResponse.json({ error: 'Visual analysis not available' }, { status: 404 });
  }

  const logoUrl = analysis.logo_base64
    ? `data:image/png;base64,${analysis.logo_base64}`
    : null;

  return NextResponse.json({
    analysis: {
      id: analysis.id,
      logo_name: analysis.logo_name,
      overall_score: (analysis.result as Record<string, unknown>)?.osszpontszam ?? null,
      result: analysis.result,
      visual_analysis: analysis.visual_analysis,
      logo_url: logoUrl,
      created_at: analysis.created_at,
      creator_name: analysis.creator_name,
      category: analysis.category,
      tier: analysis.tier,
    },
  });
}
