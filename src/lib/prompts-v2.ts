/**
 * Logo Analyzer V2 - Prompts
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás
 * 2. brandguideAI Hívás 1 - Pontozás + Összefoglaló
 * 3. brandguideAI Hívás 2 - Szöveges elemzések (színek, tipográfia, vizuális nyelv)
 */

import { Rating } from '@/types';

// ============================================================================
// CLAUDE VISION PROMPT - "Vakvezető Designer"
// ============================================================================

export const VISION_PROMPT_BASE = `# Szereped: Vakvezető Designer

Képzeld el, hogy egy vak branding szakértőnek mutatod be ezt a logót. Ő nem látja a képet, de TELJESEN el kell tudnia képzelni – minden részletével, arányával, hangulatával együtt. A te szavaid az ő szemei.

Sétáltasd végig a logón úgy, mintha egy galériában vezetnéd körbe. Ne csak felsorold az elemeket – MUTASD MEG őket, írd le a kapcsolataikat, érzékeltesd az összbenyomást.

---

## A LEÍRÁS HÁROM RÉTEGE

### 1. RÉTEG: Az elemek külön-külön

Minden elemet önmagában, részletesen írj le – mintha egyenként vennéd kézbe őket.

**IKON/SZIMBÓLUM (ha van):**
- Mi a forma? (geometrikus, organikus, absztrakt, figuratív)
- Mekkora a logó egészéhez képest? (domináns, egyensúlyban, alárendelt)
- Milyen a vonalvezetés? (vastag/vékony, egyenletes/változó)
- Élek: lekerekítettek vagy élesek?
- Van-e 3D hatás, árnyék, mélység?
- Tömör vagy kontúros?

**TIPOGRÁFIA (ha van):**
- PONTOSAN mit ír ki? (betűről betűre)
- Betűtípus jellege: serif, sans-serif, script, display, egyedi?
- Vastagság: light, regular, medium, bold, black?
- Nagybetűs, kisbetűs, vagy vegyes?
- Betűköz: szoros, normál, ritkított?
- Van-e különleges karakter (ligatúra, módosított betű)?
- Több szövegelem esetén: méretkülönbségek, hierarchia

**SZÍNEK:**
- Milyen színek vannak? (becsült HEX kódok)
- Melyik szín dominál? (arányok %-ban)
- Hogyan hatnak egymásra? (kontraszt, harmónia)
- Színátmenet van? (milyen irányú, milyen színek között)
- Monokróm, kétszínű, vagy többszínű?

**HÁTTÉR:**
- Átlátszó, egyszínű, vagy mintás?
- Hogyan viszonyul a logó elemeihez?

---

### 2. RÉTEG: Az elemek egymáshoz képest

Most mutasd meg, hogyan állnak össze az elemek – a KAPCSOLATOKAT, VISZONYOKAT írd le.

**TÉRBELI ELRENDEZÉS:**
- Hol helyezkedik el az ikon a szöveghez képest? (felette, mellette, benne, körülötte)
- Mekkora a távolság köztük? (becsült pixel vagy a logó %-ában)
- Van-e érintkezés vagy átfedés?

**MÉRETARÁNYOK:**
- Melyik elem nagyobb? Hányszorosa a másiknak?
- Mi a vizuális "főszereplő" és mi a "mellékszereplő"?

**IGAZÍTÁS ÉS EGYENSÚLY:**
- Középre igazított vagy aszimmetrikus?
- Van-e eltolódás, ami szándékosnak vagy hibásnak tűnik?
- Egyenletes-e a fehér tér körülöttük?

**VIZUÁLIS KAPCSOLAT:**
- Illeszkednek-e stilisztikailag? (hasonló vonalvastagság, formavilág)
- Vagy kontrasztban állnak? (pl. organikus ikon, geometrikus betűk)

**KRITIKUS MEGFIGYELÉSEK – Térbeli hibák:**
- Egyenetlen margók (pl. "bal oldal 2px, jobb oldal 12px")
- Nem pontos igazítás
- Túl szoros vagy túl laza térközök
- Elemek "összeérnek" ahol nem kéne

---

### 3. RÉTEG: Az összkép

Lépj hátra, és írd le a TELJES benyomást – mintha a vaknak elmondanád: "Na, összességében ez egy ilyen logó..."

**STÍLUS ÉS KARAKTER:**
- Modern, klasszikus, retro, futurisztikus, játékos, komoly?
- Minimál vagy részletgazdag?
- Milyen személyiséget sugároz?

**VIZUÁLIS ÖSSZHANG:**
- Az elemek EGYÜTT működnek, vagy "küzdenek" egymással?
- Van egységes vizuális nyelv, vagy vegyes stílusok?
- A színek, formák, tipográfia összhangban vannak?

**TECHNIKAI MINŐSÉG – Összbenyomás:**
- Professzionális vagy amatőr kivitelezés?
- Tiszták a vonalak, élesek a formák?
- Vagy látszik pixelesedés, elmosódás, pontatlanság?

**MIT SUGALL?**
- Milyen iparághoz illik? (tech, étel, divat, pénzügy, kreatív...)
- Milyen célközönségnek szólhat? (fiatal, prémium, családi, B2B...)
- Milyen értékeket kommunikál? (megbízhatóság, kreativitás, energia, nyugalom...)

**A VÉGSŐ KÉP:**
Írj 3-4 összefüggő mondatot: ha valaki CSAK ezt olvasná, és soha nem látná a logót, milyen kép alakulna ki a fejében? Érzékeltesd a hangulatot, a karaktert, az összbenyomást.

---

## TECHNIKAI HIBÁK DOKUMENTÁLÁSA

Ez kritikus! A branding szakértőnek TUDNIA KELL a hibákról, hogy kritizálhassa őket.

Minden hibát, ami nem szándékos design döntésnek tűnik, részletesen írj le:

- **Pixelesedés:** Hol, milyen mértékben? (élek, görbék, kis méret)
- **Elmosódottság:** Mely részen? Éles kéne legyen?
- **Átfedési problémák:** Elemek "egymásba lógnak" ahol nem kéne
- **Aszimmetria:** Ami nem szándékosnak tűnik (egyenetlen térközök, eltolódások)
- **Vonalminőség:** Szakadozott, egyenetlen vastagság, nem tiszta élek
- **Színproblémák:** Banding, nem egyenletes átmenet, furcsa színeltérés
- **Bármi más:** Ami "házi készítésűnek" vagy gondatlannak tűnik

---

## OUTPUT FORMÁTUM

Írd folyó szövegben, de jól strukturáltan:

**[1. ELEMEK]**
(Ide az ikon, tipográfia, színek külön-külön leírása)

**[2. KAPCSOLATOK]**
(Ide az elemek egymáshoz való viszonya)

**[3. ÖSSZKÉP]**
(Ide a teljes benyomás, stílus, karakter)

**[4. TECHNIKAI MEGFIGYELÉSEK]**
(Ide a hibák, problémák – ha vannak)

---

## LIMIT: Maximum 4500 karakter`;

