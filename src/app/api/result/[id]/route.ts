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
      .select('id, created_at, test_level, result, logo_base64, status, logo_original_path, logo_thumbnail_path')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Eredmény nem található' },
        { status: 404 }
      );
    }

    // Only cache completed analyses (with actual result data)
    const isCompleted = data.result && typeof data.result === 'object' && 'osszpontszam' in data.result;
    const cacheControl = isCompleted ? 'public, max-age=3600' : 'no-store';

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
