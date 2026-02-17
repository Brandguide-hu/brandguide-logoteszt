import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// display_order range-ek (egyezik az admin API-val)
// 0-99   → főoldal (homepage)
// 100-199 → galeria (gallery)

// Típusok
interface FeaturedRow {
  analysis_id: string;
  display_order: number;
}

interface AnalysisRow {
  id: string;
  logo_name: string | null;
  logo_thumbnail_path: string | null;
  category: string | null;
  result: Record<string, unknown> | null;
  creator_name: string | null;
}

// Publikus endpoint - minta elemzések lekérdezése
// ?location=homepage (default) | gallery
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'homepage';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Display_order range a location alapján
    const minOrder = location === 'gallery' ? 100 : 0;
    const maxOrder = location === 'gallery' ? 199 : 99;

    const { data: featuredData, error: featuredError } = await supabase
      .from('featured_analyses')
      .select('analysis_id, display_order')
      .gte('display_order', minOrder)
      .lte('display_order', maxOrder)
      .order('display_order', { ascending: true });

    const featured = featuredData as FeaturedRow[] | null;

    if (featuredError) {
      console.error('[FEATURED] Error fetching featured:', featuredError);
      return NextResponse.json({ analyses: [] });
    }

    if (!featured || featured.length === 0) {
      return NextResponse.json({ analyses: [] });
    }

    // Lekérdezzük az elemzések adatait
    const analysisIds = featured.map(f => f.analysis_id);

    const { data: analysesData, error: analysesError } = await supabase
      .from('analyses')
      .select('id, logo_name, logo_thumbnail_path, category, result, creator_name')
      .in('id', analysisIds);

    const analyses = analysesData as AnalysisRow[] | null;

    if (analysesError) {
      console.error('[FEATURED] Error fetching analyses:', analysesError);
      return NextResponse.json({ analyses: [] });
    }

    // Rendezzük a featured sorrend szerint és formázzuk a választ
    const sortedAnalyses = featured
      .map(f => {
        const analysis = analyses?.find(a => a.id === f.analysis_id);
        if (!analysis) return null;

        const result = analysis.result;
        const totalScore = result?.osszpiontszam ?? result?.osszpontszam ?? 0;

        let logoUrl = '';
        if (analysis.logo_thumbnail_path) {
          logoUrl = `${supabaseUrl}/storage/v1/object/public/logos/${analysis.logo_thumbnail_path}`;
        }

        return {
          id: analysis.id,
          logo_name: analysis.logo_name || 'Névtelen logó',
          logo_url: logoUrl,
          total_score: totalScore as number,
          category: analysis.category || 'other',
          creator_name: analysis.creator_name || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ analyses: sortedAnalyses });
  } catch (error) {
    console.error('[FEATURED] Unexpected error:', error);
    return NextResponse.json({ analyses: [] });
  }
}
