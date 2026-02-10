/**
 * Test 3-way split with NAMED szempontok (not array)
 * Usage: node test-3way-named.mjs
 */

const ENDPOINT = 'https://udqiowvplrkdrviahylk.supabase.co/functions/v1/kb-extract';
const API_KEY = 'pk_0e84d6b9e3c244b92129237e1cfe7719';

const IMAGE_DESCRIPTION = `Ez egy vállalati logó, amely egy stilizált, geometrikus pajzs alakú ikont tartalmaz a "SIMENTAT" felirat mellett.

IKON: A logó bal oldalán egy pajzs/chevron formájú ikon látható, amely három egymásba illeszkedő, lefelé mutató nyílhegyből áll. A formák egymásra rétegeződnek, áttetszőségi hatást keltve. Az ikon sötétzöld (#1B4332) színű, a rétegezés világosabb és sötétebb tónusokat hoz létre.

TIPOGRÁFIA: A "SIMENTAT" felirat egy modern, félkövér, talp nélküli (sans-serif) betűtípussal van szedve. A betűk nagybetűsek, egyenletes betűközzel. A szöveg színe megegyezik az ikon sötétzöld árnyalatával. A betűk geometrikus jellegűek, tiszta vonalvezetéssel.

ELRENDEZÉS: Horizontális elrendezés – az ikon balra, a szöveg jobbra helyezkedik el, függőlegesen középre igazítva. Az ikon és szöveg között arányos térköz van.

SZÍNPALETTA:
- Elsődleges szín: Sötétzöld (#1B4332) - a teljes logó ebben a színben van
- Háttér: Fehér/átlátszó
- Az ikon rétegezése révén 2-3 árnyalat keletkezik a zöld spektrumon belül

STÍLUS: Minimalista, modern, professzionális vállalati dizájn. A geometrikus formák precíziót és stabilitást sugallnak. Az áttetszőségi rétegezés ad mélységet és vizuális érdekességet az egyébként egyszerű formanyelvhez.

MÉRETEZHETŐSÉG: A logó jól skálázható – az egyszerű geometriai formák és a tiszta tipográfia kis méretben is olvasható marad. Az ikon önállóan is használható app ikonként vagy favicon-ként.`;

// Single szempont schema
const szempontSchema = {
  type: "object",
  properties: {
    pont: { type: "integer" },
    maxPont: { type: "integer" },
    indoklas: { type: "string" },
    javaslatok: { type: "array", items: { type: "string" } }
  },
  required: ["pont", "maxPont", "indoklas", "javaslatok"]
};

// Named scoring schema - each szempont is a separate key
const SCORING_SCHEMA = {
  type: "object",
  properties: {
    scoring: {
      type: "object",
      properties: {
        osszpontszam: { type: "integer" },
        logotipus: { type: "string", enum: ["klasszikus_logo", "kampany_badge", "illusztracio_jellegu"] },
        hiresLogo: {
          type: "object",
          properties: {
            ismert: { type: "boolean" },
            marka: { type: "string" },
            tervezo: { type: "string" },
            kontextus: { type: "string" }
          },
          required: ["ismert", "marka", "tervezo", "kontextus"]
        },
        megkulonboztethetoseg: szempontSchema,
        egyszeruseg: szempontSchema,
        alkalmazhatosag: szempontSchema,
        emlekezetesseg: szempontSchema,
        idotallosag: szempontSchema,
        univerzalitas: szempontSchema,
        lathatosag: szempontSchema,
      },
      required: [
        "osszpontszam", "logotipus", "hiresLogo",
        "megkulonboztethetoseg", "egyszeruseg", "alkalmazhatosag",
        "emlekezetesseg", "idotallosag", "univerzalitas", "lathatosag"
      ]
    }
  },
  required: ["scoring"]
};

const SCORING_QUERY = `## LOGÓ ÉRTÉKELÉS – Brandguide 100 pontos rendszer

Ha a logó ismert márka: nevezd meg. Ha nem, jelezd.

### Értékelési kritériumok:
1. megkulonboztethetoseg (max 20): Mennyire egyedi?
2. egyszeruseg (max 18): Hány vizuális elem? Skálázható?
3. alkalmazhatosag (max 15): Különböző méretekben működik?
4. emlekezetesseg (max 15): Bevésődik-e egyetlen pillantásra?
5. idotallosag (max 12): Hány évig működne változtatás nélkül?
6. univerzalitas (max 10): Globálisan, kulturálisan semlegesen működik?
7. lathatosag (max 10): Kontraszt, távolról is felismerhető?

Minden szemponthoz adj pontszámot, maxPont-ot, indoklást és 2 javaslatot.

[Feladat]
A logó leírása az image_description mezőben található. Értékeld!`;

async function callKBExtract(name, query, schema) {
  const start = Date.now();
  console.log(`[${name}] Starting... (query: ${query.length} chars)`);

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({
      query,
      image_description: IMAGE_DESCRIPTION,
      output: { schema, mode: 'best_effort' },
      options: { max_sources: 5, language: 'hu' },
    }),
  });

  const data = await response.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!response.ok) {
    console.error(`[${name}] ERROR (${elapsed}s):`, JSON.stringify(data.error));
    return null;
  }

  console.log(`[${name}] OK (${elapsed}s) - tokens: ${data.meta?.tokens_used}`);
  return data;
}

async function main() {
  console.log('=== Test: Named szempontok schema ===\n');
  const start = Date.now();

  const result = await callKBExtract('SCORING', SCORING_QUERY, SCORING_SCHEMA);

  const totalElapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${totalElapsed}s\n`);

  if (result) {
    const s = result.data.scoring;
    console.log(`Össz: ${s.osszpontszam}, Típus: ${s.logotipus}`);
    console.log(`Híres: ${s.hiresLogo?.ismert ? s.hiresLogo.marka : 'Nem ismert'}`);

    const szempontok = ['megkulonboztethetoseg', 'egyszeruseg', 'alkalmazhatosag', 'emlekezetesseg', 'idotallosag', 'univerzalitas', 'lathatosag'];
    let found = 0;
    for (const key of szempontok) {
      const sz = s[key];
      if (sz) {
        found++;
        console.log(`  ${key}: ${sz.pont}/${sz.maxPont} - ${sz.indoklas?.substring(0, 60)}...`);
      } else {
        console.log(`  ${key}: ❌ HIÁNYZIK`);
      }
    }
    console.log(`\n${found}/7 szempont megvan`);
  }
}

main().catch(console.error);
