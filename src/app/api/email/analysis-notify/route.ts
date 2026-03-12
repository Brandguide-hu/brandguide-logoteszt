import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import {
  analysisCompleteEmail,
  adminAnalysisCompleteEmail,
  adminAnalysisFailedEmail,
  consultationConfirmationEmail,
  consultationBookingEmail,
} from '@/lib/email/templates';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'teamai@brandguide.hu';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * POST /api/email/analysis-notify
 *
 * Callback endpoint — az Edge Function és /api/analyze hívja elemzés végén.
 * Küld email értesítőket a usernek és az adminnak.
 */
export async function POST(req: NextRequest) {
  // Auth: shared secret
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.EDGE_FUNCTION_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { analysisId, status, errorMessage } = await req.json() as {
    analysisId: string;
    status: 'completed' | 'failed';
    errorMessage?: string;
  };

  if (!analysisId || !status) {
    return NextResponse.json({ error: 'Missing analysisId or status' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    // Fetch analysis data
    const { data: analysis, error: analysisError } = await (admin
      .from('analyses') as any)
      .select('user_id, logo_name, tier, logo_thumbnail_path, result, creator_name')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      console.error('[EMAIL-NOTIFY] Analysis not found:', analysisError);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
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
        console.log(`[EMAIL-NOTIFY] Profile email empty, auth.users email: ${userEmail || 'NINCS'}`);
      } catch {
        console.warn('[EMAIL-NOTIFY] Failed to fetch auth user email');
      }
    }

    const userName = (profile?.display_name || profile?.name || analysis.creator_name || 'Kedves Felhasználó') as string;
    const logoName = (analysis.logo_name || 'Névtelen logó') as string;
    const score = (analysis.result?.osszpontszam || 0) as number;
    const tier = analysis.tier as string;

    // Build thumbnail URL (Supabase storage public URL)
    let logoThumbnailUrl: string | undefined;
    if (analysis.logo_thumbnail_path) {
      logoThumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${analysis.logo_thumbnail_path}`;
    }

    const resultUrl = `${APP_URL}/eredmeny/${analysisId}`;
    const emailResults: string[] = [];

    if (status === 'completed') {
      // 1. User email: analysisCompleteEmail
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

      // 2. Admin email: adminAnalysisCompleteEmail (with tier + timing)
      {
        const timing = (analysis.result?._timing || {}) as { scoring?: string; summary?: string };
        const tierLabel = tier === 'free' ? 'Light' : tier === 'paid' ? 'Max' : tier === 'consultation' ? 'Ultra' : tier;

        const { subject, html } = adminAnalysisCompleteEmail({
          userName,
          userEmail: userEmail || 'ismeretlen',
          logoName,
          score,
          analysisId,
          tier: tierLabel,
          timing,
        });
        const result = await sendEmail({ to: ADMIN_EMAIL, subject, html });
        emailResults.push(`admin-complete: ${result.success ? 'OK' : result.error}`);
      }

      // 3. If consultation tier: extra emails
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
    } else if (status === 'failed') {
      // Admin email: analysis failed notification
      const { subject, html } = adminAnalysisFailedEmail({
        userName,
        userEmail: userEmail || 'ismeretlen',
        logoName,
        analysisId,
        errorMessage: errorMessage || 'Ismeretlen hiba',
      });
      const result = await sendEmail({ to: ADMIN_EMAIL, subject, html });
      emailResults.push(`admin-failed: ${result.success ? 'OK' : result.error}`);
    }

    console.log(`[EMAIL-NOTIFY] ${analysisId} (${status}):`, emailResults.join(', '));
    return NextResponse.json({ success: true, emails: emailResults });

  } catch (err) {
    console.error('[EMAIL-NOTIFY] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
