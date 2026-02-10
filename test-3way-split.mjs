/**
 * Test 3-way split kb-extract calls
 * Usage: node test-3way-split.mjs
 */

const ENDPOINT = 'https://udqiowvplrkdrviahylk.supabase.co/functions/v1/kb-extract';
const API_KEY = 'pk_0e84d6b9e3c244b92129237e1cfe7719';

// Realistic image description (similar to what Claude Vision produces)
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

// Scoring schema
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
        szempontok: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nev: { type: "string", enum: ["Megkülönböztethetőség", "Egyszerűség", "Alkalmazhatóság", "Emlékezetesség", "Időtállóság", "Univerzalitás", "Láthatóság"] },
              pont: { type: "integer" },
              maxPont: { type: "integer" },
              indoklas: { type: "string" },
              javaslatok: { type: "array", items: { type: "string" } }
            },
            required: ["nev", "pont", "maxPont", "indoklas", "javaslatok"]
          }
        }
      },
      required: ["osszpontszam", "logotipus", "hiresLogo", "szempontok"]
    }
  },
  required: ["scoring"]
};

// Summary schema
const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        osszegzes: { type: "string" },
        erossegek: { type: "array", items: { type: "string" } },
        fejlesztendo: { type: "array", items: { type: "string" } }
      },
      required: ["osszegzes", "erossegek", "fejlesztendo"]
    }
  },
  required: ["summary"]
};

// Details schema
const DETAILS_SCHEMA = {
  type: "object",
  properties: {
    details: {
      type: "object",
      properties: {
        szinek: {
          type: "object",
          properties: {
            harmonia: { type: "string" },
            pszichologia: { type: "string" },
            technikai: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } }
          },
          required: ["harmonia", "pszichologia", "technikai", "javaslatok"]
        },
        tipografia: {
          type: "object",
          properties: {
            karakter: { type: "string" },
            olvashatosag: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } }
          },
          required: ["karakter", "olvashatosag", "javaslatok"]
        },
        vizualisNyelv: {
          type: "object",
          properties: {
            formak: { type: "string" },
            elemek: { type: "string" },
            stilusEgyseg: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } }
          },
          required: ["formak", "elemek", "stilusEgyseg", "javaslatok"]
        }
      },
      required: ["szinek", "tipografia", "vizualisNyelv"]
    }
  },
  required: ["details"]
};

// Queries
const SCORING_QUERY = `## HÍRES LOGÓK FELISMERÉSE

Ha a logó egy **ismert márka** (Fortune 500, híres brand, kulturális ikon):
- Nevezd meg a márkát és kontextust
- Ha ismered a tervezőt, említsd meg
- Értékeld objektíven – a hírnév NEM jelent automatikusan magas pontot

Ha **TV műsor, film, esemény** logója:
- Jelezd, hogy ez "kampány-badge" vagy "event branding", nem klasszikus céges logó

---

## LOGÓ DEFINÍCIÓ – KRITIKUS ALAPELV

Egy logó NEM illusztráció. A logó egyszerű, skálázható, időtálló azonosító jel.

### AUTOMATIKUS "ILLUSZTRÁCIÓ-GYANÚ" INDIKÁTOROK:
Ha ezek közül **3 vagy több** jelen van → **MAX 55-60 pont összesen**:
- 4+ szín használata gradienssel
- Apró, 10mm alatt olvashatatlan részletek
- Körbe írt szöveg + központi kép + peremdekoráció együtt
- Fotorealisztikus vagy árnyékolt elemek
- Badge/embléma stílus túl sok réteggel (5+ vizuális elem)

---

## ÉRTÉKELÉSI SZEMPONTOK – Brandguide 100 pontos rendszer

### ÖSSZPONTSZÁM KALIBRÁCIÓ:
| Pontszám | Mit jelent |
|----------|------------|
| 85-100 | Világszínvonalú, ikonikus |
| 70-84 | Professzionális, jól működik |
| 55-69 | Működőképes, de fejlesztésre szorul |
| 40-54 | Jelentős problémák |
| 0-39 | Alapvető gondok |

## KRITÉRIUMONKÉNTI PONTOZÁS

### 1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)
18-20: Ikonikus, összetéveszthetetlen
14-17: Egyedi, erős brand-személyiség
9-13: Felismerhető, de vannak hasonlók
5-8: Generikus
0-4: Sablonos

### 2. EGYSZERŰSÉG (max 18 pont)
16-18: Max 2 elem, 1 szín
12-15: 3 elem, 2 szín, tiszta
7-11: 4-5 elem, zsúfoltabb
3-6: Illusztráció-szintű
0-2: Kaotikus

### 3. ALKALMAZHATÓSÁG (max 15 pont)
14-15: Bármilyen méretben tökéletes
10-13: Minimális kompromisszummal skálázható
6-9: Módosítás kell kis mérethez
3-5: Csak nagy méretben
0-2: Korlátozott

### 4. EMLÉKEZETESSÉG (max 15 pont)
14-15: Azonnal bevésődik
10-13: Megjegyezhető
6-9: Átlagos
3-5: Jellegtelen
0-2: Nyomot sem hagy

### 5. IDŐTÁLLÓSÁG (max 12 pont)
11-12: 20+ évig működne
8-10: 10-15 évig stabil
4-7: 5-10 év
0-3: Már most datált

### 6. UNIVERZALITÁS (max 10 pont)
9-10: Globálisan működik
7-8: Széles körben működik
4-6: Kérdéses
0-3: Kulturálisan kötött

### 7. LÁTHATÓSÁG (max 10 pont)
9-10: Kiváló kontraszt
7-8: Jó láthatóság
4-6: Problémás
0-3: Elvész

---

[Feladat]
A logó leírása az image_description mezőben található. Értékeld a Brandguide 100 pontos rendszerével!

KRITIKUS: A szempontok tömbben MIND A 7 szempont KÖTELEZŐ: Megkülönböztethetőség, Egyszerűség, Alkalmazhatóság, Emlékezetesség, Időtállóság, Univerzalitás, Láthatóság.`;