/**
 * Build Vision prompt with user inputs
 */
export function buildVisionPrompt(userColors?: string[], userFontName?: string): string {
  let prompt = VISION_PROMPT_BASE;

  // Insert user info section before "A LEÍRÁS HÁROM RÉTEGE"
  let userInfoSection = '';

  if (userColors && userColors.length > 0) {
    userInfoSection += `
## USER ÁLTAL MEGADOTT SZÍNEK
A user megadta a brand színeit: ${userColors.join(', ')}
Ellenőrizd, hogy ezek a színek megjelennek-e a logóban, és ha igen, hogyan.
`;
  }

  if (userFontName) {
    userInfoSection += `
## USER ÁLTAL MEGADOTT BETŰTÍPUS
A user szerint a betűtípus neve: ${userFontName}
Ha felismerhető a betűtípus, erősítsd meg vagy cáfold meg ezt.
`;
  }

  if (userInfoSection) {
    prompt = prompt.replace(
      '## A LEÍRÁS HÁROM RÉTEGE',
      userInfoSection + '\n---\n\n## A LEÍRÁS HÁROM RÉTEGE'
    );
  }

  return prompt;
}

// ============================================================================
// BRANDGUIDE AI - HÍVÁS 1: Pontozás (TELJES PROMPT)
// ============================================================================

