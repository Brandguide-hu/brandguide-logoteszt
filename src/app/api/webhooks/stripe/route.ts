import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { paymentSuccessWithMagicLinkEmail, paymentSuccessEmail } from '@/lib/email/templates';
import { TIER_INFO } from '@/types';
import Stripe from 'stripe';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/stripe
 * v0.91: Stripe webhook — kezeli az account létrehozást, logó mozgatást, elemzés indítást.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { pending_analysis_id, tier } = session.metadata || {};
    const customerEmail = session.customer_details?.email;

    if (!pending_analysis_id || !tier || !customerEmail) {
      console.error('[WEBHOOK] Missing metadata or email', { pending_analysis_id, tier, customerEmail });
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';

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
      } else {
        // Új user létrehozás
        isNewUser = true;
        const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
          email: customerEmail,
          email_confirm: true,
        });

        if (createUserError || !newUser?.user) {
          console.error('[WEBHOOK] Create user error:', createUserError);
          return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
        }

        userId = newUser.user.id;

        // Profil létrehozás
        await (admin.from('profiles') as any).upsert({
          id: userId,
          email: customerEmail,
          name: null,
          is_admin: false,
          is_email_verified: true,
          created_via: 'stripe',
        }, { onConflict: 'id' });
      }

      // 2. Pending analysis adatok lekérése
      const { data: pending, error: pendingError } = await (admin
        .from('pending_analyses') as any)
        .select('*')
        .eq('id', pending_analysis_id)
        .single();

      if (pendingError || !pending) {
        console.error('[WEBHOOK] Pending analysis not found:', pendingError);
        return NextResponse.json({ error: 'Pending analysis not found' }, { status: 404 });
      }

      // 3. Logó mozgatás temp → végleges
      const fileExt = pending.logo_temp_path.split('.').pop() || 'png';
      const permanentPath = `${userId}/${pending_analysis_id}/original.${fileExt}`;

      const { data: tempFile, error: downloadError } = await admin.storage
        .from('logos-temp')
        .download(pending.logo_temp_path);

      if (downloadError || !tempFile) {
        console.error('[WEBHOOK] Download temp error:', downloadError);
        return NextResponse.json({ error: 'Logo download failed' }, { status: 500 });
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

      // 4. Base64 a logóból (elemzés API-nak kell)
      const base64 = fileBuffer.toString('base64');

      // 5. Analysis rekord létrehozása
      const shareHash = crypto.randomBytes(16).toString('hex');

      const { error: createAnalysisError } = await (admin
        .from('analyses') as any)
        .insert({
          id: pending_analysis_id,
          user_id: userId,
          tier,
          status: 'pending',  // Pending marad - a feldolgozás oldal fogja elindítani
          visibility: 'private',
          logo_name: pending.logo_name || 'Névtelen logó',
          creator_name: pending.creator_name,
          category: pending.category,
          logo_original_path: permanentPath,
          logo_thumbnail_path: thumbnailPath,
          logo_base64: base64,
          share_hash: shareHash,
          result: {},  // üres objektum amíg nincs kész
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_checkout_session_id: session.id,
          stripe_amount: session.amount_total,
          test_level: 'detailed',
        });

      if (createAnalysisError) {
        console.error('[WEBHOOK] Create analysis error:', createAnalysisError);
        return NextResponse.json({ error: 'Analysis creation failed' }, { status: 500 });
      }

      // 6. Az elemzést NEM indítjuk itt! A /elemzes/feldolgozas/[id] oldal fogja SSE-vel

      // 7. Email küldés — különböző típus új vs létező usernek
      const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO];
      const formattedAmount = new Intl.NumberFormat('hu-HU').format(Math.round((session.amount_total || 0) / 100));
      const formattedDate = new Date().toLocaleDateString('hu-HU');

      if (isNewUser) {
        // Új user → magic link-es email
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: customerEmail,
          options: {
            redirectTo: `${appUrl}/auth/confirm?redirect=${encodeURIComponent(`/elemzes/feldolgozas/${pending_analysis_id}`)}`,
          },
        });

        const magicLink = linkData?.properties?.action_link;
        const { subject, html } = paymentSuccessWithMagicLinkEmail({
          tierName: tierInfo?.label || tier,
          amount: formattedAmount,
          date: formattedDate,
          magicLink: magicLink || `${appUrl}/auth/login`,
        });

        await sendEmail({ to: customerEmail, subject, html });
      } else {
        // Létező user → egyszerű visszaigazoló email (nincs magic link)
        const { subject, html } = paymentSuccessEmail({
          name: pending.creator_name || 'Kedves Vásárlónk',
          tierName: tierInfo?.label || tier,
          amount: formattedAmount,
          date: formattedDate,
          analysisUrl: `${appUrl}/elemzes/feldolgozas/${pending_analysis_id}`,
        });

        await sendEmail({ to: customerEmail, subject, html });
      }

      // 8. Cleanup temp
      await (admin.from('pending_analyses') as any).delete().eq('id', pending_analysis_id);
      await admin.storage.from('logos-temp').remove([
        pending.logo_temp_path,
        ...(pending.logo_thumbnail_temp_path ? [pending.logo_thumbnail_temp_path] : []),
      ]);

      console.log(`[WEBHOOK] Payment completed: analysis=${pending_analysis_id}, user=${userId}, new=${isNewUser}`);
    } catch (err) {
      console.error('[WEBHOOK] Processing error:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
