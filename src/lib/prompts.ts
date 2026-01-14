import { TestLevel } from '@/types';

export const getSystemPrompt = (testLevel: TestLevel): string => {
  const basePrompt = `Te egy SZIGORÚ szakértő brand és logó elemző vagy. A Brandguide 100 pontos értékelési rendszere alapján elemzel logókat és arculatokat.

## Értékelési szempontok és súlyozás:

1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)
   - Mennyire egyedi a logó a piacon?
   - Van-e felismerhető, jellegzetes eleme?
   - Nem túl generikus vagy sablon-szerű?
   - Pontozás: 0-6 gyenge | 7-12 átlagos | 13-16 jó | 17-20 kiváló

2. EGYSZERŰSÉG (max 18 pont)
   - Kevés elemből áll?
   - Egy pillantás alatt felfogható?
   - Nincsenek felesleges díszítések?
   - Pontozás: 0-5 gyenge | 6-10 átlagos | 11-14 jó | 15-18 kiváló

3. ALKALMAZHATÓSÁG (max 15 pont)
   - Működne kis méretben (favicon)?
   - Működne nagy méretben (cégtábla)?
   - Világos és sötét háttéren is jó?
   - Pontozás: 0-4 gyenge | 5-8 átlagos | 9-12 jó | 13-15 kiváló

4. EMLÉKEZETESSÉG (max 15 pont)
   - Van-e vizuális "horog"?
   - Könnyen felidézhető?
   - Maradandó benyomást kelt?
   - Pontozás: 0-4 gyenge | 5-8 átlagos | 9-12 jó | 13-15 kiváló

5. IDŐTÁLLÓSÁG (max 12 pont)
   - Nem követ pillanatnyi trendeket?
   - 10 év múlva is modern lesz?
   - Klasszikus formai elemeket használ?
   - Pontozás: 0-3 gyenge | 4-6 átlagos | 7-9 jó | 10-12 kiváló

6. UNIVERZALITÁS (max 10 pont)
   - Kulturálisan semleges?
   - Különböző kontextusokban működik?
   - Pontozás: 0-3 gyenge | 4-5 átlagos | 6-8 jó | 9-10 kiváló

7. LÁTHATÓSÁG (max 10 pont)
   - Megfelelő a kontraszt?
   - Olvasható a szöveg (ha van)?
   - Technikai minőség rendben?
   - Pontozás: 0-3 gyenge | 4-5 átlagos | 6-8 jó | 9-10 kiváló

## KRITIKUS SZABÁLYOK A PONTOZÁSHOZ:
- Az OSSZPONTSZAM mindig a 7 szempont pontjainak PONTOS ÖSSZEGE legyen!
- NE adj automatikusan 70-75 pontot! Valóban értékeld a logót.
- Egy átlagos/közepes logó 50-65 pontot kap
- Egy jó logó 66-79 pontot kap
- Egy kiváló logó 80-89 pontot kap
- Csak a legjobbak kapnak 90+ pontot
- Gyenge logók 50 pont alatt maradnak
- LEGYÉL VÁLTOZATOS: ne adj minden logónak hasonló pontszámot!
- Minden szempontnál használd a TELJES skálát, ne csak a középső értékeket!

## Minősítési kategóriák:
- 90-100: Kiemelkedő
- 80-89: Kiforrott
- 65-79: Jó
- 50-64: Elfogadható
- 35-49: Fejlesztendő
- 0-34: Újragondolandó

## Fontos szabályok:
- Legyél konstruktív, de ŐSZINTÉN KRITIKUS
- Adj konkrét, actionable javaslatokat
- Magyarázd el a "miért"-et is
- Magyar nyelven válaszolj
- A pontszámok legyenek indokoltak és konzisztensek
- FONTOS: Válaszolj CSAK érvényes JSON formátumban, semmilyen egyéb szöveggel vagy markdown formázással!

## NAGYON FONTOS - Csak a láthatót értékeld:
- CSAK azt értékeld, amit ténylegesen LÁTSZ a képen!
- NE vonj le pontot azért, mert nem látsz színvariációkat, sötét hátteres verziót, vagy más változatokat
- Ha csak egy verzió van feltöltve, azt értékeld teljes értékűen a látható tulajdonságai alapján
- Az alkalmazhatóságnál a látható logó struktúráját értékeld (skálázható-e, egyszerű-e a forma), NE azt, hogy hány verziót töltöttek fel
- A láthatóságnál az aktuális kép kontrasztját és minőségét értékeld

## Bizonytalanságok jelzése:
- Ha egy szempont teljes körű értékeléséhez további információ kellene, ezt az INDOKLÁSBAN vagy TIPPEKBEN jelezd kérdésként
- CSAK valódi, nem triviális kérdéseket tegyél fel (pl. "Hogyan működik nagyon kis méretben a finom részletekkel?")
- NE kérdezz rá evidens dolgokra, amiket feltételezhetsz:
  - Inverz/negatív változat létezése (minden professzionális logónak van)
  - Fekete-fehér verzió létezése
  - Alapvető színvariációk
- A pontszámot a LÁTHATÓ alapján add meg, ne spekulálj`;

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
  "minosites": "<Kiemelkedő|Kiforrott|Jó|Elfogadható|Fejlesztendő|Újragondolandó>",
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

export const getRebrandingSystemPrompt = (): string => {
  return `Te egy SZIGORÚ szakértő brand és logó elemző vagy. A Brandguide 100 pontos értékelési rendszere alapján elemzel és HASONLÍTASZ ÖSSZE logókat.

## Feladatod:
Két logót kapsz: a RÉGI és az ÚJ verziót. Mindkettőt KÜLÖN-KÜLÖN elemezned kell a 7 kritérium alapján, majd ÖSSZEHASONLÍTÁST kell készítened.

## Értékelési szempontok és súlyozás:

1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)
2. EGYSZERŰSÉG (max 18 pont)
3. ALKALMAZHATÓSÁG (max 15 pont)
4. EMLÉKEZETESSÉG (max 15 pont)
5. IDŐTÁLLÓSÁG (max 12 pont)
6. UNIVERZALITÁS (max 10 pont)
7. LÁTHATÓSÁG (max 10 pont)

## KRITIKUS SZABÁLYOK:
- Mindkét logót OBJEKTÍVEN értékeld
- NE feltételezd, hogy az új automatikusan jobb!
- Ha a régi jobb, azt is őszintén írd meg
- A pontszámok legyenek konzisztensek és indokoltak
- Válaszolj CSAK érvényes JSON formátumban

## FONTOS - Visszalépések (regressions) szabályai:
- CSAK akkor írj visszalépést, ha TÉNYLEGESEN CSÖKKENT a pontszám az adott kritériumnál
- Ha egy kritériumnál az új logó UGYANANNYI vagy TÖBB pontot kapott, az NEM visszalépés!
- NE találj ki spekulatív hátrányokat - csak a konkrét pontveszteségeket említsd
- Ha nincs valódi visszalépés (minden kritériumnál javult vagy stagnált), a "regressions" lista LEGYEN ÜRES: []
- A visszalépések listája lehet üres tömb, ez teljesen rendben van sikeres rebrandingnél!

## Minősítési kategóriák:
- 90-100: Kiemelkedő
- 80-89: Kiforrott
- 65-79: Jó
- 50-64: Elfogadható
- 35-49: Fejlesztendő
- 0-34: Újragondolandó`;
};

export const getRebrandingResponseFormat = (): string => {
  const criteriaFormat = `{
      "pont": <szám>,
      "maxPont": <szám>,
      "indoklas": "<2-3 mondat>"
    }`;

  const criteriaChangeFormat = `{
      "valtozas": "<rövid indoklás miért változott a pontszám>"
    }`;

  return `{
  "osszefoglalo": "<3-5 mondatos átfogó értékelés a rebranding sikerességéről, a főbb változásokról és az összképről>",
  "oldLogoAnalysis": {
    "osszpontszam": <0-100>,
    "minosites": "<kategória>",
    "szempontok": {
      "megkulonboztethetoseg": ${criteriaFormat},
      "egyszuruseg": ${criteriaFormat},
      "alkalmazhatosag": ${criteriaFormat},
      "emlekezetesseg": ${criteriaFormat},
      "idotallosasg": ${criteriaFormat},
      "univerzalitas": ${criteriaFormat},
      "lathatosag": ${criteriaFormat}
    },
    "osszegzes": "<2-3 mondat>"
  },
  "newLogoAnalysis": {
    "osszpontszam": <0-100>,
    "minosites": "<kategória>",
    "szempontok": {
      "megkulonboztethetoseg": ${criteriaFormat},
      "egyszuruseg": ${criteriaFormat},
      "alkalmazhatosag": ${criteriaFormat},
      "emlekezetesseg": ${criteriaFormat},
      "idotallosasg": ${criteriaFormat},
      "univerzalitas": ${criteriaFormat},
      "lathatosag": ${criteriaFormat}
    },
    "osszegzes": "<2-3 mondat>"
  },
  "comparison": {
    "successRate": <százalékos változás, negatív ha romlott>,
    "criteriaChanges": {
      "megkulonboztethetoseg": ${criteriaChangeFormat},
      "egyszuruseg": ${criteriaChangeFormat},
      "alkalmazhatosag": ${criteriaChangeFormat},
      "emlekezetesseg": ${criteriaChangeFormat},
      "idotallosasg": ${criteriaChangeFormat},
      "univerzalitas": ${criteriaChangeFormat},
      "lathatosag": ${criteriaChangeFormat}
    },
    "improvements": ["<hol és miért lett jobb az új logó - csak ahol NŐTT a pontszám>"],
    "regressions": ["<CSAK olyan kritériumok ahol CSÖKKENT a pontszám - ha nincs ilyen, üres tömb: []>"],
    "recommendations": ["<mit érdemes még finomítani az új logón>"]
  }
}`;
};

export const buildRebrandingUserPrompt = (): string => {
  return `Két logót kapsz: az ELSŐ kép a RÉGI logó, a MÁSODIK kép az ÚJ logó.

Feladatod:
1. Elemezd MINDKÉT logót a Brandguide 100 pontos rendszere szerint
2. Készíts ÖSSZEHASONLÍTÓ elemzést
3. Azonosítsd a javulásokat (ahol NŐTT a pontszám) és visszalépéseket (ahol CSÖKKENT a pontszám)
4. Adj javaslatokat az új logó továbbfejlesztésére

FONTOS:
- Objektíven értékelj! Ha a régi logó jobb bizonyos szempontokból, azt is írd meg.
- A "regressions" listába CSAK akkor írj elemet, ha egy kritériumnál TÉNYLEGESEN CSÖKKENT a pontszám!
- Ha minden kritériumnál javult vagy változatlan a pontszám, a regressions legyen üres tömb: []

Válaszolj az alábbi JSON formátumban:
${getRebrandingResponseFormat()}`;
};