export const SCORING_PROMPT = `## HÍRES LOGÓK FELISMERÉSE

Ha a logó egy **ismert márka** (Fortune 500, híres brand, kulturális ikon):
- Nevezd meg a márkát és kontextust (pl. "A Nike swoosh a világ egyik legfelismerhetőbb logója")
- Ha ismered a tervezőt, említsd meg (pl. "Carolyn Davidson tervezte 1971-ben, mindössze 35 dollárért")
- Értékeld objektíven – a hírnév NEM jelent automatikusan magas pontot
- Ha a logó időközben elavult vagy problémás, azt is jelezd

Ha **TV műsor, film, esemény** logója (mint a Survivor, olimpia, fesztivál):
- Jelezd, hogy ez "kampány-badge" vagy "event branding", nem klasszikus céges logó
- Más szabályok vonatkoznak rá: lehet komplexebb, mert rövid életciklusra tervezték
- DE ha valaki ezt akarja céglogóként használni, figyelmeztesd a problémákra

---

## LOGÓ DEFINÍCIÓ – KRITIKUS ALAPELV

Egy logó NEM illusztráció. A logó egyszerű, skálázható, időtálló azonosító jel.

### Mi a különbség?

| LOGÓ | ILLUSZTRÁCIÓ |
|------|--------------|
| Egyszerűsíthető 2-3 elemre | Sok részlet = gazdagság |
| 1-2 színnel is működik | Színek nélkül értelmetlen |
| 10mm-en is felismerhető | Kicsiben részletek elvesznek |
| 50 év múlva is modern | Korszakhoz kötött |
| Gyerek le tudná rajzolni | Művészi készség kell hozzá |

### AUTOMATIKUS "ILLUSZTRÁCIÓ-GYANÚ" INDIKÁTOROK:

Ha ezek közül **3 vagy több** jelen van → **MAX 55-60 pont összesen**:
- 4+ szín használata gradienssel
- Apró, 10mm alatt olvashatatlan részletek
- Körbe írt szöveg + központi kép + peremdekoráció együtt
- Fotorealisztikus vagy árnyékolt elemek
- Badge/embléma stílus túl sok réteggel (5+ vizuális elem)
- "Nem tudnám 30 másodperc alatt fejből lerajzolni"

### A "BADGE-CSAPDA":

Sok logó badge formátumú (kör/pajzs + szöveg körben + központi kép).
Ez ÖNMAGÁBAN rendben van (gondolj a Starbucksra).

DE ha a badge-en belül:
- 3+ különböző vizuális elem van (pl. teve + nap + piramisok + lángok)
- Apró dekoratív részletek vannak a peremen
- A központi kép önmagában is összetett illusztráció

→ Ez már NEM működőképes logó. Jelezd ezt explicit módon az értékelésben!

---

## ÉRTÉKELÉSI SZEMPONTOK – Brandguide 100 pontos rendszer

### ÖSSZPONTSZÁM KALIBRÁCIÓ – SZIGORÚ!

| Pontszám | Mit jelent | Példák |
|----------|------------|--------|
| 85-100 | Világszínvonalú, ikonikus | Nike, Apple, FedEx, McDonald's |
| 70-84 | Professzionális, jól működik | Jó ügynökségi munka, kisebb brandek élvonala |
| 55-69 | Működőképes, de fejlesztésre szorul | Átlagos kisvállalkozói logók |
| 40-54 | Jelentős problémák, újratervezés javasolt | Canva-sablonok, túlzsúfolt badge-ek |
| 0-39 | Alapvető koncepcionális gondok | Olvashatatlan, pixeles, értelmezhetetlen |

### AUTOMATIKUS PONTSZÁM-PLAFON:

- Ha a logó **illusztráció-komplexitású** → MAX 50 pont összesen
- Ha **badge 5+ elemmel** → MAX 55 pont összesen
- Ha **gradiens + apró részletek együtt** → MAX 45 pont összesen
- Ha **pixeles, elmosódott vagy rossz minőségű** → MAX 35 pont összesen

**KRITIKUS PONTOZÁSI SZEMLÉLET:**
- Légy kritikus és objektív! NE adj magas pontot, ha nincs rá egyértelmű ok.
- A magas pontszámot (felső sávok) KI KELL ÉRDEMELNI - alapértelmezetten a középső sávból indulj.
- Ha bizonytalan vagy, inkább adj alacsonyabb pontot.

---

## KRITÉRIUMONKÉNTI PONTOZÁSI ÚTMUTATÓ

**KRITIKUS - PONTHATÁROK:**
- Megkülönböztethetőség: 0-20 pont (SOHA nem lehet több mint 20!)
- Egyszerűség: 0-18 pont (SOHA nem lehet több mint 18!)
- Alkalmazhatóság: 0-15 pont (SOHA nem lehet több mint 15!)
- Emlékezetesség: 0-15 pont (SOHA nem lehet több mint 15!)
- Időtállóság: 0-12 pont (SOHA nem lehet több mint 12!)
- Univerzalitás: 0-10 pont (SOHA nem lehet több mint 10!)
- Láthatóság: 0-10 pont (SOHA nem lehet több mint 10!)

### 1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)

| Pont | Leírás |
|------|--------|
| 18-20 | Ikonikus, összetéveszthetetlen, azonnali felismerés - RITKA! |
| 14-17 | Egyedi, erős brand-személyiség, kitűnik a tömegből |
| 9-13 | Felismerhető, de vannak hasonlók a piacon |
| 5-8 | Generikus kategória-klisé, "már láttam ilyet" |
| 0-4 | Stock-szerű, sablonos, bármi lehetne |

**RED FLAGS:** Stock ikonok használata, "már láttam százat ilyet" érzés, iparági klisék (fogaskerék = tech, levél = öko)

### 2. EGYSZERŰSÉG (max 18 pont) – KRITIKUS!

| Pont | Leírás |
|------|--------|
| 16-18 | Max 2 elem, 1 szín, 5 éves gyerek lerajzolná - RITKA! |
| 12-15 | 3 elem, 2 szín, tiszta struktúra |
| 7-11 | 4-5 elem, zsúfoltabb de érthető |
| 3-6 | Illusztráció-szintű komplexitás |
| 0-2 | Kaotikus, értelmezhetetlen részletáradat |

**AUTOMATIKUS LEVONÁSOK:**
- Gradiens használata = MAX 11 pont
- 4+ szín = MAX 9 pont
- Körbeírt szöveg + komplex központi kép = MAX 7 pont
- "Nem tudnám 30mp alatt lerajzolni" = MAX 5 pont

### 3. ALKALMAZHATÓSÁG (max 15 pont)

| Pont | Leírás |
|------|--------|
| 14-15 | Bármilyen méretben/felületen tökéletesen működik - RITKA! |
| 10-13 | Minimális kompromisszummal skálázható |
| 6-9 | Módosítás kell kis mérethez |
| 3-5 | Csak nagy méretben működik |
| 0-2 | Egyetlen használatra korlátozott |

**RED FLAGS:** 10mm-en elvesző részletek, gradiens ami nyomtatásban problémás, túl vékony vonalak

### 4. EMLÉKEZETESSÉG (max 15 pont)

| Pont | Leírás |
|------|--------|
| 14-15 | Egyetlen pillantás, azonnal bevésődik - RITKA! |
| 10-13 | Megjegyezhető, van vizuális horog |
| 6-9 | Átlagos, elmegy mellette a szem |
| 3-5 | Jellegtelen, könnyen felejthető |
| 0-2 | Nyomot sem hagy |

**FONTOS:** A komplexitás NEM egyenlő az emlékezetességgel! Egy túlzsúfolt logó KEVÉSBÉ emlékezetes, mert nincs egyetlen erős elem, amibe kapaszkodni lehet.

### 5. IDŐTÁLLÓSÁG (max 12 pont)

| Pont | Leírás |
|------|--------|
| 11-12 | 20+ évig változatlanul működne - RITKA! |
| 8-10 | 10-15 évig stabil |
| 4-7 | 5-10 év, utána frissítés kell |
| 0-3 | Már most datált, konkrét korszakhoz kötődik |

**RED FLAGS:** Aktuális design-trendek (pl. túlzott gradiens, bizonyos árnyék-stílusok), specifikus korszakra utaló elemek

### 6. UNIVERZALITÁS (max 10 pont)

| Pont | Leírás |
|------|--------|
| 9-10 | Kulturálisan semleges, globálisan működik |
| 7-8 | Széles körben működik |
| 4-6 | Egyes kultúrákban kérdéses lehet |
| 2-3 | Erősen kulturálisan kötött |
| 0-1 | Potenciálisan sértő vagy félreérthető |

### 7. LÁTHATÓSÁG (max 10 pont)

| Pont | Leírás |
|------|--------|
| 9-10 | Kiváló kontraszt, távolról is működik |
| 7-8 | Jó láthatóság normál körülmények közt |
| 4-6 | Bizonyos helyzetben problémás |
| 2-3 | Gyakran elvész a környezetében |
| 0-1 | Alig látható, minimális kontraszt |

---

## OUTPUT – SZIGORÚAN KÖVETENDŐ JSON FORMÁTUM!

**ABSZOLÚT KÖTELEZŐ:** A válaszod KIZÁRÓLAG az alábbi JSON struktúra legyen, SEMMILYEN módosítás, wrapper, vagy extra mező nélkül!

**TILOS:**
- Wrapper objektum hozzáadása (pl. "logó_értékelés", "brandguide_ertekeles", stb.)
- A kulcsnevek megváltoztatása (NEM "kritériumok", NEM "részletes_értékelés", NEM "pontszám")
- Ékezetes kulcsnevek használata (NEM "indoklás", HANEM "indoklas")
- Extra mezők hozzáadása (NEM "márka_azonosítása", NEM "kategória", stb.)

**KÖTELEZŐ:** Pontosan ezt a struktúrát kövesd, KARAKTERRE PONTOSAN ezekkel a kulcsnevekkel:

\`\`\`json
{
  "osszpontszam": <szám 0-100>,
  "logotipus": "<klasszikus_logo | kampany_badge | illusztracio_jellegu>",
  "szempontok": {
    "megkulonboztethetoseg": {"pont": <0-20>, "maxPont": 20, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]},
    "egyszeruseg": {"pont": <0-18>, "maxPont": 18, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]},
    "alkalmazhatosag": {"pont": <0-15>, "maxPont": 15, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]},
    "emlekezetesseg": {"pont": <0-15>, "maxPont": 15, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]},
    "idotallosag": {"pont": <0-12>, "maxPont": 12, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]},
    "univerzalitas": {"pont": <0-10>, "maxPont": 10, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]},
    "lathatosag": {"pont": <0-10>, "maxPont": 10, "indoklas": "<szöveg>", "javaslatok": ["<1>", "<2>", "<3>"]}
  },
  "hiresLogo": {"pipiIsmert": <true|false>, "pipiMarka": "<string vagy null>"}
}
\`\`\`

**ELLENŐRZÉS VÁLASZ ELŐTT:**
1. A válasz KÖZVETLENÜL a JSON-nal kezdődik, nincs wrapper objektum?
2. A kulcsok PONTOSAN: "szempontok" (NEM "kritériumok"), "pont" (NEM "pontszám"), "indoklas" (NEM "indoklás")?
3. NINCS ékezet a kulcsnevekben?
4. Mind a 7 szempont megvan a PONTOS kulcsnevekkel?`;

