'use client';

import { useState } from 'react';
import type { GeometrySymmetry } from '@/types';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface SymmetryHeatmapProps {
  symmetry: GeometrySymmetry;
}

export function SymmetryHeatmap({ symmetry }: SymmetryHeatmapProps) {
  const [activeView, setActiveView] = useState<'horizontal' | 'vertical'>('horizontal');

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Erős';
    if (score >= 60) return 'Mérsékelt';
    return 'Alacsony';
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">Szimmetria elemzés<InfoTooltip text={TOOLTIPS.geometry.symmetry} /></h3>

      {/* Toggle */}
      <div className="flex gap-1 mb-3 bg-gray-200 rounded-lg p-0.5">
        <button
          onClick={() => setActiveView('horizontal')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors cursor-pointer ${
            activeView === 'horizontal'
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Vízszintes ↔
        </button>
        <button
          onClick={() => setActiveView('vertical')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors cursor-pointer ${
            activeView === 'vertical'
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Függőleges ↕
        </button>
      </div>

      {/* Heatmap image */}
      <div className="aspect-square bg-white rounded-lg overflow-hidden mb-3">
        <img
          src={activeView === 'horizontal' ? symmetry.heatmap_h_path : symmetry.heatmap_v_path}
          alt={`${activeView === 'horizontal' ? 'Vízszintes' : 'Függőleges'} szimmetria hőtérkép`}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Scores */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Vízszintes szimmetria</span>
          <span className={`font-semibold ${getScoreColor(symmetry.horizontal)}`}>
            {symmetry.horizontal}% – {getScoreLabel(symmetry.horizontal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Függőleges szimmetria</span>
          <span className={`font-semibold ${getScoreColor(symmetry.vertical)}`}>
            {symmetry.vertical}% – {getScoreLabel(symmetry.vertical)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Egyezés
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Eltérés
        </span>
      </div>
    </div>
  );
}
