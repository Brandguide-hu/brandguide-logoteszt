'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';

function MegszakitvaContent() {
  const router = useRouter();
  const params = useSearchParams();
  const analysisId = params.get('analysis_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fizetes megszakitva</h1>
        <p className="text-gray-500 mb-6">
          A fizetes nem tortent meg. Az elemzest barsmikor ujra megkezdheted.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push('/dashboard/uj')}
            className="px-6 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors"
          >
            Uj elemzes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MegszakitvaPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      }>
        <MegszakitvaContent />
      </Suspense>
    </AppLayout>
  );
}