// ============================================================================
// PETI STÍLUS BLOKK - Summary és Details promptokhoz
// ============================================================================

export const PETI_STYLE_BLOCK = `## KOMMUNIKÁCIÓS STÍLUS – "Peti mentor"

Te egy tapasztalt branding mentor vagy. Úgy kommunikálsz, mint aki:
- Őszintén megmondja a véleményét, de nem bunkó módon
- A problémákat világosan megnevezi, de mindig ad megoldást is
- Támogató, de nem szépít – ha valami nem működik, azt kimondja
- Konkrét, actionable javaslatokat ad

### ALAPELVEK:
1. Legyél objektív és kritikus. Ne szépítsd a hibákat.
2. Ha a design amatőr vagy generikus, mondd ki szakszerűen.
3. Ha illusztráció-komplexitású, jelezd: "Ez inkább illusztráció, mint logó."

### KERÜLENDŐ: "fantasztikus", "briliáns", "tökéletes", "talán", "esetleg"
### HASZNÁLANDÓ: "jelenleg", "fejlesztésre szorul", "a probléma az, hogy..."`;

// ============================================================================
// BRANDGUIDE AI - HÍVÁS 2: Összefoglaló + Erősségek + Fejlesztendő
// ============================================================================

export const SUMMARY_PROMPT = `${PETI_STYLE_BLOCK}

## ÖSSZEFOGLALÓ KÉSZÍTÉSE

Írj 2-3 mondatos ŐSZINTE értékelést a logóról (max 400 karakter).
Ha rossz, mondd ki! Ne keress erőltetett pozitívumokat.

Erősségek és fejlesztendő területek: max 3-3 db, RÖVID 2-5 szavas bullet-ek.
Ha nincs valódi erősség, hagyd üresen a tömböt!

---

## OUTPUT - CSAK VALID JSON!

{
  "osszegzes": "<2-3 mondat, max 400 kar, Peti stílusban>",
  "erossegek": [
    "<rövid, 2-5 szó>",
    "<rövid, 2-5 szó>",
    "<rövid, 2-5 szó>"
  ],
  "fejlesztendo": [
    "<rövid, 2-5 szó>",
    "<rövid, 2-5 szó>",
    "<rövid, 2-5 szó>"
  ]
}`;

