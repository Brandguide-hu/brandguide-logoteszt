/**
 * Logo Analyzer V2 - Prompts
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás
 * 2. brandguideAI Hívás 1 - Pontozás + Összefoglaló
 * 3. brandguideAI Hívás 2 - Szöveges elemzések (színek, tipográfia, vizuális nyelv)
 */

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
// PETI STÍLUS BLOKK - Tömörített verzió a token limit miatt
// ============================================================================

export const PETI_STYLE_BLOCK = `## Stílus: "Peti mentor"
Őszinte, szakmai értékelés – nem szépít, de ad megoldást. Tárgyilagos, közvetlen.
Struktúra: Probléma → Miért probléma → Javaslat.
Kerülendő: "talán", "esetleg", "fantasztikus!", "rossz", "hibás".
Használandó: "jelenleg", "konkrétan", "fejlesztésre szorul", "érdemes lenne".`;

// ============================================================================
// BRANDGUIDE AI - HÍVÁS 1: Pontozás + Összefoglaló
// ============================================================================

export const SCORING_PROMPT = `${PETI_STYLE_BLOCK}

## PONTOZÁS – 7 szempont, 100 pont

1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20) 2. EGYSZERŰSÉG (max 18) 3. ALKALMAZHATÓSÁG (max 15) 4. EMLÉKEZETESSÉG (max 15) 5. IDŐTÁLLÓSÁG (max 12) 6. UNIVERZALITÁS (max 10) 7. LÁTHATÓSÁG (max 10)

## FONTOS: Válasz MAX 2000 karakter! Rövid indoklások (max 80 kar), 1 javaslat/szempont!

## OUTPUT: CSAK VALID JSON (semmilyen más szöveg)!

{"osszpontszam":<0-100>,"minosites":"<Kiemelkedő|Kiforrott|Jó|Elfogadható|Fejlesztendő|Újragondolandó>","szempontok":{"megkulonboztethetoseg":{"pont":<0-20>,"maxPont":20,"indoklas":"<80kar>","javaslatok":["<javaslat>"]},"egyszeruseg":{"pont":<0-18>,"maxPont":18,"indoklas":"<80kar>","javaslatok":["<javaslat>"]},"alkalmazhatosag":{"pont":<0-15>,"maxPont":15,"indoklas":"<80kar>","javaslatok":["<javaslat>"]},"emlekezetesseg":{"pont":<0-15>,"maxPont":15,"indoklas":"<80kar>","javaslatok":["<javaslat>"]},"idotallosag":{"pont":<0-12>,"maxPont":12,"indoklas":"<80kar>","javaslatok":["<javaslat>"]},"univerzalitas":{"pont":<0-10>,"maxPont":10,"indoklas":"<80kar>","javaslatok":["<javaslat>"]},"lathatosag":{"pont":<0-10>,"maxPont":10,"indoklas":"<80kar>","javaslatok":["<javaslat>"]}},"osszegzes":"<150kar>","erossegek":["<erősség>","<erősség>"],"fejlesztendo":["<fejlesztendő>","<fejlesztendő>"]}`;

// ============================================================================
// BRANDGUIDE AI - HÍVÁS 2: Szöveges elemzések
// ============================================================================

export const DETAILS_PROMPT = `${PETI_STYLE_BLOCK}

## ELEMZÉS: Színek, Tipográfia, Vizuális nyelv

## OUTPUT: CSAK VALID JSON!

{"szinek":{"harmonia":"<max 80 kar>","pszichologia":"<max 90 kar>","technikai":"<RGB/CMYK, max 90 kar>","javaslatok":["<javaslat>","<javaslat>"]},"tipografia":{"karakter":"<max 70 kar>","olvashatosag":"<max 55 kar>","javaslatok":["<javaslat>","<javaslat>","<javaslat>"]},"vizualisNyelv":{"formak":"<max 70 kar>","elemek":"<max 70 kar>","stilusEgyseg":"<max 70 kar>","javaslatok":["<javaslat>","<javaslat>"]}}`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build scoring query for brandguideAI
 */
export function buildScoringQuery(visionDescription: string): string {
  return `[Logó leírás]
${visionDescription}

[Feladat]
Értékeld a logót a brandguide SCORE rendszerével!

${SCORING_PROMPT}`;
}

/**
 * Build details query for brandguideAI
 */
export function buildDetailsQuery(visionDescription: string): string {
  return `[Logó leírás]
${visionDescription}

[Feladat]
Készíts részletes szöveges elemzést a logó színvilágáról, tipográfiájáról és vizuális nyelvéről!

${DETAILS_PROMPT}`;
}

/**
 * Get rating category from score
 */
export function getRatingFromScore(score: number): string {
  if (score >= 90) return 'Kiemelkedő';
  if (score >= 80) return 'Kiforrott';
  if (score >= 65) return 'Jó';
  if (score >= 50) return 'Elfogadható';
  if (score >= 35) return 'Fejlesztendő';
  return 'Újragondolandó';
}
