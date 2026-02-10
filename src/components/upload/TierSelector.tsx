'use client';

import { Tier, TIER_INFO } from '@/types';
import { cx } from '@/utils/cx';

interface TierSelectorProps {
  selectedTier: Tier | null;
  onSelect: (tier: Tier) => void;
  canUseFree: boolean | null;
  isLoggedIn: boolean;
}

export function TierSelector({ selectedTier, onSelect, canUseFree, isLoggedIn }: TierSelectorProps) {
  const isFreeLimitReached = canUseFree === false;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Válassz csomagot</h2>
      <div className="grid gap-4">
        {(Object.entries(TIER_INFO) as [Tier, typeof TIER_INFO.free][]).map(([tier, info]) => {
          const isDisabled = tier === 'free' && isFreeLimitReached;
          const isSelected = selectedTier === tier;
          const isRecommended = tier === 'paid';

          return (
            <button
              key={tier}
              onClick={() => !isDisabled && onSelect(tier)}
              disabled={isDisabled}
              className={cx(
                'relative w-full text-left p-5 rounded-xl border-2 transition-all cursor-pointer',
                isSelected
                  ? 'border-[#FFF012] bg-yellow-50 shadow-sm'
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Ajánlott badge */}
              {isRecommended && (
                <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-[#FFF012] text-gray-900 text-xs font-semibold rounded-full">
                  Ajánlott
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{info.label}</span>
                <span className="text-sm font-medium text-gray-600">{info.price}</span>
              </div>

              {/* Free limit message */}
              {isDisabled && (
                <p className="text-xs text-orange-600 mb-2">
                  Ma már felhasználtad az ingyenes elemzésed. Holnap újra elérhető!
                </p>
              )}

              <ul className="space-y-1">
                {info.features.map(f => (
                  <li key={f} className="text-sm text-gray-500 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Bruttó ár info */}
              {tier !== 'free' && (
                <p className="text-xs text-gray-400 mt-2">
                  Bruttó: {tier === 'paid' ? '2 527' : '31 737'} Ft
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