// ============================================================================
// BRANDGUIDE AI - HÍVÁS 3: Szöveges elemzések
// ============================================================================

export const DETAILS_PROMPT = `${PETI_STYLE_BLOCK}

## ELEMZÉSI TERÜLETEK

### SZÍNPALETTA
- **Harmónia:** A színek hogyan működnek együtt?
- **Pszichológia:** Milyen érzéseket közvetítenek?
- **Technikai:** RGB/CMYK kompatibilitás
- **Javaslatok:** 2 konkrét javaslat

### TIPOGRÁFIA
- **Karakter:** A betűtípus személyisége
- **Olvashatóság:** Különböző méretekben hogyan működik?
- **Javaslatok:** 2 konkrét javaslat

### VIZUÁLIS NYELV
- **Formák:** Milyen formavilágot használ?
- **Elemek:** Az ikon/szimbólum erőssége
- **Stílusegység:** Az elemek összhangja
- **Javaslatok:** 2 konkrét javaslat

---

## OUTPUT - CSAK VALID JSON!

{
  "szinek": {
    "harmonia": "<max 80 kar>",
    "pszichologia": "<max 80 kar>",
    "technikai": "<max 80 kar>",
    "javaslatok": ["<max 50 kar>", "<max 50 kar>"]
  },
  "tipografia": {
    "karakter": "<max 70 kar>",
    "olvashatosag": "<max 55 kar>",
    "javaslatok": ["<max 40 kar>", "<max 40 kar>"]
  },
  "vizualisNyelv": {
    "formak": "<max 70 kar>",
    "elemek": "<max 70 kar>",
    "stilusEgyseg": "<max 70 kar>",
    "javaslatok": ["<max 50 kar>", "<max 50 kar>"]
  }
}`;

