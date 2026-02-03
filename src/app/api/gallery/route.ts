import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET: Publikus galéria lekérés
export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('analyses')
    .select('id, logo_name, creator_name, category, logo_thumbnail_path, logo_base64, result, is_weekly_winner, weekly_winner_date, created_at')
    .eq('visibility', 'public')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ analyses: data || [] });
}
