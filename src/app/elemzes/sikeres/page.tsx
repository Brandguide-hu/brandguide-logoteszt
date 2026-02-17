'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/providers/auth-provider';

function SikeresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const { user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Stripe session-ből adatok kinyerése
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/checkout/session-info?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.email) setEmail(data.email);
          if (data.pendingAnalysisId) setAnalysisId(data.pendingAnalysisId);
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResendCooldown(60);
    try {
      await fetch('/api/auth/resend-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Non-critical
    }
  };

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

  // Nem bejelentkezett user → magic link várakozó + közvetlen indítás gomb
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

            {/* CTA: ha már be tud lépni most → indítsa el direktbe */}
            {analysisId && (
              <a
                href={`/elemzes/feldolgozas/${analysisId}`}
                className="block w-full mb-6 py-3.5 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors"
              >
                Elemzés indítása most →
              </a>
            )}

            {/* Email info - secondary */}
            {email && (
              <p className="text-xs text-gray-400 mb-3">
                Linket is küldtünk a <strong className="text-gray-500">{email}</strong> címre.
              </p>
            )}

            {/* Resend button */}
            {email && (
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className={`text-xs font-medium transition-colors ${
                  resendCooldown > 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                }`}
              >
                {resendCooldown > 0
                  ? `Link újraküldése (${resendCooldown}mp)`
                  : 'Link újraküldése'}
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
