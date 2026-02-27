'use client';

import { AppIconMockup } from './mockups/AppIconMockup';
import { BusinessCardMockup } from './mockups/BusinessCardMockup';
import { StorefrontMockup } from './mockups/StorefrontMockup';
import { TShirtMockup } from './mockups/TShirtMockup';
import { LetterheadMockup } from './mockups/LetterheadMockup';
import { PhoneMockup } from './mockups/PhoneMockup';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface MockupBentoBoxProps {
  logoUrl: string;
  isTestMode?: boolean;
}

export function MockupBentoBox({ logoUrl, isTestMode = false }: MockupBentoBoxProps) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <h2 className="text-xl font-light text-gray-900 flex items-center gap-1">Így néz ki a logód a valóságban<InfoTooltip text={TOOLTIPS.mockups.section} /></h2>
      </div>

      {isTestMode && (
        <p className="text-xs text-gray-400 mb-4">
          Teszt módban mind a 6 mockup látható. Éles módban 2 ingyenes + 4 zárolt.
        </p>
      )}

      {/* Bento grid layout */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* App ikon - nagy */}
        <div className="col-span-1 row-span-1">
          <AppIconMockup logoUrl={logoUrl} />
        </div>

        {/* Póló */}
        <div className="col-span-1 row-span-1">
          <TShirtMockup logoUrl={logoUrl} />
        </div>

        {/* Névjegykártya */}
        <div className="col-span-1 row-span-1">
          <BusinessCardMockup logoUrl={logoUrl} />
        </div>

        {/* Üzletportál */}
        <div className="col-span-1 row-span-1">
          <StorefrontMockup logoUrl={logoUrl} />
        </div>

        {/* Levélpapír */}
        <div className="col-span-1 row-span-1">
          <LetterheadMockup logoUrl={logoUrl} />
        </div>

        {/* Telefon */}
        <div className="col-span-1 row-span-1">
          <PhoneMockup logoUrl={logoUrl} />
        </div>
      </div>
    </div>
  );
}
