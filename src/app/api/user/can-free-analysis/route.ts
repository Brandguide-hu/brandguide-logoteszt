import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

/**
 * GET /api/user/can-free-analysis
 * v0.91: Rolling 24h limit — IP ÉS email ellenőrzés.
 * - Ha be van jelentkezve: IP + email (mindkettőt vizsgáljuk)
 * - Ha nincs bejelentkezve: csak IP
 */
export async function GET(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin();

    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Try to get auth user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId: string | null = null;

    if (token) {
      const { data: { user } } = await admin.auth.getUser(token);
      userId = user?.id || null;
    }

    if (userId) {
      // BEJELENTKEZETT USER: IP ÉS email check
      const { data: profile } = await (admin
        .from('profiles') as any)
        .select('last_free_analysis_at, last_free_analysis_ip')
        .eq('id', userId)
        .single();

      if (!profile?.last_free_analysis_at) {
        return NextResponse.json({ canUse: true });
      }

      const lastAnalysis = new Date(profile.last_free_analysis_at);

      if (lastAnalysis > twentyFourHoursAgo) {
        const nextAvailable = new Date(lastAnalysis.getTime() + 24 * 60 * 60 * 1000);
        return NextResponse.json({
          canUse: false,
          reason: 'daily_limit',
          nextAvailable: nextAvailable.toISOString(),
        });
      }

      // Also check IP — prevent different accounts on same IP
      const ipHash = createHash('sha256').update(clientIp).digest('hex').substring(0, 32);
      if (profile.last_free_analysis_ip === clientIp || profile.last_free_analysis_ip === ipHash) {
        // Same IP, already checked by timestamp above — OK
      }

      // Check if ANY profile from this IP used free analysis in last 24h
      const { data: ipProfiles } = await (admin
        .from('profiles') as any)
        .select('last_free_analysis_at')
        .eq('last_free_analysis_ip', clientIp)
        .gt('last_free_analysis_at', twentyFourHoursAgo.toISOString())
        .limit(1);

      if (ipProfiles && ipProfiles.length > 0) {
        const ipLastAnalysis = new Date(ipProfiles[0].last_free_analysis_at);
        const nextAvailable = new Date(ipLastAnalysis.getTime() + 24 * 60 * 60 * 1000);
        return NextResponse.json({
          canUse: false,
          reason: 'ip_limit',
          nextAvailable: nextAvailable.toISOString(),
        });
      }

      return NextResponse.json({ canUse: true });
    } else {
      // NEM BEJELENTKEZETT USER: csak IP check
      const { data: ipProfiles } = await (admin
        .from('profiles') as any)
        .select('last_free_analysis_at')
        .eq('last_free_analysis_ip', clientIp)
        .gt('last_free_analysis_at', twentyFourHoursAgo.toISOString())
        .limit(1);

      if (ipProfiles && ipProfiles.length > 0) {
        const ipLastAnalysis = new Date(ipProfiles[0].last_free_analysis_at);
        const nextAvailable = new Date(ipLastAnalysis.getTime() + 24 * 60 * 60 * 1000);
        return NextResponse.json({
          canUse: false,
          reason: 'ip_limit',
          nextAvailable: nextAvailable.toISOString(),
        });
      }

      return NextResponse.json({ canUse: true });
    }
  } catch (error) {
    console.error('[CAN-FREE] Error:', error);
    return NextResponse.json({ canUse: true }); // Default to allow on error
  }
}
