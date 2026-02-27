'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * /dashboard/[id] → redirect to /eredmeny/[id]
 * The old circular-chart layout has been replaced by the new result page.
 */
export default function DashboardDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/eredmeny/${id}`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
    </div>
  );
}
