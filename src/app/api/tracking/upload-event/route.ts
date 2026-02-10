import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/tracking/upload-event
 * Feltöltő oldal funnel event rögzítése (anonim).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, eventType, tier, hasLogo, hasEmail, referrer } = body;

    if (!sessionId || !eventType) {
      return NextResponse.json({ error: 'Hiányzó session ID vagy event type' }, { status: 400 });
    }

    const validEventTypes = [
      'page_view', 'tier_selected', 'logo_selected', 'form_filled',
      'submit_clicked', 'auth_started', 'stripe_redirect', 'completed', 'abandoned',
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Érvénytelen event type' }, { status: 400 });
    }

    // Anonimizált IP hash
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const ipHash = createHash('sha256').update(clientIp).digest('hex').substring(0, 16);

    const supabase = getSupabaseAdmin();

    await (supabase.from('upload_events') as any).insert({
      session_id: sessionId,
      event_type: eventType,
      tier: tier || null,
      has_logo: hasLogo || false,
      has_email: hasEmail || false,
      referrer: referrer || null,
      user_agent: request.headers.get('user-agent') || null,
      ip_hash: ipHash,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Tracking failure should not break the user experience
    console.error('[TRACKING] Error:', err);
    return NextResponse.json({ success: true }); // Always return 200
  }
}
