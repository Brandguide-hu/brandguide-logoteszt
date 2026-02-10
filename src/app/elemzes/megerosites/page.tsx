'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';

function MegerositesContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !emailParam) return;
    setResendCooldown(60);
    try {
      await fetch('/api/auth/resend-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });
    } catch {
      // Non-critical
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Email icon */}
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Ellenőrizd az emailedet!
            </h1>

            {emailParam && (
              <p className="text-gray-500 mb-2">
                Küldtünk egy linket a <strong className="text-gray-900">{emailParam}</strong> címre.
              </p>
            )}

            <p className="text-gray-500 mb-6">
              Kattints rá, és elindul az elemzésed!
            </p>

            {/* Info box */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
              <p className="text-amber-700 text-sm">
                <strong>Tipp:</strong> Ellenőrizd a spam/promóciók mappát is, ha nem találod a levelet.
              </p>
            </div>

            {/* Resend button */}
            {emailParam && (
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className={`text-sm font-medium transition-colors ${
                  resendCooldown > 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                }`}
              >
                {resendCooldown > 0
                  ? `Újraküldés (${resendCooldown}mp)`
                  : 'Link újraküldése'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function MegerositesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    }>
      <MegerositesContent />
    </Suspense>
  );
}
