'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { TIER_INFO, Tier } from '@/types';

const TIERS: { key: Tier; highlighted: boolean }[] = [
  { key: 'free', highlighted: false },
  { key: 'paid', highlighted: true },
  { key: 'consultation', highlighted: false },
];

const DETAILED_FEATURES: Record<Tier, { included: string[]; excluded: string[] }> = {
  free: {
    included: [
      'Összpontszám (0-100)',
      '7 szempont pontszámai',
      'Radar chart vizualizáció',
      'Publikus megjelenés a galériában',
      'Naponta 1 elemzés',
    ],
    excluded: [
      'Szöveges indoklás',
      'Javaslatok',
      'Szín, tipográfia, vizuális nyelv elemzés',
      'Erősségek / Fejlesztendő',
      'Megosztható privát link',
      'PDF export',
      'Szakértői konzultáció',
    ],
  },
  paid: {
    included: [
      'Összpontszám (0-100)',
      '7 szempont pontszámai',
      'Radar chart vizualizáció',
      'Szöveges indoklás minden szemponthoz',
      'Konkrét javaslatok',
      'Színpaletta elemzés',
      'Tipográfia elemzés',
      'Vizuális nyelv elemzés',
      'Erősségek / Fejlesztendő lista',
      'Megosztható link',
      'Privát (opcionálisan publikálható)',
    ],
    excluded: [
      'PDF export',
      'Szakértői konzultáció',
    ],
  },
  consultation: {
    included: [
      'Minden a Max csomagból',
      'PDF export',
      '20 perces szakértői konzultáció',
      'Prioritásos feldolgozás',
    ],
    excluded: [],
  },
};

export default function ArakPage() {
  const router = useRouter();

  const handleSelect = (tier: Tier) => {
    router.push(`/elemzes/uj?tier=${tier}`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Árak</h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Válaszd ki a számodra megfelelő csomagot. Minden ár nettó + ÁFA.
            </p>
          </div>

          {/* Tier cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {TIERS.map(({ key, highlighted }) => {
              const info = TIER_INFO[key];
              const features = DETAILED_FEATURES[key];

              return (
                <div
                  key={key}
                  className={`rounded-2xl p-6 transition-all ${
                    highlighted
                      ? 'bg-white border-2 border-[#FFF012] shadow-lg shadow-yellow-100 relative'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FFF012] rounded-full text-xs font-bold text-gray-900">
                      Ajánlott
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">{info.label}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {key === 'free' ? '0' : key === 'paid' ? '1 990' : '24 990'}
                      </span>
                      <span className="text-gray-500 ml-1">
                        {key === 'free' ? 'Ft' : 'Ft + ÁFA'}
                      </span>
                    </div>
                    {key !== 'free' && (
                      <p className="text-sm text-gray-400 mt-1">
                        Bruttó: {info.priceBrutto.toLocaleString('hu-HU')} Ft
                      </p>
                    )}
                  </div>

                  {/* Included features */}
                  <ul className="space-y-3 mb-6">
                    {features.included.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Excluded features */}
                  {features.excluded.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {features.excluded.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <svg className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => handleSelect(key)}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
                      highlighted
                        ? 'bg-[#FFF012] hover:bg-[#e6d810] text-gray-900'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {key === 'free' ? 'Light — hamarosan' : key === 'paid' ? 'Max csomag' : 'Ultra csomag'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Gyakori kérdések
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Milyen formátumban tölthetőm fel a logót?',
                  a: 'PNG, JPG és WebP formátumokat támogatunk, maximum 5MB méretben.',
                },
                {
                  q: 'Mi a különbség az ingyenes és a zárt elemzés között?',
                  a: 'Az ingyenes elemzés megmutatja az össz- és részpontszámokat, radar chartot. A zárt elemzés tartalmazza a szöveges indoklást, javaslatokat, szín/tipográfia/vizuális elemzést, erősségek/fejlesztendő listát és megosztható linket.',
                },
                {
                  q: 'Hogyan történik a fizetés?',
                  a: 'Stripe-on keresztül, bankkártyás fizetéssel. Az összeg a fizetés után azonnal levonásra kerül, és az elemzés elindul.',
                },
                {
                  q: 'Mit tartalmaz a konzultáció?',
                  a: 'A zárt elemzés mellett egy 20 perces online konzultációt egy branddesign szakértővel, aki személyre szabott javaslatokat ad.',
                },
                {
                  q: 'Naponta hány ingyenes elemzést készíthetek?',
                  a: 'Felhasználói fiókonként naponta 1 ingyenes elemzést készíthetsz (24 órás gördülő időszak).',
                },
              ].map((faq, i) => (
                <details key={i} className="bg-white rounded-xl border border-gray-200 group">
                  <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl list-none flex items-center justify-between">
                    {faq.q}
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
