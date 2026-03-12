'use client';

import type { GeometryAnalysis } from '@/types';
import { BalanceOverlay } from './BalanceOverlay';
import { SymmetryHeatmap } from './SymmetryHeatmap';
import { ComplexityGauge } from './ComplexityGauge';
import { SilhouetteTest } from './SilhouetteTest';

interface GeometryPanelProps {
  data: GeometryAnalysis;
  logoUrl: string;
  isLight?: boolean;
}

export function GeometryPanel({ data, logoUrl, isLight = false }: GeometryPanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <h2 className="text-xl font-light text-gray-900">Geometriai elemzés</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* BalanceOverlay — Light-ban is szabadon látható */}
        <BalanceOverlay
          balance={data.balance}
          logoUrl={logoUrl}
        />

        {/* Symmetry, Complexity, Silhouette — Light-ban blúrolva */}
        {isLight ? (
          <>
            <div className="relative overflow-hidden rounded-xl">
              <div className="blur-sm select-none pointer-events-none opacity-60">
                <SymmetryHeatmap symmetry={data.symmetry} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <div className="flex flex-col items-center gap-1.5">
                  <svg className="size-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-xs text-gray-400 font-medium">MAX csomag</span>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl">
              <div className="blur-sm select-none pointer-events-none opacity-60">
                <ComplexityGauge complexity={data.complexity} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <div className="flex flex-col items-center gap-1.5">
                  <svg className="size-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-xs text-gray-400 font-medium">MAX csomag</span>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl">
              <div className="blur-sm select-none pointer-events-none opacity-60">
                <SilhouetteTest silhouettePath={data.silhouette.silhouette_path} logoUrl={logoUrl} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <div className="flex flex-col items-center gap-1.5">
                  <svg className="size-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-xs text-gray-400 font-medium">MAX csomag</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <SymmetryHeatmap symmetry={data.symmetry} />
            <ComplexityGauge complexity={data.complexity} />
            <SilhouetteTest silhouettePath={data.silhouette.silhouette_path} logoUrl={logoUrl} />
          </>
        )}
      </div>
    </div>
  );
}
