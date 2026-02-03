import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Get current session from cookies/headers
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ canUse: false, reason: 'not_authenticated' });
    }

    // Check last free analysis time (rolling 24h)
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_free_analysis_at')
      .eq('id', user.id)
      .single();

    if (!profile?.last_free_analysis_at) {
      return NextResponse.json({ canUse: true });
    }

    const lastAnalysis = new Date(profile.last_free_analysis_at);
    const now = new Date();
    const hoursSinceLast = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLast >= 24) {
      return NextResponse.json({ canUse: true });
    }

    const nextAvailable = new Date(lastAnalysis.getTime() + 24 * 60 * 60 * 1000);
    return NextResponse.json({
      canUse: false,
      reason: 'daily_limit',
      nextAvailable: nextAvailable.toISOString(),
    });
  } catch (error) {
    console.error('[CAN-FREE] Error:', error);
    return NextResponse.json({ canUse: true }); // Default to allow on error
  }
}
