'use client';

import type { ContrastPair } from '@/types';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface ContrastMatrixProps {
  pairs: ContrastPair[];
}

export function ContrastMatrix({ pairs }: ContrastMatrixProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">WCAG kontraszt mátrix<InfoTooltip text={TOOLTIPS.color.wcag} /></h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {pairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            {/* Color swatches */}
            <div className="flex gap-0.5 shrink-0">
              <span
                className="w-5 h-5 rounded border border-gray-200"
                style={{ backgroundColor: pair.foreground }}
                title={pair.foreground}
              />
              <span
                className="w-5 h-5 rounded border border-gray-200"
                style={{ backgroundColor: pair.background }}
                title={pair.background}
              />
            </div>

            {/* Ratio */}
            <span className="font-mono text-gray-700 w-12 text-right shrink-0">
              {pair.ratio}:1
            </span>

            {/* WCAG badges */}
            <div className="flex gap-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                pair.wcag_aa
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-600'
              }`}>
                AA {pair.wcag_aa ? '✓' : '✗'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                pair.wcag_aa_large
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-600'
              }`}>
                AA+ {pair.wcag_aa_large ? '✓' : '✗'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        AA: normál szöveg (4.5:1) | AA+: nagy szöveg (3:1)
      </p>
    </div>
  );
}
