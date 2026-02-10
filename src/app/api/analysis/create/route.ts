import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/analysis/create
 * Bejelentkezett user ingyenes elemzés létrehozása a pending_analyses adatból.
 * A logót átmozgatja temp → végleges helyre, létrehozza az analyses rekordot.
 */
export async function POST(request: NextRequest) {
  try {
    const { pendingAnalysisId } = await request.json();

    if (!pendingAnalysisId) {
      return NextResponse.json({ error: 'Hiányzó pendingAnalysisId' }, { status: 400 });
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-chdtnvaezdilqmmggtml-auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Bejelentkezés szükséges' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Verify user from token
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Érvénytelen token' }, { status: 401 });
    }

    // Get pending analysis
    const { data: pending, error: pendingError } = await (admin
      .from('pending_analyses') as any)
      .select('*')
      .eq('id', pendingAnalysisId)
      .single();

    if (pendingError || !pending) {
      return NextResponse.json({ error: 'Nem található az ideiglenes elemzés' }, { status: 404 });
    }

    // Check if free tier daily limit
    const { data: profile } = await (admin
      .from('profiles') as any)
      .select('last_free_analysis_at, last_free_analysis_ip')
      .eq('id', user.id)
      .single();

    if (pending.tier === 'free' && profile?.last_free_analysis_at) {
      const lastAnalysis = new Date(profile.last_free_analysis_at);
      const now = new Date();
      const hoursSince = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return NextResponse.json({ error: 'Ma már felhasználtad az ingyenes elemzést' }, { status: 429 });
      }
    }

    // Move logo from temp to permanent storage
    const fileExt = pending.logo_temp_path.split('.').pop() || 'png';
    const permanentPath = `${user.id}/${pendingAnalysisId}/original.${fileExt}`;

    // Download from temp
    const { data: tempFile, error: downloadError } = await admin.storage
      .from('logos-temp')
      .download(pending.logo_temp_path);

    if (downloadError || !tempFile) {
      console.error('[CREATE] Download temp error:', downloadError);
      return NextResponse.json({ error: 'Hiba a logó betöltésekor' }, { status: 500 });
    }

    // Upload to permanent
    const fileBuffer = Buffer.from(await tempFile.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from('logos')
      .upload(permanentPath, fileBuffer, {
        contentType: tempFile.type || 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[CREATE] Upload permanent error:', uploadError);
      return NextResponse.json({ error: 'Hiba a logó mentésekor' }, { status: 500 });
    }

    // Move thumbnail if exists
    let thumbnailPath: string | null = null;
    if (pending.logo_thumbnail_temp_path) {
      try {
        const { data: thumbFile } = await admin.storage
          .from('logos-temp')
          .download(pending.logo_thumbnail_temp_path);

        if (thumbFile) {
          thumbnailPath = `${user.id}/${pendingAnalysisId}/thumb.webp`;
          const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer());
          await admin.storage
            .from('logos')
            .upload(thumbnailPath, thumbBuffer, {
              contentType: 'image/webp',
              upsert: false,
            });
        }
      } catch {
        // Thumbnail move failed — non-critical
      }
    }

    // Convert logo to base64 for analysis API
    const base64 = fileBuffer.toString('base64');

    // Create analysis record
    const { data: analysis, error: createError } = await (admin
      .from('analyses') as any)
      .insert({
        id: pendingAnalysisId,
        user_id: user.id,
        tier: pending.tier,
        status: 'pending', // Will be started by user on dashboard
        visibility: pending.tier === 'free' ? 'pending_approval' : 'private',
        logo_name: pending.logo_name || 'Névtelen logó',
        creator_name: pending.creator_name,
        category: pending.category,
        logo_original_path: permanentPath,
        logo_thumbnail_path: thumbnailPath,
        logo_base64: base64,
        test_level: 'detailed',
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[CREATE] Insert analysis error:', createError);
      return NextResponse.json({ error: 'Hiba az elemzés létrehozásakor' }, { status: 500 });
    }

    // Update free analysis timestamp + IP
    if (pending.tier === 'free') {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

      await (admin
        .from('profiles') as any)
        .update({
          last_free_analysis_at: new Date().toISOString(),
          last_free_analysis_ip: clientIp,
        })
        .eq('id', user.id);
    }

    // Clean up temp data
    await (admin.from('pending_analyses') as any).delete().eq('id', pendingAnalysisId);
    await admin.storage.from('logos-temp').remove([
      pending.logo_temp_path,
      ...(pending.logo_thumbnail_temp_path ? [pending.logo_thumbnail_temp_path] : []),
    ]);

    return NextResponse.json({ analysisId: analysis.id });
  } catch (err) {
    console.error('[CREATE] Unexpected error:', err);
    return NextResponse.json({ error: 'Váratlan szerverhiba' }, { status: 500 });
  }
}
