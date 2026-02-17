'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { TIER_INFO, CRITERIA_META, Tier } from '@/types';
import { Target04, Zap, Grid01, Lightbulb05, Clock, Globe01, Eye, CheckCircle } from '@untitledui/icons';

// Statikus minta adatok a bento boxhoz
const SAMPLE_SCORES = {
  megkulonboztethetoseg: 78,
  egyszeruseg: 82,
  alkalmazhatosag: 75,
  emlekezetesseg: 70,
  idotallosag: 68,
  univerzalitas: 72,
  lathatosag: 80,
};

const SAMPLE_TOTAL = 75;

const SAMPLE_SUGGESTION = "A logó kontrasztja fokozható lenne a jobb láthatóság érdekében. Érdemes tesztelni kisebb méretben is, hogy az ikonikus elemek felismerhetők maradnak-e.";

const SAMPLE_COLORS = [
  { hex: '#2563EB', name: 'Bizalom', meaning: 'Megbízhatóság és professzionalizmus' },
  { hex: '#1E40AF', name: 'Mélység', meaning: 'Stabilitás és tekintély' },
];

const SAMPLE_TYPOGRAPHY = "A választott sans-serif modern, jól olvasható. Kiváló választás digitális felületekre.";

// Tier összehasonlító adatok
const TIER_COMPARISON: { feature: string; free: boolean | string; paid: boolean | string; consultation: boolean | string }[] = [
  { feature: 'Összpontszám', free: true, paid: true, consultation: true },
  { feature: '7 szempont pontszámai', free: true, paid: true, consultation: true },
  { feature: 'Radar chart', free: true, paid: true, consultation: true },
  { feature: 'Szöveges indoklások', free: false, paid: true, consultation: true },
  { feature: 'Fejlesztési javaslatok', free: false, paid: true, consultation: true },
  { feature: 'Színelemzés', free: false, paid: true, consultation: true },
  { feature: 'Tipográfia elemzés', free: false, paid: true, consultation: true },
  { feature: 'Erősségek / Fejlesztendő', free: false, paid: true, consultation: true },
  { feature: 'Megosztható link', free: false, paid: true, consultation: true },
  { feature: 'PDF export', free: false, paid: false, consultation: true },
  { feature: 'Szakértői konzultáció', free: false, paid: false, consultation: '20 perc' },
];

// 7 szempont leírások - ikonokkal React komponensként
const CRITERIA_DESCRIPTIONS: { key: string; icon: React.ReactNode; title: string; description: string }[] = [
  { key: 'megkulonboztethetoseg', icon: <Target04 className="w-7 h-7 text-gray-700" />, title: 'Megkülönböztethetőség', description: 'Kitűnik a versenytársak közül' },
  { key: 'egyszeruseg', icon: <Zap className="w-7 h-7 text-gray-700" />, title: 'Egyszerűség', description: 'Minél kevesebb elem, annál jobb' },
  { key: 'alkalmazhatosag', icon: <Grid01 className="w-7 h-7 text-gray-700" />, title: 'Alkalmazhatóság', description: 'Működik minden méretben és felületen' },
  { key: 'emlekezetesseg', icon: <Lightbulb05 className="w-7 h-7 text-gray-700" />, title: 'Megjegyezhetőség', description: 'Egy pillantás alatt megragad' },
  { key: 'idotallosag', icon: <Clock className="w-7 h-7 text-gray-700" />, title: 'Időtlenség', description: 'Nem követ múló trendeket' },
  { key: 'univerzalitas', icon: <Globe01 className="w-7 h-7 text-gray-700" />, title: 'Univerzalitás', description: 'Kulturális korlátokon átível' },
  { key: 'lathatosag', icon: <Eye className="w-7 h-7 text-gray-700" />, title: 'Láthatóság', description: 'Kontrasztos, jól olvasható' },
];