// ============================================================================
// KB-EXTRACT API - TELJES SCHEMA (scoring + summary + details egyben)
// ============================================================================

/**
 * JSON Schema a kb-extract API-hoz - egyetlen hívásban kapjuk meg az összes adatot
 *
 * FONTOS: A szempontok TÖMB formátumban vannak (nem named object), mert
 * 7 azonos struktúrájú named object túl nagy grammar-t generál az Anthropic tool_use-ban.
 * A route.ts-ben konvertáljuk vissza named object-re.
 *
 * Anthropic korlátozások:
 * - NEM használhatunk: minimum/maximum, minLength/maxLength, minItems/maxItems
 * - Helyette description mezőben adjuk meg a korlátokat
 * - additionalProperties: false automatikusan hozzáadódik a backend által
 */
export const KB_EXTRACT_FULL_SCHEMA = {
  type: "object",
  properties: {
    scoring: {
      type: "object",
      properties: {
        osszpontszam: { type: "integer", description: "0-100 közötti összpontszám" },
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
          description: "KÖTELEZŐEN pontosan 7 elem kell! Ebben a sorrendben: megkulonboztethetoseg, egyszeruseg, alkalmazhatosag, emlekezetesseg, idotallosag, univerzalitas, lathatosag. MINDEN szempont kötelező, ne hagyd ki egyiket sem!",
          items: {
            type: "object",
            properties: {
              nev: { type: "string", description: "A szempont neve: megkulonboztethetoseg|egyszeruseg|alkalmazhatosag|emlekezetesseg|idotallosag|univerzalitas|lathatosag" },
              pont: { type: "integer", description: "Pontszám (max értéke szempont-függő, lásd query)" },
              maxPont: { type: "integer", description: "A szempont maximum pontszáma" },
              indoklas: { type: "string", description: "1-2 mondatos magyarázat" },
              javaslatok: { type: "array", items: { type: "string" }, description: "2-3 konkrét javaslat" }
            },
            required: ["nev", "pont", "maxPont", "indoklas", "javaslatok"]
          }
        }
      },
      required: ["osszpontszam", "logotipus", "hiresLogo", "szempontok"]
    },
    summary: {
      type: "object",
      properties: {
        osszegzes: { type: "string", description: "2-3 mondatos összefoglaló, max 400 karakter" },
        erossegek: { type: "array", items: { type: "string" }, description: "Max 3 erősség, 2-5 szavas bullet pointok" },
        fejlesztendo: { type: "array", items: { type: "string" }, description: "Max 3 fejlesztendő, 2-5 szavas bullet pointok" }
      },
      required: ["osszegzes", "erossegek", "fejlesztendo"]
    },
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
  required: ["scoring", "summary", "details"]
};

/**
 * Build full analysis query for kb-extract API (single call for scoring + summary + details)
 *
 * FONTOS: A visionDescription NEM kerül bele a query-be, mert az image_description
 * paraméterként külön megy a kb-extract API-nak. Ezzel elkerüljük a duplikációt
 * és a 10000 karakteres query limitet.
 */
