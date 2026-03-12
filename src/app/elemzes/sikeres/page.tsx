'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/providers/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { pushToDataLayer } from '@/lib/gtm';

function SikeresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const { user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [magicLinkToken, setMagicLinkToken] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Stripe session-ből adatok kinyerése + magic link token
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/checkout/session-info?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.email) setEmail(data.email);
          if (data.pendingAnalysisId) setAnalysisId(data.pendingAnalysisId);
          if (data.magicLinkToken) setMagicLinkToken(data.magicLinkToken);

          // GTM purchase conversion event
          if (data.status === 'paid' && data.amountTotal) {
            pushToDataLayer('purchase', {
              transaction_id: sessionId,
              tier: data.tier,
              value: data.amountTotal / 100, // fillér → HUF
              currency: (data.currency || 'huf').toUpperCase(),
            });
          }
        })
        .catch(() => {});
    }
  }, [sessionId]);

  // Bejelentkezett user + analysisId megvan → azonnal redirect a streaming oldalra
  useEffect(() => {
    if (authLoading || !user || !analysisId || isRedirecting) return;
    setIsRedirecting(true);
    router.push(`/elemzes/feldolgozas/${analysisId}`);
  }, [authLoading, user, analysisId, isRedirecting, router]);

  // Auto-login + redirect az elemzéshez
  const handleStartAnalysis = useCallback(async () => {
    if (!analysisId || isLoggingIn) return;
    setIsLoggingIn(true);

    // Próbáljuk meg a magic link tokennel bejelentkeztetni
    if (magicLinkToken) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.verifyOtp({
          token_hash: magicLinkToken,
          type: 'magiclink',
        });
        if (!error) {
          console.log('[SIKERES] Auto-login successful');
          router.push(`/elemzes/feldolgozas/${analysisId}`);
          return;
        }
        console.warn('[SIKERES] Auto-login failed:', error.message);
      } catch (err) {
        console.warn('[SIKERES] Auto-login error:', err);
      }
    }

    // Fallback: navigálás auth nélkül (az elemzés UUID-vel azonosított)
    router.push(`/elemzes/feldolgozas/${analysisId}`);
  }, [analysisId, magicLinkToken, isLoggingIn, router]);

  // Loading state
  if (authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
        </div>
      </AppLayout>
    );
  }

  // Bejelentkezett user → auto-redirect nézet
  if (user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              {/* Success icon */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Fizetés sikeres!
              </h1>

              <p className="text-gray-500 mb-6">
                Az elemzésed elkészül, mindjárt átirányítunk...
              </p>

              {/* Processing info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 text-blue-700 text-sm font-medium">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Elemzés készül...
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Nem bejelentkezett user → közvetlen indítás gomb (auto-login)
  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Success icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Fizetés sikeres!
            </h1>

            <p className="text-2xl font-bold text-gray-900 mb-2">
              Már nagyon közel vagy!
            </p>
            <p className="text-gray-500 mb-6">
              Nyisd meg az elemzésedet, és indulhat az értékelés.
            </p>

            {/* CTA: auto-login + redirect */}
            {analysisId && (
              <button
                onClick={handleStartAnalysis}
                disabled={isLoggingIn}
                className="block w-full mb-6 py-3.5 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoggingIn ? 'Bejelentkezés...' : 'Elemzés indítása most →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function SikeresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    }>
      <SikeresContent />
    </Suspense>
  );
}
