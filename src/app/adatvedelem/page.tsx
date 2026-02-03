import { AppLayout } from '@/components/layout/AppLayout';

export const metadata = {
  title: 'Adatvédelmi tájékoztató – LogoLab',
  description: 'LogoLab Adatvédelmi tájékoztató',
};

export default function AdatvedelemPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Adatvédelmi tájékoztató
        </h1>
        <p className="text-sm text-gray-500 mb-10">Hatályos: 2026. január 30-tól</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Adatkezelő</h2>
            <ul className="text-gray-700 space-y-1 list-none pl-0">
              <li><strong>Név:</strong> Brandguide</li>
              <li><strong>Email:</strong> peti@brandguide.hu</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Kezelt adatok</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li><strong>Email cím</strong> – regisztráció és kommunikáció céljából</li>
              <li><strong>Név</strong> – megjelenítés a felhasználói fiókban</li>
              <li><strong>IP cím</strong> – napi limit ellenőrzés és visszaélés megelőzés</li>
              <li><strong>Feltöltött logók</strong> – az elemzés elvégzéséhez</li>
              <li><strong>Elemzési eredmények</strong> – a szolgáltatás nyújtásához</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Adatkezelés célja és jogalapja</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li><strong>Szolgáltatás nyújtása</strong> – jogalap: szerződés teljesítése (GDPR 6. cikk (1) b))</li>
              <li><strong>Marketing</strong> – jogalap: hozzájárulás (GDPR 6. cikk (1) a))</li>
              <li><strong>Visszaélés megelőzés</strong> – jogalap: jogos érdek (GDPR 6. cikk (1) f))</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Adatmegőrzés időtartama</h2>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>Fiók törlése esetén az adatok 30 napon belül törlésre kerülnek.</li>
              <li>A publikus elemzések a fiók törlésével együtt törlődnek a galériából.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Adattovábbítás</h2>
            <p className="text-gray-700 mb-3">
              A szolgáltatás működéséhez az alábbi harmadik felek részére továbbítunk adatokat:
            </p>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li><strong>Stripe</strong> (fizetés feldolgozás) – USA – megfelelőségi garancia: Standard Contractual Clauses</li>
              <li><strong>Supabase</strong> (adattárolás) – EU</li>
              <li><strong>Anthropic</strong> (AI elemzés) – USA – megfelelőségi garancia: Standard Contractual Clauses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Felhasználói jogok</h2>
            <p className="text-gray-700 mb-3">
              A GDPR alapján az alábbi jogok illetik meg Önt:
            </p>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li><strong>Hozzáférés joga</strong> – tájékoztatást kérhet a kezelt adatairól</li>
              <li><strong>Helyesbítés joga</strong> – kérheti adatai javítását</li>
              <li><strong>Törlés joga</strong> – kérheti adatai törlését</li>
              <li><strong>Adathordozhatóság joga</strong> – kérheti adatai géppel olvasható formátumban való kiadását</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Jogai gyakorlásához írjon a{' '}
              <a href="mailto:peti@brandguide.hu" className="text-blue-600 hover:underline">
                peti@brandguide.hu
              </a>{' '}
              email címre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Kapcsolat</h2>
            <p className="text-gray-700">
              Adatvédelmi kérdéseivel forduljon hozzánk:{' '}
              <a href="mailto:peti@brandguide.hu" className="text-blue-600 hover:underline">
                peti@brandguide.hu
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookie-k</h2>
            <p className="text-gray-700 mb-3">
              A weboldal az alábbi sütiket használja:
            </p>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li><strong>Szükséges sütik</strong> – a szolgáltatás működéséhez elengedhetetlenek (pl. bejelentkezés, munkamenet)</li>
              <li><strong>Analitikai sütik</strong> – a weboldal használatának megértéséhez (kizárólag hozzájárulás esetén)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Jogorvoslat</h2>
            <p className="text-gray-700">
              Amennyiben úgy érzi, hogy adatkezelési jogai sérültek, panasszal fordulhat a
              Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH):{' '}
              <a
                href="https://www.naih.hu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                www.naih.hu
              </a>
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
