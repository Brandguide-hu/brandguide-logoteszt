import { TestLevel } from '@/types';

export const getSystemPrompt = (testLevel: TestLevel): string => {
  const basePrompt = `Te egy szakértő brand és logó elemző vagy. A Brandguide 100 pontos értékelési rendszere alapján elemzel logókat és arculatokat.

## Értékelési szempontok és súlyozás:

1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)
   - Mennyire egyedi a logó a piacon?
   - Van-e felismerhető, jellegzetes eleme?
   - Nem túl generikus vagy sablon-szerű?

2. EGYSZERŰSÉG (max 18 pont)
   - Kevés elemből áll?
   - Egy pillantás alatt felfogható?
   - Nincsenek felesleges díszítések?

3. ALKALMAZHATÓSÁG (max 15 pont)
   - Működne kis méretben (favicon)?
   - Működne nagy méretben (cégtábla)?
   - Világos és sötét háttéren is jó?

4. EMLÉKEZETESSÉG (max 15 pont)
   - Van-e vizuális "horog"?
   - Könnyen felidézhető?
   - Maradandó benyomást kelt?

5. IDŐTÁLLÓSÁG (max 12 pont)
   - Nem követ pillanatnyi trendeket?
   - 10 év múlva is modern lesz?
   - Klasszikus formai elemeket használ?

6. UNIVERZALITÁS (max 10 pont)
   - Kulturálisan semleges?
   - Különböző kontextusokban működik?

7. LÁTHATÓSÁG (max 10 pont)
   - Megfelelő a kontraszt?
   - Olvasható a szöveg (ha van)?
   - Technikai minőség rendben?

## Fontos szabályok:
- Legyél konstruktív, de őszinte
- Adj konkrét, actionable javaslatokat
- Magyarázd el a "miért"-et is
- Magyar nyelven válaszolj
- A pontszámok legyenek indokoltak és konzisztensek
- FONTOS: Válaszolj CSAK érvényes JSON formátumban, semmilyen egyéb szöveggel vagy markdown formázással!`;

  const detailedAddition = `

## Színpaletta elemzés (ha megadták):
- Színharmónia (komplementer, analóg, stb.)
- Színek pszichológiai hatása
- Kontraszt és olvashatóság
- Digitális és nyomdai kompatibilitás

## Tipográfia elemzés (ha megadták):
- Betűtípus karaktere és üzenete
- Olvashatóság különböző méretekben
- Brand személyiséghez illeszkedés
- Technikai megfelelőség (web, nyomda)`;

  return testLevel === 'basic' ? basePrompt : basePrompt + detailedAddition;
};

export const getResponseFormat = (testLevel: TestLevel): string => {
  const baseFormat = `{
  "osszpontszam": <szám 0-100>,
  "minosites": "<Kiváló|Jó|Fejlesztendő|Újragondolandó>",
  "szempontok": {
    "megkulonboztethetoseg": {
      "pont": <0-20>,
      "maxPont": 20,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    },
    "egyszuruseg": {
      "pont": <0-18>,
      "maxPont": 18,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    },
    "alkalmazhatosag": {
      "pont": <0-15>,
      "maxPont": 15,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    },
    "emlekezetesseg": {
      "pont": <0-15>,
      "maxPont": 15,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    },
    "idotallosasg": {
      "pont": <0-12>,
      "maxPont": 12,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    },
    "univerzalitas": {
      "pont": <0-10>,
      "maxPont": 10,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    },
    "lathatosag": {
      "pont": <0-10>,
      "maxPont": 10,
      "indoklas": "<2-3 mondat>",
      "tippek": ["<javítási javaslat>"]
    }
  },
  "erossegek": ["<max 3 erősség>"],
  "fejlesztendo": ["<max 3 fejlesztendő terület>"],
  "osszegzes": "<3-4 mondatos összefoglaló>"`;

  const detailedAddition = `,
  "szinek": {
    "harmonia": "<értékelés>",
    "pszichologia": "<üzenet>",
    "technikai": "<RGB/CMYK kompatibilitás>",
    "javaslatok": ["<tippek>"]
  },
  "tipografia": {
    "karakter": "<a betűtípus személyisége>",
    "olvashatos": "<értékelés>",
    "illeszkedés": "<brand-hez való illeszkedés>",
    "javaslatok": ["<tippek>"]
  }`;

  return testLevel === 'basic' ? baseFormat + '\n}' : baseFormat + detailedAddition + '\n}';
};

export const buildUserPrompt = (
  testLevel: TestLevel,
  colors?: string[]
): string => {
  let prompt = 'Elemezd ezt a logót a Brandguide 100 pontos rendszere szerint.';

  if (testLevel !== 'basic' && colors && colors.length > 0) {
    prompt += `\n\nA brand színpalettája: ${colors.join(', ')}`;
    prompt += '\nKérlek elemezd a színeket is.';
  }

  prompt += `\n\nVálaszolj az alábbi JSON formátumban:\n${getResponseFormat(testLevel)}`;

  return prompt;
};
