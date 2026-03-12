import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import {
  analysisCompleteEmail,
  adminAnalysisCompleteEmail,
  consultationConfirmationEmail,
  consultationBookingEmail,
} from '@/lib/email/templates';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'teamai@brandguide.hu';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * POST /api/email/send-completion
 *
 * Client-callable endpoint — a feldolgozás oldal hívja elemzés befejezésekor.
 * Nem igényel EDGE_FUNCTION_SECRET-et (mint az analysis-notify),
 * de validálja, hogy az elemzés tényleg kész és friss.
 *
 * Ez a fallback arra az esetre, ha a Supabase Edge Function email callback-je
 * nem működik (pl. hiányzó env var).
 */
export async function POST(req: NextRequest) {
  try {
    const { analysisId } = await req.json() as { analysisId?: string };

    if (!analysisId) {
      return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Fetch analysis data
    const { data: analysis, error: analysisError } = await (admin
      .from('analyses') as any)
      .select('user_id, logo_name, tier, logo_thumbnail_path, result, status, completed_at, creator_name')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      console.error('[SEND-COMPLETION] Analysis not found:', analysisError);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Must be completed
    if (analysis.status !== 'completed') {
      return NextResponse.json({ error: 'Analysis not completed yet' }, { status: 400 });
    }

    // Time check: only send for analyses completed within the last 15 minutes (anti-abuse)
    if (analysis.completed_at) {
      const completedAt = new Date(analysis.completed_at);
      const minutesSince = (Date.now() - completedAt.getTime()) / (1000 * 60);
      if (minutesSince > 15) {
        console.log(`[SEND-COMPLETION] Skipping: completed ${minutesSince.toFixed(1)} minutes ago`);
        return NextResponse.json({ success: true, skipped: 'too_old' });
      }
    }

    // Fetch user profile
    const { data: profile } = await (admin
      .from('profiles') as any)
      .select('email, name, display_name')
      .eq('id', analysis.user_id)
      .single();

    // Fallback: auth.users email (Stripe webhook sets it there)
    let userEmail = profile?.email as string | undefined;
    if (!userEmail) {
      try {
        const { data: { user: authUser } } = await admin.auth.admin.getUserById(analysis.user_id);
        userEmail = authUser?.email || undefined;
        console.log(`[SEND-COMPLETION] Profile email empty, auth.users email: ${userEmail || 'NINCS'}`);
      } catch {
        console.warn('[SEND-COMPLETION] Failed to fetch auth user email');
      }
    }

    const userName = (profile?.display_name || profile?.name || analysis.creator_name || 'Kedves Felhasználó') as string;
    const logoName = (analysis.logo_name || 'Névtelen logó') as string;
    const score = (analysis.result?.osszpontszam || 0) as number;
    const tier = analysis.tier as string;

    // Build thumbnail URL
    let logoThumbnailUrl: string | undefined;
    if (analysis.logo_thumbnail_path) {
      logoThumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${analysis.logo_thumbnail_path}`;
    }

    const resultUrl = `${APP_URL}/eredmeny/${analysisId}`;
    const emailResults: string[] = [];

    // 1. User email: analysis complete
    if (userEmail) {
      const { subject, html } = analysisCompleteEmail({
        name: userName,
        logoName,
        score,
        resultUrl,
        logoThumbnailUrl,
      });
      const result = await sendEmail({ to: userEmail, subject, html });
      emailResults.push(`user-complete: ${result.success ? 'OK' : result.error}`);
    }

    // 2. Admin email: analysis complete
    {
      const { subject, html } = adminAnalysisCompleteEmail({
        userName,
        userEmail: userEmail || 'ismeretlen',
        logoName,
        score,
        analysisId,
      });
      const result = await sendEmail({ to: ADMIN_EMAIL, subject, html });
      emailResults.push(`admin-complete: ${result.success ? 'OK' : result.error}`);
    }

    // 3. If consultation tier: extra emails (Ultra)
    if (tier === 'consultation') {
      // User: consultation confirmation
      if (userEmail) {
        const { subject, html } = consultationConfirmationEmail({
          name: userName,
          logoName,
          score,
          resultUrl,
        });
        const result = await sendEmail({ to: userEmail, subject, html });
        emailResults.push(`user-consultation: ${result.success ? 'OK' : result.error}`);
      }

      // Admin: consultation booking notification
      {
        const { subject, html } = consultationBookingEmail({
          userName,
          userEmail: userEmail || 'ismeretlen',
          logoName,
          score,
          adminUrl: `${APP_URL}/admin`,
        });
        const result = await sendEmail({ to: ADMIN_EMAIL, subject, html });
        emailResults.push(`admin-consultation: ${result.success ? 'OK' : result.error}`);
      }
    }

    console.log(`[SEND-COMPLETION] ${analysisId} (${tier}):`, emailResults.join(', '));
    return NextResponse.json({ success: true, emails: emailResults });

  } catch (err) {
    console.error('[SEND-COMPLETION] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
