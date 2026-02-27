'use client';

import type { GeometryComplexity } from '@/types';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface ComplexityGaugeProps {
  complexity: GeometryComplexity;
}

export function ComplexityGauge({ complexity }: ComplexityGaugeProps) {
  const categoryLabels: Record<string, string> = {
    simple: 'Egyszerű',
    moderate: 'Közepes',
    complex: 'Komplex',
  };

  const categoryColors: Record<string, { bg: string; text: string; bar: string }> = {
    simple: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    moderate: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
    complex: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  };

  const style = categoryColors[complexity.category];

  // Calculate the actual complexity score (same formula as geometry.ts)
  const complexityScore = complexity.entropy * 0.6 + complexity.edge_density * 100 * 0.4;
  // Normalize to 0-100 using max score of 10 (practical max for logos)
  // This aligns the gauge position with the 3 background zones:
  // 0-30% = Egyszerű (score 0-3), 30-55% = Közepes (score 3-5.5), 55-100% = Komplex (score 5.5+)
  const gaugePercent = Math.min(100, (complexityScore / 10) * 100);

  // Individual metric bars (informational)
  const entropyPercent = Math.min(100, (complexity.entropy / 8) * 100);
  const edgeDensityPercent = Math.min(100, complexity.edge_density * 100);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">Komplexitás<InfoTooltip text={TOOLTIPS.geometry.complexity} /></h3>

      {/* Category badge */}
      <div className="flex items-center justify-center mb-4">
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
          {categoryLabels[complexity.category]}
        </span>
      </div>

      {/* Gauge visualization */}
      <div className="relative h-3 bg-gray-200 rounded-full mb-4 overflow-hidden">
        {/* Background zones aligned to score thresholds: 0-3 / 3-5.5 / 5.5-10 */}
        <div className="absolute inset-0 flex">
          <div className="bg-emerald-100" style={{ width: '30%' }} />
          <div className="bg-amber-100" style={{ width: '25%' }} />
          <div className="bg-red-100" style={{ width: '45%' }} />
        </div>
        {/* Indicator */}
        <div
          className={`absolute top-0 h-full rounded-full ${style.bar} transition-all duration-500`}
          style={{ width: `${Math.max(5, gaugePercent)}%` }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>Egyszerű</span>
        <span>Közepes</span>
        <span>Komplex</span>
      </div>

      {/* Detailed stats */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Entrópia</span>
            <span className="text-gray-700 font-medium">{complexity.entropy}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 rounded-full"
              style={{ width: `${entropyPercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Élek sűrűsége</span>
            <span className="text-gray-700 font-medium">{(complexity.edge_density * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 rounded-full"
              style={{ width: `${edgeDensityPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