const SUMMARY_QUERY = `## ÖSSZEFOGLALÓ KÉSZÍTÉSE – "Peti mentori értékelés"

Írj 3-5 mondatos ŐSZINTE, személyes hangú értékelést a logóról (max 600 karakter).
Úgy írj, mintha egy tapasztalt branding mentor mondaná el a véleményét.

### STÍLUSJEGYEK:
- Közvetlen megszólítás: "Nézzük, mi a helyzet ezzel a logóval."
- Rövid, lendületes mondatok
- Kérdés-válasz ritmus: "De működik? Igen, mert..."
- Hétköznapi analógiák
- Félkövér kiemelés a legfontosabb megállapításnál

### KERÜLENDŐ:
- "Fantasztikus", "briliáns" – túl lelkes szavak
- "Innovatív", "dinamikus" – üres buzzwordök
- Sablonos nyitás
- Passzív szerkezetek

Erősségek és fejlesztendő: max 3-3 db, RÖVID 2-5 szavas bullet-ek.

[Feladat]
A logó leírása az image_description mezőben található. Készítsd el az összefoglalót!`;

const DETAILS_QUERY = `## RÉSZLETES ELEMZÉS

### SZÍNPALETTA
- Harmónia: A színek hogyan működnek együtt?
- Pszichológia: Milyen érzéseket közvetítenek?
- Technikai: RGB/CMYK kompatibilitás
- Javaslatok: 2 konkrét javaslat

### TIPOGRÁFIA
- Karakter: A betűtípus személyisége
- Olvashatóság: Különböző méretekben hogyan működik?
- Javaslatok: 2 konkrét javaslat

### VIZUÁLIS NYELV
- Formák: Milyen formavilágot használ?
- Elemek: Az ikon/szimbólum erőssége
- Stílusegység: Az elemek összhangja
- Javaslatok: 2 konkrét javaslat

[Feladat]
A logó leírása az image_description mezőben található. Készítsd el a részletes elemzést!`;

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
  console.log('=== Testing 3-way parallel kb-extract calls ===\n');
  const start = Date.now();

  const [scoring, summary, details] = await Promise.all([
    callKBExtract('SCORING', SCORING_QUERY, SCORING_SCHEMA),
    callKBExtract('SUMMARY', SUMMARY_QUERY, SUMMARY_SCHEMA),
    callKBExtract('DETAILS', DETAILS_QUERY, DETAILS_SCHEMA),
  ]);

  const totalElapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== All done in ${totalElapsed}s ===\n`);

  if (scoring) {
    const s = scoring.data.scoring;
    console.log('--- SCORING ---');
    console.log(`Össz: ${s.osszpontszam}, Típus: ${s.logotipus}`);
    console.log(`Híres: ${s.hiresLogo?.ismert ? s.hiresLogo.marka : 'Nem ismert'}`);
    console.log(`Szempontok (${s.szempontok?.length}/7):`);
    s.szempontok?.forEach(sz => console.log(`  ${sz.nev}: ${sz.pont}/${sz.maxPont}`));
  }

  if (summary) {
    const s = summary.data.summary;
    console.log('\n--- SUMMARY ---');
    console.log(`Összegzés: ${s.osszegzes?.substring(0, 150)}...`);
    console.log(`Erősségek: ${s.erossegek?.join(', ')}`);
    console.log(`Fejlesztendő: ${s.fejlesztendo?.join(', ')}`);
  }

  if (details) {
    const d = details.data.details;
    console.log('\n--- DETAILS ---');
    console.log(`Színek harmónia: ${d.szinek?.harmonia?.substring(0, 80)}...`);
    console.log(`Tipográfia: ${d.tipografia?.karakter?.substring(0, 80)}...`);
    console.log(`Vizuális nyelv: ${d.vizualisNyelv?.formak?.substring(0, 80)}...`);
  }
}

main().catch(console.error);
