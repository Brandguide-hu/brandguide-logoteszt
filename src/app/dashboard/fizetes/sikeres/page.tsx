'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';

function SikeresContent() {
  const router = useRouter();
  const params = useSearchParams();
  const analysisId = params.get('analysis_id');

  useEffect(() => {
    // Auto-redirect after 3 seconds
    if (analysisId) {
      const timer = setTimeout(() => {
        router.push(`/dashboard/${analysisId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [analysisId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sikeres fizetes!</h1>
        <p className="text-gray-500 mb-6">
          A fizetesed feldolgozasa megtortent. Az elemzes hamarosan elindul.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Automatikus atiranyitas...
        </p>
        <button
          onClick={() => router.push(analysisId ? `/dashboard/${analysisId}` : '/dashboard')}
          className="px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors"
        >
          Elemzes megtekintese
        </button>
      </div>
    </div>
  );
}

export default function SikeresPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      }>
        <SikeresContent />
      </Suspense>
    </AppLayout>
  );
}
