import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token and get the user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Use admin client to bypass RLS and fetch profile
    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Profile doesn't exist — create it
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await (admin
          .from('profiles') as any)
          .upsert({
            id: user.id,
            email: user.email?.toLowerCase() || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || '',
            is_admin: false,
            is_email_verified: true,
          }, { onConflict: 'id' } as any)
          .select()
          .single();

        if (insertError) {
          console.error('[AUTH] Profile auto-creation error:', insertError);
          return NextResponse.json({ error: 'Profile creation failed' }, { status: 500 });
        }

        return NextResponse.json({ profile: newProfile });
      }

      console.error('[AUTH] Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile fetch failed' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[AUTH] Profile API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
