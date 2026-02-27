'use client';

import type { GeometryAnalysis } from '@/types';
import { BalanceOverlay } from './BalanceOverlay';
import { SymmetryHeatmap } from './SymmetryHeatmap';
import { ComplexityGauge } from './ComplexityGauge';
import { SilhouetteTest } from './SilhouetteTest';

interface GeometryPanelProps {
  data: GeometryAnalysis;
  logoUrl: string;
}

export function GeometryPanel({ data, logoUrl }: GeometryPanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <h2 className="text-xl font-light text-gray-900">Geometriai elemzés</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BalanceOverlay
          balance={data.balance}
          logoUrl={logoUrl}
        />
        <SymmetryHeatmap
          symmetry={data.symmetry}
        />
        <ComplexityGauge
          complexity={data.complexity}
        />
        <SilhouetteTest
          silhouettePath={data.silhouette.silhouette_path}
          logoUrl={logoUrl}
        />
      </div>
    </div>
  );
}
