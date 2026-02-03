import { AppLayout } from '@/components/layout/AppLayout';

export const metadata = {
  title: 'ÁSZF – LogoLab',
  description: 'LogoLab Általános Szerződési Feltételek',
};

export default function AszfPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Általános Szerződési Feltételek
        </h1>
        <p className="text-sm text-gray-500 mb-10">Hatályos: 2026. január 30-tól</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Szolgáltató adatai</h2>
            <ul className="text-gray-700 space-y-1 list-none pl-0">
              <li><strong>Név:</strong> Brandguide</li>
              <li><strong>Email:</strong> peti@brandguide.hu</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. A szolgáltatás leírása</h2>
            <p className="text-gray-700">
              A LogoLab egy AI-alapú logó elemző szolgáltatás, amely mesterséges intelligencia segítségével
              értékeli a feltöltött logókat több szempont szerint, beleértve a vizuális megjelenést,
              színhasználatot, tipográfiát és vizuális nyelvet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Regisztráció és felhasználói fiók</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>A szolgáltatás használatához regisztráció szükséges.</li>
              <li>A felhasználó felelős a megadott adatok valódiságáért.</li>
              <li>Egy személy egy fiókot hozhat létre.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Csomagok és árak</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li><strong>Ingyenes csomag:</strong> napi 1 elemzés, az eredmény publikus a Logo galériában.</li>
              <li><strong>Zárt elemzés:</strong> 1 990 Ft + ÁFA (2 527 Ft bruttó) – az eredmény privát marad.</li>
              <li><strong>Zárt elemzés + Konzultáció:</strong> 24 990 Ft + ÁFA (31 737 Ft bruttó) – privát eredmény, 30 perces konzultáció, PDF export.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Fizetési feltételek</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>A fizetés bankkártyával, a Stripe fizetési rendszeren keresztül történik.</li>
              <li>A feltüntetett bruttó árak tartalmazzák az ÁFÁ-t.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Elállási jog</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>A vásárlástól számított 24 órán belül elállási jog illeti meg a felhasználót, amennyiben az elemzés még nem készült el.</li>
              <li>Elállás esetén a teljes vételár visszatérítésre kerül.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Szerzői jogok</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>A felhasználó szavatol azért, hogy a feltöltött logó saját tulajdona, vagy jogosult annak használatára.</li>
              <li>Az ingyenes elemzések publikusan megjelennek a Logo galériában.</li>
              <li>A publikus elemzéseket a Szolgáltató felhasználhatja marketing célokra.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Felelősség korlátozása</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>Az elemzés AI-alapú, tájékoztató jellegű, nem minősül szakmai tanácsadásnak.</li>
              <li>A Szolgáltató nem vállal felelősséget az elemzés alapján hozott üzleti döntésekért.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Adatvédelem</h2>
            <p className="text-gray-700">
              Az adatkezelésre vonatkozó részletes tájékoztatást az{' '}
              <a href="/adatvedelem" className="text-blue-600 hover:underline">
                Adatvédelmi tájékoztató
              </a>{' '}
              tartalmazza.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Záró rendelkezések</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>A Szolgáltató fenntartja a jogot az ÁSZF módosítására. A módosításról a felhasználókat email-ben értesíti.</li>
              <li>Jogvita esetén a magyar jog az irányadó.</li>
            </ul>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
