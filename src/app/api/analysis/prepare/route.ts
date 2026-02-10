import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const logoFile = formData.get('logo') as File | null;
    const sessionId = formData.get('sessionId') as string;
    const tier = formData.get('tier') as string;
    const logoName = formData.get('logoName') as string || 'Névtelen logó';
    const creatorName = formData.get('creatorName') as string || null;
    const category = formData.get('category') as string || null;
    const email = formData.get('email') as string || null;
    const userId = formData.get('userId') as string || null;

    // Validation
    if (!logoFile) {
      return NextResponse.json({ error: 'Logó fájl szükséges' }, { status: 400 });
    }
    if (!sessionId || !tier) {
      return NextResponse.json({ error: 'Hiányzó session ID vagy tier' }, { status: 400 });
    }
    if (!['free', 'paid', 'consultation'].includes(tier)) {
      return NextResponse.json({ error: 'Érvénytelen tier' }, { status: 400 });
    }

    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(logoFile.type)) {
      return NextResponse.json({ error: 'Csak PNG, JPG vagy WebP formátum engedélyezett' }, { status: 400 });
    }
    if (logoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maximum 5MB méretű fájl engedélyezett' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const pendingId = randomUUID();

    // Upload logo to temp storage
    const fileExt = logoFile.name.split('.').pop() || 'png';
    const tempPath = `temp/${pendingId}/original.${fileExt}`;

    const fileBuffer = Buffer.from(await logoFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('logos-temp')
      .upload(tempPath, fileBuffer, {
        contentType: logoFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[PREPARE] Upload error:', uploadError);
      return NextResponse.json({ error: 'Hiba a fájl feltöltésekor' }, { status: 500 });
    }

    // Generate thumbnail with Sharp (if available)
    let thumbnailTempPath: string | null = null;
    try {
      const sharp = (await import('sharp')).default;
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer();

      thumbnailTempPath = `temp/${pendingId}/thumb.webp`;
      await supabase.storage
        .from('logos-temp')
        .upload(thumbnailTempPath, thumbnailBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });
    } catch (sharpError) {
      // Sharp not available or error — continue without thumbnail
      console.warn('[PREPARE] Thumbnail generation skipped:', sharpError);
    }

    // Store pending analysis data
    const { error: insertError } = await (supabase
      .from('pending_analyses') as any)
      .insert({
        id: pendingId,
        session_id: sessionId,
        tier,
        logo_temp_path: tempPath,
        logo_thumbnail_temp_path: thumbnailTempPath,
        logo_name: logoName,
        creator_name: creatorName,
        category: category || null,
        email,
        user_id: userId,
      });

    if (insertError) {
      console.error('[PREPARE] Insert error:', insertError);
      return NextResponse.json({ error: 'Hiba az adatok mentésekor' }, { status: 500 });
    }

    return NextResponse.json({ pendingAnalysisId: pendingId });
  } catch (err) {
    console.error('[PREPARE] Unexpected error:', err);
    return NextResponse.json({ error: 'Váratlan szerverhiba' }, { status: 500 });
  }
}