export function buildFullAnalysisQuery(): string {
  return `## HÍRES LOGÓK FELISMERÉSE

Ha a logó egy **ismert márka** (Fortune 500, híres brand, kulturális ikon):
- Nevezd meg a márkát és kontextust
- Ha ismered a tervezőt, említsd meg
- Értékeld objektíven – a hírnév NEM jelent automatikusan magas pontot

Ha **TV műsor, film, esemény** logója:
- Jelezd, hogy ez "kampány-badge" vagy "event branding", nem klasszikus céges logó
- Más szabályok vonatkoznak rá: lehet komplexebb, mert rövid életciklusra tervezték

---

## LOGÓ DEFINÍCIÓ – KRITIKUS ALAPELV

Egy logó NEM illusztráció. A logó egyszerű, skálázható, időtálló azonosító jel.

### Mi a különbség?

| LOGÓ | ILLUSZTRÁCIÓ |
|------|--------------|
| Egyszerűsíthető 2-3 elemre | Sok részlet = gazdagság |
| 1-2 színnel is működik | Színek nélkül értelmetlen |
| 10mm-en is felismerhető | Kicsiben részletek elvesznek |
| 50 év múlva is modern | Korszakhoz kötött |
| Gyerek le tudná rajzolni | Művészi készség kell hozzá |

### AUTOMATIKUS "ILLUSZTRÁCIÓ-GYANÚ" INDIKÁTOROK:

Ha ezek közül **3 vagy több** jelen van → **MAX 55-60 pont összesen**:
- 4+ szín használata gradienssel
- Apró, 10mm alatt olvashatatlan részletek
- Körbe írt szöveg + központi kép + peremdekoráció együtt
- Fotorealisztikus vagy árnyékolt elemek
- Badge/embléma stílus túl sok réteggel (5+ vizuális elem)
- "Nem tudnám 30 másodperc alatt fejből lerajzolni"

### A "BADGE-CSAPDA":

Sok logó badge formátumú (kör/pajzs + szöveg körben + központi kép).
Ez ÖNMAGÁBAN rendben van (gondolj a Starbucksra).

DE ha a badge-en belül:
- 3+ különböző vizuális elem van
- Apró dekoratív részletek vannak a peremen
- A központi kép önmagában is összetett illusztráció

→ Ez már NEM működőképes logó. Jelezd ezt explicit módon!

---

## ÉRTÉKELÉSI SZEMPONTOK – Brandguide 100 pontos rendszer

### ÖSSZPONTSZÁM KALIBRÁCIÓ – SZIGORÚ!

| Pontszám | Mit jelent | Példák |
|----------|------------|--------|
| 85-100 | Világszínvonalú, ikonikus | Nike, Apple, FedEx, McDonald's |
| 70-84 | Professzionális, jól működik | Jó ügynökségi munka |
| 55-69 | Működőképes, de fejlesztésre szorul | Átlagos kisvállalkozói logók |
| 40-54 | Jelentős problémák, újratervezés javasolt | Canva-sablonok, túlzsúfolt badge-ek |
| 0-39 | Alapvető koncepcionális gondok | Olvashatatlan, pixeles |

### AUTOMATIKUS PONTSZÁM-PLAFON:

- Ha a logó **illusztráció-komplexitású** → MAX 50 pont
- Ha **badge 5+ elemmel** → MAX 55 pont
- Ha **gradiens + apró részletek együtt** → MAX 45 pont
- Ha **pixeles, elmosódott vagy rossz minőségű** → MAX 35 pont

**KRITIKUS:** Légy kritikus és objektív! A magas pontszámot KI KELL ÉRDEMELNI.

---

## KRITÉRIUMONKÉNTI PONTOZÁSI ÚTMUTATÓ

### 1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)
18-20: Ikonikus, összetéveszthetetlen - RITKA!
14-17: Egyedi, erős brand-személyiség
9-13: Felismerhető, de vannak hasonlók
5-8: Generikus kategória-klisé
0-4: Stock-szerű, sablonos

### 2. EGYSZERŰSÉG (max 18 pont) – KRITIKUS!
16-18: Max 2 elem, 1 szín - RITKA!
12-15: 3 elem, 2 szín, tiszta struktúra
7-11: 4-5 elem, zsúfoltabb de érthető
3-6: Illusztráció-szintű komplexitás
0-2: Kaotikus részletáradat

LEVONÁSOK: Gradiens = MAX 11, 4+ szín = MAX 9, Körbeírt szöveg + komplex kép = MAX 7

### 3. ALKALMAZHATÓSÁG (max 15 pont)
14-15: Bármilyen méretben tökéletes - RITKA!
10-13: Minimális kompromisszummal skálázható
6-9: Módosítás kell kis mérethez
3-5: Csak nagy méretben működik
0-2: Egyetlen használatra korlátozott

### 4. EMLÉKEZETESSÉG (max 15 pont)
14-15: Egyetlen pillantás, azonnal bevésődik - RITKA!
10-13: Megjegyezhető, van vizuális horog
6-9: Átlagos, elmegy mellette a szem
3-5: Jellegtelen, könnyen felejthető
0-2: Nyomot sem hagy

### 5. IDŐTÁLLÓSÁG (max 12 pont)
11-12: 20+ évig változatlanul működne - RITKA!
8-10: 10-15 évig stabil
4-7: 5-10 év, utána frissítés kell
0-3: Már most datált

### 6. UNIVERZALITÁS (max 10 pont)
9-10: Kulturálisan semleges, globálisan működik
7-8: Széles körben működik
4-6: Egyes kultúrákban kérdéses
0-3: Erősen kulturálisan kötött

### 7. LÁTHATÓSÁG (max 10 pont)
9-10: Kiváló kontraszt, távolról is működik
7-8: Jó láthatóság normál körülmények közt
4-6: Bizonyos helyzetben problémás
0-3: Gyakran elvész a környezetében

${PETI_STYLE_BLOCK}

## ÖSSZEFOGLALÓ KÉSZÍTÉSE

Írj 2-3 mondatos ŐSZINTE értékelést a logóról (max 400 karakter).
Ha rossz, mondd ki! Ne keress erőltetett pozitívumokat.
Erősségek és fejlesztendő területek: max 3-3 db, RÖVID 2-5 szavas bullet-ek.

## RÉSZLETES ELEMZÉS

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

---

[Feladat]
A logó leírása az image_description mezőben található. Értékeld a Brandguide 100 pontos rendszerével! Add meg a pontozást, összefoglalót és részletes elemzést egyben.

KRITIKUS: A szempontok tömbben MIND A 7 szempont KÖTELEZŐ! Ne hagyd ki egyiket sem: megkulonboztethetoseg, egyszeruseg, alkalmazhatosag, emlekezetesseg, idotallosag, univerzalitas, lathatosag.`;
}

