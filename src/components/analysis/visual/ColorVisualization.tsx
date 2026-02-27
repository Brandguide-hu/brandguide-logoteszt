'use client';

import type { VisualColorAnalysis } from '@/types';
import { ContrastMatrix } from './ContrastMatrix';
import { ColorblindSimulation } from './ColorblindSimulation';
import { BackgroundTests } from './BackgroundTests';

interface ColorVisualizationProps {
  data: VisualColorAnalysis;
  logoUrl: string;
}

export function ColorVisualization({ data, logoUrl }: ColorVisualizationProps) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
        </svg>
        <h2 className="text-xl font-light text-gray-900">Szín vizualizációk</h2>
      </div>

      {/* Dominant colors strip */}
      <div className="mb-5">
        <h3 className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-2">Domináns színek</h3>
        <div className="flex rounded-lg overflow-hidden h-10">
          {data.dominant_colors.map((color, idx) => (
            <div
              key={idx}
              className="relative group"
              style={{
                backgroundColor: color.hex,
                width: `${Math.max(color.percentage, 8)}%`,
              }}
              title={`${color.hex} (${color.percentage}%)`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-black/60 text-white">
                  {color.hex}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.dominant_colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="w-3 h-3 rounded-full border border-gray-200"
                style={{ backgroundColor: color.hex }}
              />
              <span className="font-mono">{color.hex}</span>
              <span className="text-gray-400">({color.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ContrastMatrix pairs={data.contrast_matrix} />
        <ColorblindSimulation paths={data.colorblind_paths} />
        <BackgroundTests logoUrl={logoUrl} dominantColors={data.dominant_colors} />
      </div>
    </div>
  );
}
