import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data, error } = await getSupabase()
      .from('analyses')
      .select('id, created_at, test_level, result')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Eredmény nem található' },
        { status: 404 }
      );
    }

    // Return clean JSON response
    return NextResponse.json({
      id: data.id,
      created_at: data.created_at,
      test_level: data.test_level,
      result: data.result,
      // Add direct link to result page
      result_url: `https://brandguide-logotest.netlify.app/eredmeny/${data.id}`,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=3600',
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