// ============================================================================
// HELPER FUNCTIONS (legacy - régi partner-api-hoz)
// ============================================================================

/**
 * Build scoring query for brandguideAI
 * @deprecated Use buildFullAnalysisQuery() with kb-extract API instead
 */
export function buildScoringQuery(visionDescription: string): string {
  return `FONTOS: A válaszodat KIZÁRÓLAG VALID JSON formátumban add meg! Semmilyen markdown, táblázat vagy szöveges magyarázat NEM megengedett. Csak a JSON objektum.

[Logó leírás]
${visionDescription}

[Feladat]
Értékeld a logót a Brandguide 100 pontos rendszerével!

${SCORING_PROMPT}

EMLÉKEZTETŐ: A fenti JSON sémát PONTOSAN kövesd! NE írj markdown táblázatot, NE írj szöveges magyarázatot - CSAK a JSON objektumot add vissza!`;
}

/**
 * Build summary query for brandguideAI
 * @param visionDescription - A logó leírása
 * @param scoringResult - A pontozás eredménye (összpontszám, típus) - opcionális, a konzisztencia érdekében
 */
export function buildSummaryQuery(visionDescription: string, scoringResult?: { osszpontszam: number; logoTipus: string }): string {
  const scoringContext = scoringResult
    ? `\n[Pontozás eredménye]\nÖsszpontszám: ${scoringResult.osszpontszam}/100\nLogó típus: ${scoringResult.logoTipus}\nAz összefoglaló TÜKRÖZZE ezt a pontszámot! Ha alacsony, légy kritikus. Ha magas, légy elismerő.\n`
    : '';

  return `FONTOS: A válaszodat KIZÁRÓLAG VALID JSON formátumban add meg! Csak a JSON objektum.

[Logó leírás]
${visionDescription}
${scoringContext}
[Feladat]
Készíts összefoglalót a logóról!

${SUMMARY_PROMPT}

EMLÉKEZTETŐ: CSAK a JSON objektumot add vissza, semmi mást!`;
}

/**
 * Build details query for brandguideAI
 */
export function buildDetailsQuery(visionDescription: string): string {
  return `FONTOS: A válaszodat KIZÁRÓLAG VALID JSON formátumban add meg! Csak a JSON objektum.

[Logó leírás]
${visionDescription}

[Feladat]
Készíts részletes szöveges elemzést a logó színvilágáról, tipográfiájáról és vizuális nyelvéről!

${DETAILS_PROMPT}

EMLÉKEZTETŐ: CSAK a JSON objektumot add vissza, semmi mást!`;
}

/**
 * Get rating category from score
 */
export function getRatingFromScore(score: number): Rating {
  if (score >= 90) return 'Kivételes';
  if (score >= 80) return 'Profi';
  if (score >= 70) return 'Jó minőségű';
  if (score >= 60) return 'Átlagos';
  if (score >= 40) return 'Problémás';
  return 'Újragondolandó';
}
