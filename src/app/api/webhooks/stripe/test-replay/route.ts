import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { paymentSuccessWithMagicLinkEmail } from '@/lib/email/templates';
import { TIER_INFO } from '@/types';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/stripe/test-replay
 * DEV ONLY: Replay a checkout.session.completed event by Stripe session ID.
 * Bypasses signature verification — NEVER deploy to production!
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const { sessionId, emailOnly } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  // Fetch the real session from Stripe
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const { pending_analysis_id, tier } = session.metadata || {};
  const customerEmail = session.customer_details?.email;

  if (!pending_analysis_id || !tier || !customerEmail) {
    return NextResponse.json({ error: 'Missing metadata or email', details: { pending_analysis_id, tier, customerEmail } }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Email-only mode: skip pending/logo/analysis, just send email
  if (emailOnly) {
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: customerEmail,
        options: {
          redirectTo: `${appUrl}/auth/confirm?redirect=${encodeURIComponent(`/eredmeny/${pending_analysis_id}`)}`,
        },
      });

      const magicLink = linkData?.properties?.action_link;
      const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO];

      const { subject, html } = paymentSuccessWithMagicLinkEmail({
        tierName: tierInfo?.label || tier,
        amount: new Intl.NumberFormat('hu-HU').format(Math.round((session.amount_total || 0) / 100)),
        date: new Date().toLocaleDateString('hu-HU'),
        magicLink: magicLink || `${appUrl}/auth/login`,
      });

      console.log('[TEST-REPLAY] Email-only mode. Sending to:', customerEmail);
      console.log('[TEST-REPLAY] Amount formatted:', new Intl.NumberFormat('hu-HU').format(Math.round((session.amount_total || 0) / 100)));
      const emailResult = await sendEmail({ to: customerEmail, subject, html });
      console.log('[TEST-REPLAY] Email result:', emailResult);

      return NextResponse.json({
        success: true,
        emailOnly: true,
        emailSent: true,
        formattedAmount: new Intl.NumberFormat('hu-HU').format(Math.round((session.amount_total || 0) / 100)),
        magicLinkGenerated: !!magicLink,
      });
    } catch (err: any) {
      console.error('[TEST-REPLAY] Email-only error:', err);
      return NextResponse.json({ error: 'Email send failed', message: err.message }, { status: 500 });
    }
  }

  try {
    // 1. User keresés/létrehozás
    let userId: string;
    let isNewUser = false;

    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[TEST-REPLAY] Existing user found: ${userId}`);
    } else {
      isNewUser = true;
      const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
      });

      if (createUserError || !newUser?.user) {
        console.error('[TEST-REPLAY] Create user error:', createUserError);
        return NextResponse.json({ error: 'User creation failed', details: createUserError }, { status: 500 });
      }

      userId = newUser.user.id;

      await (admin.from('profiles') as any).upsert({
        id: userId,
        email: customerEmail,
        name: null,
        is_admin: false,
        is_email_verified: true,
        created_via: 'stripe',
      }, { onConflict: 'id' });

      console.log(`[TEST-REPLAY] New user created: ${userId}`);
    }

    // 2. Pending analysis adatok lekérése
    const { data: pending, error: pendingError } = await (admin
      .from('pending_analyses') as any)
      .select('*')
      .eq('id', pending_analysis_id)
      .single();

    if (pendingError || !pending) {
      console.error('[TEST-REPLAY] Pending analysis not found:', pendingError);
      return NextResponse.json({
        error: 'Pending analysis not found',
        details: pendingError,
        hint: 'The pending_analyses record may have been already processed or expired.'
      }, { status: 404 });
    }

    // 3. Logó mozgatás temp → végleges
    const fileExt = pending.logo_temp_path.split('.').pop() || 'png';
    const permanentPath = `${userId}/${pending_analysis_id}/original.${fileExt}`;

    const { data: tempFile, error: downloadError } = await admin.storage
      .from('logos-temp')
      .download(pending.logo_temp_path);

    if (downloadError || !tempFile) {
      console.error('[TEST-REPLAY] Download temp error:', downloadError);
      return NextResponse.json({ error: 'Logo download failed', details: downloadError }, { status: 500 });
    }

    const fileBuffer = Buffer.from(await tempFile.arrayBuffer());

    await admin.storage
      .from('logos')
      .upload(permanentPath, fileBuffer, {
        contentType: tempFile.type || 'image/png',
        upsert: true,
      });

    // Thumbnail mozgatás
    let thumbnailPath: string | null = null;
    if (pending.logo_thumbnail_temp_path) {
      try {
        const { data: thumbFile } = await admin.storage
          .from('logos-temp')
          .download(pending.logo_thumbnail_temp_path);

        if (thumbFile) {
          thumbnailPath = `${userId}/${pending_analysis_id}/thumb.webp`;
          const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer());
          await admin.storage
            .from('logos')
            .upload(thumbnailPath, thumbBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });
        }
      } catch {
        // Non-critical
      }
    }

    // 4. Base64
    const base64 = fileBuffer.toString('base64');

    // 5. Analysis rekord létrehozása
    const shareHash = crypto.randomBytes(16).toString('hex');

    const { error: createAnalysisError } = await (admin
      .from('analyses') as any)
      .insert({
        id: pending_analysis_id,
        user_id: userId,
        tier,
        status: 'processing',
        visibility: 'private',
        logo_name: pending.logo_name || 'Névtelen logó',
        creator_name: pending.creator_name,
        category: pending.category,
        logo_original_path: permanentPath,
        logo_thumbnail_path: thumbnailPath,
        logo_base64: base64,
        share_hash: shareHash,
        result: {},
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_checkout_session_id: session.id,
        stripe_amount: session.amount_total,
        test_level: 'detailed',
      });

    if (createAnalysisError) {
      console.error('[TEST-REPLAY] Create analysis error:', createAnalysisError);
      return NextResponse.json({ error: 'Analysis creation failed', details: createAnalysisError }, { status: 500 });
    }

    // 6. Elemzés indítás háttérben
    console.log('[TEST-REPLAY] Triggering analysis...');
    fetch(`${appUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logo: base64,
        mediaType: tempFile.type || 'image/png',
        testLevel: 'detailed',
        analysisId: pending_analysis_id,
      }),
    }).catch(err => {
      console.error('[TEST-REPLAY] Analysis trigger error:', err);
    });

    // 7. Email küldés
    console.log('[TEST-REPLAY] Generating magic link...');
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${appUrl}/auth/confirm?redirect=${encodeURIComponent(`/eredmeny/${pending_analysis_id}`)}`,
      },
    });

    if (linkError) {
      console.error('[TEST-REPLAY] Magic link error:', linkError);
    }

    const magicLink = linkData?.properties?.action_link;
    console.log('[TEST-REPLAY] Magic link generated:', magicLink ? 'YES' : 'NO');

    const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO];

    const { subject, html } = paymentSuccessWithMagicLinkEmail({
      tierName: tierInfo?.label || tier,
      amount: new Intl.NumberFormat('hu-HU').format(Math.round((session.amount_total || 0) / 100)),
      date: new Date().toLocaleDateString('hu-HU'),
      magicLink: magicLink || `${appUrl}/auth/login`,
    });

    console.log('[TEST-REPLAY] Sending email to:', customerEmail);
    const emailResult = await sendEmail({ to: customerEmail, subject, html });
    console.log('[TEST-REPLAY] Email result:', emailResult);

    // 8. Cleanup temp
    await (admin.from('pending_analyses') as any).delete().eq('id', pending_analysis_id);
    await admin.storage.from('logos-temp').remove([
      pending.logo_temp_path,
      ...(pending.logo_thumbnail_temp_path ? [pending.logo_thumbnail_temp_path] : []),
    ]);

    console.log(`[TEST-REPLAY] ✅ Payment completed: analysis=${pending_analysis_id}, user=${userId}, new=${isNewUser}`);

    return NextResponse.json({
      success: true,
      userId,
      isNewUser,
      analysisId: pending_analysis_id,
      emailSent: true,
      magicLinkGenerated: !!magicLink,
    });

  } catch (err: any) {
    console.error('[TEST-REPLAY] Processing error:', err);
    return NextResponse.json({ error: 'Processing failed', message: err.message }, { status: 500 });
  }
}
