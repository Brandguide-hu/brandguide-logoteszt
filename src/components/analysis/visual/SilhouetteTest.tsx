'use client';

import { useState } from 'react';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface SilhouetteTestProps {
  silhouettePath: string;
  logoUrl: string;
}

export function SilhouetteTest({ silhouettePath, logoUrl }: SilhouetteTestProps) {
  const [showOriginal, setShowOriginal] = useState(true);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">Sziluett-teszt<InfoTooltip text={TOOLTIPS.geometry.silhouette} /></h3>

      {/* Toggle */}
      <div className="flex gap-1 mb-3 bg-gray-200 rounded-lg p-0.5">
        <button
          onClick={() => setShowOriginal(true)}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors cursor-pointer ${
            showOriginal
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Eredeti
        </button>
        <button
          onClick={() => setShowOriginal(false)}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors cursor-pointer ${
            !showOriginal
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sziluett
        </button>
      </div>

      {/* Image */}
      <div className="aspect-square bg-white rounded-lg overflow-hidden mb-3">
        <img
          src={showOriginal ? logoUrl : silhouettePath}
          alt={showOriginal ? 'Eredeti logó' : 'Logó sziluett'}
          className="w-full h-full object-contain p-4"
        />
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        A sziluett-teszt megmutatja, hogy a logó felismerhető-e szín nélkül is.
        Egy erős logó alakja önmagában is egyedi és megkülönböztethető.
      </p>
    </div>
  );
}