export default function IgyMukodikPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero szekció */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-center sm:px-6 md:pb-32 md:pt-16 lg:px-8">
            <h1 className="text-4xl font-light tracking-tight text-gray-900 md:text-5xl mb-6">
              Így működik az elemzés
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
              Professzionális logó értékelés 7 szempont alapján, AI-támogatással
            </p>
            <button
              onClick={() => router.push('/elemzes/uj?tier=free')}
              className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg"
            >
              Elemzés indítása
            </button>
          </div>
        </section>

        {/* 1. A Módszer szekció */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-500">A Módszer</span>
              <h2 className="text-3xl font-light text-gray-900 md:text-4xl mb-4">Paul Rand-féle logóteszt</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                A LogoLab a világ egyik leghíresebb grafikusától, Paul Rand-tól adoptált módszertant használja,
                hogy objektíven értékelje a logódat.
              </p>
            </div>

            {/* 7 szempont kártyák */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {CRITERIA_DESCRIPTIONS.slice(0, 4).map((item) => (
                <div key={item.key} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                  <div className="flex justify-center mb-4">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {CRITERIA_DESCRIPTIONS.slice(4).map((item) => (
                <div key={item.key} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                  <div className="flex justify-center mb-4">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Mit kapsz az elemzésben? */}
        <section className="py-24 md:py-32 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-500">Csomagok</span>
              <h2 className="text-3xl font-light text-gray-900 md:text-4xl">Mit kapsz az elemzésben?</h2>
            </div>

            {/* Tier összehasonlító táblázat */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-4 text-gray-500 font-medium"></th>
                    <th className="py-4 px-4 text-center">
                      <div className="font-bold text-gray-900">{TIER_INFO.free.label}</div>
                      <div className="text-sm text-gray-500">Publikus</div>
                    </th>
                    <th className="py-4 px-4 text-center bg-yellow-50 rounded-t-xl">
                      <div className="font-bold text-gray-900">{TIER_INFO.paid.label}</div>
                      <div className="text-sm text-gray-500">Privát</div>
                    </th>
                    <th className="py-4 px-4 text-center">
                      <div className="font-bold text-gray-900">{TIER_INFO.consultation.label}</div>
                      <div className="text-sm text-gray-500">Privát</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_COMPARISON.map((row, idx) => (
                    <tr key={row.feature} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-3 px-4 text-gray-700">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        {row.free === true ? (
                          <CheckCircle className="w-5 h-5 text-green-600 inline-block" />
                        ) : row.free === false ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <span className="text-gray-700">{row.free}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center bg-yellow-50">
                        {row.paid === true ? (
                          <CheckCircle className="w-5 h-5 text-green-600 inline-block" />
                        ) : row.paid === false ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <span className="text-gray-700">{row.paid}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.consultation === true ? (
                          <CheckCircle className="w-5 h-5 text-green-600 inline-block" />
                        ) : row.consultation === false ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <span className="text-gray-700">{row.consultation}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Ár sor */}
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-4 px-4 font-semibold text-gray-900">Ár</td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-2xl font-bold text-gray-900">{TIER_INFO.free.price}</span>
                    </td>
                    <td className="py-4 px-4 text-center bg-yellow-50">
                      <span className="text-2xl font-bold text-gray-900">{TIER_INFO.paid.price}</span>
                      <span className="text-sm text-gray-500 block">+ ÁFA</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-2xl font-bold text-gray-900">{TIER_INFO.consultation.price}</span>
                      <span className="text-sm text-gray-500 block">+ ÁFA</span>
                    </td>
                  </tr>
                  {/* CTA sor */}
                  <tr>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => router.push('/elemzes/uj?tier=free')}
                        className="cursor-pointer px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        Kipróbálom
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center bg-yellow-50 rounded-b-xl">
                      <button
                        onClick={() => router.push('/elemzes/uj?tier=paid')}
                        className="cursor-pointer px-5 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
                      >
                        Megrendelem
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => router.push('/elemzes/uj?tier=consultation')}
                        className="cursor-pointer px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        Megrendelem
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 3. Minta elemzések szekció - placeholder amíg nincs featured_analyses */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-500">Példák</span>
              <h2 className="text-3xl font-light text-gray-900 md:text-4xl mb-4">Minta elemzések</h2>
              <p className="text-gray-500">Nézd meg, milyen elemzéseket készítettünk másoknak</p>
            </div>

            {/* Placeholder - később featured_analyses API-ból töltődik */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-6 text-center opacity-50"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-3"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-400 mt-8 text-sm">
              A minta elemzések hamarosan elérhetők lesznek.
            </p>
          </div>
        </section>

        {/* 4. Serfőző Péter & Brandguide szekció */}
        <section className="py-24 md:py-32 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Peti bemutató */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Image
                    src="/sp-avatar.jpg"
                    alt="Serfőző Péter"
                    width={120}
                    height={120}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <blockquote className="text-xl text-gray-700 italic mb-4">
                    &ldquo;A LogoLab mögött 20+ év branding tapasztalat áll.&rdquo;
                  </blockquote>
                  <div className="font-bold text-gray-900">Serfőző Péter</div>
                  <div className="text-gray-500 text-sm mb-4">Brand stratéga, a Brandguide alapítója</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Brandguide könyv szerzője</li>
                    <li>• 200+ branding projekt</li>
                    <li>• Oktató és előadó</li>
                  </ul>
                </div>
              </div>

              {/* Brandguide bemutató */}
              <div className="bg-gray-50 rounded-2xl p-8">
                <Image
                  src="/brandguide-wordmark.svg"
                  alt="Brandguide"
                  width={180}
                  height={40}
                  className="mb-4"
                />
                <p className="text-gray-600 mb-4">
                  A Brandguide Magyarország vezető brand stratégiai műhelye. Segítünk vállalkozásoknak
                  erős, megkülönböztető márkát építeni a stratégiától a vizuális identitásig.
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-6">
                  <li>• Brand stratégia</li>
                  <li>• Vizuális identitás</li>
                  <li>• Brand könyv készítés</li>
                  <li>• Workshop és képzés</li>
                </ul>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/elemzes/uj?tier=consultation')}
                    className="cursor-pointer px-5 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
                  >
                    Személyes konzultációt kérek
                  </button>
                  <a
                    href="https://brandguide.hu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    brandguide.hu →
                  </a>
                </div>
              </div>
            </div>

            {/* AI + Szakértelem */}
            <div className="mt-12 text-center">
              <p className="text-gray-600 max-w-2xl mx-auto">
                A LogoLab az AI erejét kombinálja a professzionális branding módszertannal,
                hogy bárki számára elérhetővé tegye az objektív logó értékelést.
              </p>
            </div>
          </div>
        </section>

        {/* CTA szekció */}
        <section className="py-24 md:py-32 bg-[#1a1a1a]">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-light text-white md:text-4xl mb-6">
              Kíváncsi vagy, mit ér a logód?
            </h2>
            <p className="text-gray-400 mb-10">
              Töltsd fel a logódat és kapj azonnali, objektív visszajelzést.
            </p>
            <button
              onClick={() => router.push('/elemzes/uj?tier=free')}
              className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#FFF012] px-8 py-4 text-base font-medium text-[#1a1a1a] transition-all duration-300 hover:bg-yellow-400 hover:shadow-lg"
            >
              Elemzés indítása
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
