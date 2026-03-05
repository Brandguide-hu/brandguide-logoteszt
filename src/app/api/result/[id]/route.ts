import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('analyses')
      .select('id, created_at, test_level, result, logo_base64, status, logo_original_path, logo_thumbnail_path, logo_name, creator_name, category, tier, visual_analysis, brief')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Eredmény nem található' },
        { status: 404 }
      );
    }

    // Only cache fully completed analyses (scoring + visual analysis for paid tiers)
    const isCompleted = data.result && typeof data.result === 'object' && 'osszpontszam' in data.result;
    const isPaidTier = data.tier === 'paid' || data.tier === 'consultation';
    const isFullyComplete = isCompleted && (!isPaidTier || data.visual_analysis);
    const cacheControl = isFullyComplete ? 'public, max-age=3600' : 'no-store';

    // Percentile calculation via RPC
    let topPercent: number | null = null;
    const resultObj = data.result as Record<string, unknown> | null;
    if (resultObj?.osszpontszam && typeof resultObj.osszpontszam === 'number') {
      const { data: percData } = await getSupabaseAdmin()
        .rpc('get_score_percentile', { target_score: Math.round(resultObj.osszpontszam as number) });
      topPercent = typeof percData === 'number' ? percData : null;
    }

    // Return clean JSON response
    return NextResponse.json({
      id: data.id,
      created_at: data.created_at,
      test_level: data.test_level,
      result: data.result,
      logo_base64: data.logo_base64,
      status: data.status,
      logo_original_path: data.logo_original_path,
      logo_thumbnail_path: data.logo_thumbnail_path,
      logo_name: data.logo_name,
      creator_name: data.creator_name,
      category: data.category,
      tier: data.tier,
      visual_analysis: data.visual_analysis,
      brief: data.brief,
      top_percent: topPercent,
      result_url: `https://logolab.hu/eredmeny/${data.id}`,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': cacheControl,
      },
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Szerverhiba' },
      { status: 500 }
    );
  }
}
