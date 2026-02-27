'use client';

import type { ColorblindPaths } from '@/types';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface ColorblindSimulationProps {
  paths: ColorblindPaths;
}

const TYPES = [
  { key: 'protanopia' as const, label: 'Protanópia', description: 'Vörös-vak' },
  { key: 'deuteranopia' as const, label: 'Deuteranópia', description: 'Zöld-vak' },
  { key: 'tritanopia' as const, label: 'Tritanópia', description: 'Kék-vak' },
  { key: 'achromatopsia' as const, label: 'Akromatopszia', description: 'Teljesen színvak' },
];

export function ColorblindSimulation({ paths }: ColorblindSimulationProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">Színvakság szimulációk<InfoTooltip text={TOOLTIPS.color.colorblind} /></h3>

      <div className="grid grid-cols-2 gap-2">
        {TYPES.map(type => (
          <div key={type.key} className="space-y-1">
            <div className="aspect-square bg-white rounded-lg overflow-hidden">
              <img
                src={paths[type.key]}
                alt={`${type.label} szimuláció`}
                className="w-full h-full object-contain p-2"
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-700">{type.label}</p>
              <p className="text-[10px] text-gray-400">{type.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
