'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const mode = searchParams.get('mode') || 'login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Email icon */}
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ellenőrizd az email fiókodat!
          </h1>

          <p className="text-gray-600 mb-4">
            {mode === 'register'
              ? 'Egy megerősítő linket küldtünk a következő címre:'
              : 'Egy bejelentkezési linket küldtünk a következő címre:'}
          </p>

          {email && (
            <p className="font-semibold text-gray-900 mb-6">{email}</p>
          )}

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 space-y-2">
            <p>A link 15 percig érvényes.</p>
            <p>Ha nem találod az emailt, nézd meg a spam mappát is.</p>
          </div>

          <a
            href="/auth/login"
            className="inline-block mt-6 text-sm text-yellow-600 hover:underline"
          >
            Vissza a bejelentkezéshez
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
