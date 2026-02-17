'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let handled = false;

    const ensureProfile = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      // is_admin szándékosan ki van hagyva — ne írja felül a meglévő admin jogot bejelentkezéskor
      await (supabase.from('profiles') as any).upsert({
        id: user.id,
        email: user.email?.toLowerCase() || '',
        name: (user.user_metadata?.name as string) || user.email?.split('@')[0] || '',
        is_email_verified: true,
      }, { onConflict: 'id' });
    };

    const handleSuccess = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      if (handled) return;
      handled = true;
      await ensureProfile(user);
      setStatus('success');

      // Check for redirect from URL params
      const url = new URL(window.location.href);
      const customRedirect = url.searchParams.get('redirect');
      // 'pending' = lazy-register flow (ingyenes): pendingAnalysisId → streaming oldal
      const pendingAnalysisId = url.searchParams.get('pending');
      // 'analysis' = régi param (fallback)
      const legacyAnalysisId = url.searchParams.get('analysis');

      let redirectUrl = '/dashboard';
      if (customRedirect) {
        redirectUrl = customRedirect;
      } else if (pendingAnalysisId) {
        redirectUrl = `/elemzes/feldolgozas/${pendingAnalysisId}`;
      } else if (legacyAnalysisId) {
        redirectUrl = `/elemzes/feldolgozas/${legacyAnalysisId}`;
      }

      setTimeout(() => router.push(redirectUrl), 1500);
    };

    // Listen for auth state changes — handles hash fragment automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await handleSuccess(session.user);
        }
      }
    );

    const handleConfirm = async () => {
      try {
        // 1. Parse hash fragment (magic link: #access_token=...&refresh_token=...)
        const hash = window.location.hash.substring(1);
        if (hash) {
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error('[AUTH] setSession error:', sessionError);
              if (!handled) {
                setStatus('error');
                setErrorMessage('Érvénytelen vagy lejárt link.');
              }
              return;
            }
            // onAuthStateChange will fire and handle the rest
            return;
          }
        }

        // 2. Try code exchange from URL query params (PKCE flow)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[AUTH] Code exchange error:', exchangeError);
            if (!handled) {
              setStatus('error');
              setErrorMessage('Érvénytelen vagy lejárt link.');
            }
            return;
          }
          // onAuthStateChange will fire and handle the rest
          return;
        }

        // 3. Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AUTH] Confirm getSession error:', error);
          if (!handled) {
            setStatus('error');
            setErrorMessage('Érvénytelen vagy lejárt link.');
          }
          return;
        }

        if (session) {
          await handleSuccess(session.user);
          return;
        }

        // 4. No token found
        if (!handled) {
          setStatus('error');
          setErrorMessage('Hiányzó megerősítő kód.');
        }
      } catch {
        if (!handled) {
          setStatus('error');
          setErrorMessage('Váratlan hiba történt.');
        }
      }
    };

    handleConfirm();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="animate-spin h-8 w-8 text-yellow-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Megerősítés folyamatban...</h1>
              <p className="text-gray-500">Kérlek, várj egy pillanatot.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Sikeresen bejelentkeztél!</h1>
              <p className="text-gray-500">Átirányítunk...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Hiba történt</h1>
              <p className="text-gray-500 mb-6">{errorMessage}</p>
              <a
                href="/auth/login"
                className="inline-block px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Vissza a bejelentkezéshez
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
