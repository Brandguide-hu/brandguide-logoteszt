import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// display_order range-ek
// 0-99   → főoldal (homepage)
// 100-199 → galeria (gallery)
export const HOMEPAGE_OFFSET = 0;
export const GALLERY_OFFSET = 100;

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
  visibility: string | null;
  status: string | null;
}

// Admin helper - check if user is admin
async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin === true;
}

// GET - Minta elemzések lekérdezése (admin részletes nézet)
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Összes featured sor
    const { data: featuredData, error: featuredError } = await admin
      .from('featured_analyses')
      .select('analysis_id, display_order')
      .order('display_order', { ascending: true });

    const featured = featuredData as FeaturedRow[] | null;

    if (featuredError) {
      console.error('[ADMIN FEATURED] Error:', featuredError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Szétválasztás: homepage (0-99), gallery (100-199)
    const homepageFeatured = (featured || []).filter(f => f.display_order < 100);
    const galleryFeatured = (featured || []).filter(f => f.display_order >= 100);

    const allIds = (featured || []).map(f => f.analysis_id);

    let homepageDetails: ReturnType<typeof buildDetails> = [];
    let galleryDetails: ReturnType<typeof buildDetails> = [];

    if (allIds.length > 0) {
      const { data: analysesData } = await admin
        .from('analyses')
        .select('id, logo_name, logo_thumbnail_path, category, result, creator_name, visibility, status')
        .in('id', allIds);

      const analyses = analysesData as AnalysisRow[] | null;
      homepageDetails = buildDetails(homepageFeatured, analyses || [], 0);
      galleryDetails = buildDetails(galleryFeatured, analyses || [], 100);
    }

    return NextResponse.json({
      homepage: homepageDetails,
      gallery: galleryDetails,
      available: await getAvailableAnalyses(),
    });
  } catch (error) {
    console.error('[ADMIN FEATURED] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function buildDetails(
  featured: FeaturedRow[],
  analyses: AnalysisRow[],
  offset: number
) {
  return featured.map(f => {
    const analysis = analyses.find(a => a.id === f.analysis_id);
    if (!analysis) return null;
    const result = analysis.result;
    const totalScore = (result?.osszpiontszam ?? result?.osszpontszam ?? 0) as number;
    return {
      id: f.analysis_id,
      display_order: f.display_order - offset,
      logo_name: analysis.logo_name || 'Névtelen',
      category: analysis.category || 'other',
      total_score: totalScore,
      visibility: analysis.visibility,
      status: analysis.status,
    };
  }).filter(Boolean);
}

// PUT - Minta elemzések frissítése
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { homepage_ids, gallery_ids } = body as {
      homepage_ids: string[];
      gallery_ids: string[];
    };

    if (!Array.isArray(homepage_ids) || !Array.isArray(gallery_ids)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (homepage_ids.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 minta elemzés a főoldalra' }, { status: 400 });
    }

    if (gallery_ids.length > 6) {
      return NextResponse.json({ error: 'Maximum 6 minta elemzés a galériába' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Töröljük a meglévő featured elemzéseket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('featured_analyses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Összegyűjtjük az összes insertet
    const inserts: { analysis_id: string; display_order: number }[] = [];

    homepage_ids.forEach((id, index) => {
      inserts.push({ analysis_id: id, display_order: HOMEPAGE_OFFSET + index });
    });

    gallery_ids.forEach((id, index) => {
      inserts.push({ analysis_id: id, display_order: GALLERY_OFFSET + index });
    });

    // Ha ugyanaz az id mindkét listában van, ne duplikáljuk (analysis_id UNIQUE constraint)
    // A gallery felülírja a homepage bejegyzést ha ugyanaz
    const uniqueInserts = inserts.reduce((acc, item) => {
      const existing = acc.findIndex(i => i.analysis_id === item.analysis_id);
      if (existing >= 0) {
        // Ha már van, ne töröljük — mindkét locationra kerülhet? Nem, UNIQUE constraint van.
        // Megoldjuk: ha ütközik, hagyjuk az alacsonyabb display_order-t (homepage prioritás)
        if (item.display_order < acc[existing].display_order) {
          acc[existing] = item;
        }
      } else {
        acc.push(item);
      }
      return acc;
    }, [] as { analysis_id: string; display_order: number }[]);

    if (uniqueInserts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (admin as any)
        .from('featured_analyses')
        .insert(uniqueInserts);

      if (insertError) {
        console.error('[ADMIN FEATURED] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save featured' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      homepage_count: homepage_ids.length,
      gallery_count: gallery_ids.length,
    });
  } catch (error) {
    console.error('[ADMIN FEATURED] PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper - lekérdezi az összes completed elemzést (nem csak publikus)
async function getAvailableAnalyses() {
  const admin = getSupabaseAdmin();

  const { data: analysesData } = await admin
    .from('analyses')
    .select('id, logo_name, logo_thumbnail_path, category, result, creator_name, visibility, status')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const analyses = analysesData as AnalysisRow[] | null;

  if (!analyses) return [];

  return analyses.map(a => {
    const result = a.result;
    const totalScore = (result?.osszpiontszam ?? result?.osszpontszam ?? 0) as number;

    return {
      id: a.id,
      logo_name: a.logo_name || 'Névtelen',
      category: a.category || 'other',
      total_score: totalScore,
      visibility: a.visibility || 'private',
    };
  });
}
