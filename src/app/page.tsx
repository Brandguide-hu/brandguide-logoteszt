'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Upload, BarChart3, Lightbulb, ArrowRight, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Töltsd fel a logódat',
    description: 'PNG, JPG vagy WebP formátumban, max 5MB',
  },
  {
    icon: BarChart3,
    title: 'Kapj részletes elemzést',
    description: 'A mesterséges intelligencia 7 szempont szerint értékeli',
  },
  {
    icon: Lightbulb,
    title: 'Fejleszd tovább',
    description: 'Konkrét javaslatok a brand erősítéséhez',
  },
];

const criteria = [
  { name: 'Megkülönböztethetőség', points: 20, icon: '🎯' },
  { name: 'Egyszerűség', points: 18, icon: '✨' },
  { name: 'Alkalmazhatóság', points: 15, icon: '📐' },
  { name: 'Emlékezetesség', points: 15, icon: '💡' },
  { name: 'Időtállóság', points: 12, icon: '⏳' },
  { name: 'Univerzalitás', points: 10, icon: '🌍' },
  { name: 'Láthatóság', points: 10, icon: '👁️' },
];

export default function Home() {
  return (
    <div className="bg-bg-secondary">
      {/* Hero Section */}
      <section className="bg-bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-highlight-yellow text-highlight-yellow-text px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span>🎯</span>
              <span>Brandguide 100 pontos rendszer</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
              A logó nem ízlés kérdése
            </h1>

            <p className="text-xl text-text-secondary mb-8 leading-relaxed">
              Szigorú szakmai szempontoknak kell megfelelnie.
              <span className="text-text-primary font-medium"> Mi megmutatjuk, miben erős és miben fejleszthető.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/teszt">
                <Button size="lg" className="w-full sm:w-auto">
                  Teszt indítása
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#hogyan-mukodik">Hogyan működik?</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="hogyan-mukodik" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Hogyan működik?
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              3 egyszerű lépésben megtudhatod, hol tart a logód
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="relative text-center hover:shadow-md transition-shadow">
                <CardContent className="pt-8">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-accent-yellow text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="w-16 h-16 bg-highlight-yellow rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-8 w-8 text-accent-yellow" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring System */}
      <section className="bg-bg-primary py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Brandguide 100
              </h2>
              <p className="text-lg text-text-secondary mb-6">
                Paul Rand, a 20. század egyik legnagyobb grafikus tervezője 7 szempontot
                határozott meg egy jó logó értékeléséhez. Mi ezt a rendszert dolgoztuk át
                100 pontos, súlyozott skálává.
              </p>

              <div className="bg-highlight-yellow border-l-4 border-accent-yellow p-4 rounded-r-lg mb-6">
                <p className="text-text-primary font-medium">
                  „A logónak önmagában nincs jelentése – a jelentést az idő és a következetes használat adja neki."
                </p>
                <p className="text-text-secondary text-sm mt-1">— Paul Rand</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="font-semibold text-text-primary">90-100</div>
                    <div className="text-sm text-text-secondary">Kiváló</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-semibold text-text-primary">75-89</div>
                    <div className="text-sm text-text-secondary">Jó</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-semibold text-text-primary">50-74</div>
                    <div className="text-sm text-text-secondary">Fejlesztendő</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <div className="font-semibold text-text-primary">0-49</div>
                    <div className="text-sm text-text-secondary">Újragondolandó</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-2xl p-6">
              <h3 className="font-semibold text-text-primary mb-4">7 értékelési szempont</h3>
              <div className="space-y-3">
                {criteria.map((criterion) => (
                  <div key={criterion.name} className="flex items-center gap-3">
                    <span className="text-xl w-8">{criterion.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">{criterion.name}</span>
                        <span className="text-sm text-text-muted">{criterion.points} pont</span>
                      </div>
                      <div className="h-2 bg-bg-tertiary rounded-full mt-1">
                        <div
                          className="h-full bg-accent-yellow rounded-full"
                          style={{ width: `${criterion.points}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-bg-tertiary flex items-center justify-between">
                <span className="font-semibold text-text-primary">Összesen</span>
                <span className="font-bold text-2xl text-accent-yellow">100 pont</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Test Levels */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Válaszd ki a teszt szintjét
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Az alap teszttől a teljes auditig – te döntöd el, mennyire mélyreható elemzésre van szükséged
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Alap teszt</h3>
                <p className="text-text-secondary mb-4">
                  Gyors elemzés a 7 szempont szerint. Ideális első körös visszajelzéshez.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Logó feltöltése</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>7 szempont szerinti értékelés</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Összpontszám + javaslatok</span>
                  </li>
                </ul>
                <div className="text-sm text-text-muted">~30 másodperc</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 border-accent-yellow hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 bg-accent-yellow text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                AJÁNLOTT
              </div>
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Részletes teszt</h3>
                <p className="text-text-secondary mb-4">
                  A logón túl a színpalettát és tipográfiát is elemezzük.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Minden az alap tesztből</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Színpaletta elemzés</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Tipográfia értékelés</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Radar chart vizualizáció</span>
                  </li>
                </ul>
                <div className="text-sm text-text-muted">~1-2 perc</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-text-primary py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Készen állsz megtudni, hol tart a logód?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Ingyenes, gyors és szakmailag megalapozott visszajelzés – most azonnal.
          </p>
          <Link href="/teszt">
            <Button size="lg" className="bg-accent-yellow hover:bg-accent-yellow-hover">
              Teszt indítása
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
