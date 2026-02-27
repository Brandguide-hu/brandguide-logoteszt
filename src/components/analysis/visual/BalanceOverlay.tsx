'use client';

import type { GeometryBalance } from '@/types';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface BalanceOverlayProps {
  balance: GeometryBalance;
  logoUrl: string;
}

export function BalanceOverlay({ balance, logoUrl }: BalanceOverlayProps) {
  const centerX = balance.center_of_mass.x * 100;
  const centerY = balance.center_of_mass.y * 100;

  const getDeviationColor = (deviation: number) => {
    if (deviation < 3) return 'text-emerald-600';
    if (deviation < 8) return 'text-amber-600';
    return 'text-red-600';
  };

  const getDeviationLabel = (deviation: number) => {
    if (deviation < 3) return 'Kiegyensúlyozott';
    if (deviation < 8) return 'Enyhe eltérés';
    return 'Jelentős eltérés';
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">Vizuális egyensúly<InfoTooltip text={TOOLTIPS.geometry.balance} /></h3>

      {/* Logo with overlay markers */}
      <div className="relative aspect-square bg-white rounded-lg overflow-hidden mb-3">
        <img
          src={logoUrl}
          alt="Logo"
          className="absolute inset-0 w-full h-full object-contain p-4"
        />

        {/* Crosshair at geometric center */}
        <div className="absolute inset-0">
          {/* Vertical center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300 opacity-50" />
          {/* Horizontal center line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300 opacity-50" />
        </div>

        {/* Geometric center dot (green) */}
        <div
          className="absolute w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          title="Geometriai közép"
        />

        {/* Center of mass dot (red/orange) */}
        <div
          className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"
          style={{ left: `${centerX}%`, top: `${centerY}%`, transform: 'translate(-50%, -50%)' }}
          title="Vizuális súlypont"
        />

        {/* Line connecting them */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1="50%"
            y1="50%"
            x2={`${centerX}%`}
            y2={`${centerY}%`}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        </svg>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Eltérés</span>
          <span className={`font-semibold ${getDeviationColor(balance.deviation_percent)}`}>
            {balance.deviation_percent}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Értékelés</span>
          <span className={`font-medium ${getDeviationColor(balance.deviation_percent)}`}>
            {getDeviationLabel(balance.deviation_percent)}
          </span>
        </div>
        {balance.direction !== 'centered' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Irány</span>
            <span className="text-gray-700">{balance.direction}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Geometriai közép
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Súlypont
        </span>
      </div>
    </div>
  );
}
