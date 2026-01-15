// brandguideAI Partner API client
import Anthropic from '@anthropic-ai/sdk';

const BRANDGUIDE_ENDPOINT = process.env.BRANDGUIDE_ENDPOINT || 'https://udqiowvplrkdrviahylk.supabase.co/functions/v1/partner-api';
const BRANDGUIDE_API_KEY = process.env.BRANDGUIDE_API_KEY;

// Claude Vision prompt for technical logo inventory
const VISION_INVENTORY_PROMPT = `Készíts részletes technikai leltárt erről a logóról! Légy objektív és precíz.

FONTOS: Ez a leírás egy branding szakértőnek készül, aki NEM látja a képet. Minden vizuális információt részletesen le kell írnod!

STRUKTÚRA (minden pontot részletezz):

1. SZÍNEK
- Felhasznált színek (becsült HEX kódokkal, pl. #FF0000)
- Színek aránya, melyik dominál
- Kontraszt értékelése

2. TIPOGRÁFIA
- Betűtípus stílusa (serif/sans-serif/script/stb.)
- Betűvastagság, nagybetűs-e
- Szöveg tartalma (mit ír ki)
- Betűköz, sorköz ha releváns

3. FORMÁK ÉS GEOMETRIA
- Alapformák (kör, négyzet, absztrakt, stb.)
- Szimmetria vagy aszimmetria
- Vonalvastagság, élek (lekerekített/éles)
- Arányok

4. ELRENDEZÉS
- Elemek pozíciója egymáshoz képest
- Margók, térközök (szűk/bő)
- Hierarchia (mi a domináns elem)

5. TECHNIKAI MEGFIGYELÉSEK
- Pixelesedés vagy elmosódás (ha van)
- Átfedések, túl szoros elemek
- Fehér tér (van-e elég)
- Bármilyen technikai hiba vagy probléma

6. STÍLUS ÉS HANGULAT
- Modern/klasszikus/retro/minimál/stb.
- Célközönség benyomása
- Iparág amit sugall

7. ÖSSZEFOGLALÓ JELLEMZÉS (3-4 összefüggő mondat)
Írj egy rövid, összefüggő leíró szöveget a logó összbenyomásáról! Jellemezd:
- A logó általános stílusát és vizuális karakterét
- Kortárs-e, idejétmúlt, vagy trendkövető a megjelenés?
- Milyen üzenetet, hangulatot közvetít első ránézésre?
- Milyen típusú márkához/vállalkozáshoz illik ez a design?
- Professzionális vagy amatőr benyomást kelt?

Válaszolj CSAK a leírással, semmi mással! Maximum 5000 karakter.`;

// Analyze image with Claude Vision
export async function analyzeImageWithVision(
  imageBase64: string,
  mediaType: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  console.log('[VISION] Analyzing image with Claude Vision...');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: VISION_INVENTORY_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = message.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Vision nem adott szöveges választ');
  }

  console.log('[VISION] Analysis complete, length:', textContent.text.length);
  return textContent.text;
}

export interface BrandguideSource {
  title: string;
  type: 'pdf' | 'video' | 'article';
  page?: number;
  url?: string;
}

export interface BrandguideUsage {
  remaining: number;
  limit: number;
}

export interface BrandguideResponse {
  answer: string;
  sources: BrandguideSource[];
  usage: BrandguideUsage;
}

export interface BrandguideError {
  code: string;
  message: string;
}

export class BrandguideAPIError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BrandguideAPIError';
    this.code = code;
  }
}

// Query brandguideAI with an image
export async function queryBrandguideAIWithImage(
  imageBase64: string,
  mediaType: string,
  query: string
): Promise<BrandguideResponse> {
  if (!BRANDGUIDE_API_KEY) {
    throw new BrandguideAPIError(
      'brandguideAI API kulcs nincs beállítva',
      'MISSING_CONFIG'
    );
  }

  try {
    const response = await fetch(BRANDGUIDE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BRANDGUIDE_API_KEY,
      },
      body: JSON.stringify({
        query,
        image: {
          type: 'base64',
          media_type: mediaType,
          data: imageBase64
        }
      }),
    });

    const data = await response.json();

    console.log('[BRANDGUIDE API] Response status:', response.status);
    console.log('[BRANDGUIDE API] Answer length:', data.answer?.length || 0);
    console.log('[BRANDGUIDE API] Full answer:', data.answer);

    if (!response.ok) {
      const error = data.error as BrandguideError;
      console.log('[BRANDGUIDE API] Error details:', JSON.stringify(error));

      switch (error?.code) {
        case 'QUOTA_EXCEEDED':
          throw new BrandguideAPIError(
            'A havi kvóta elfogyott. Kérjük próbáld újra a következő hónapban.',
            'QUOTA_EXCEEDED'
          );
        case 'INVALID_KEY':
          throw new BrandguideAPIError(
            'Érvénytelen API kulcs.',
            'INVALID_KEY'
          );
        case 'QUERY_TOO_LONG':
          throw new BrandguideAPIError(
            'A kérdés túl hosszú (max 2000 karakter).',
            'QUERY_TOO_LONG'
          );
        case 'MISSING_QUERY':
          throw new BrandguideAPIError(
            'Hiányzó kérdés.',
            'MISSING_QUERY'
          );
        default:
          throw new BrandguideAPIError(
            error?.message || 'brandguideAI hiba',
            error?.code || 'UNKNOWN_ERROR'
          );
      }
    }

    return data as BrandguideResponse;
  } catch (error) {
    if (error instanceof BrandguideAPIError) {
      throw error;
    }

    // Network or other error
    throw new BrandguideAPIError(
      'Nem sikerült kapcsolódni a brandguideAI szerverhez.',
      'CONNECTION_ERROR'
    );
  }
}

// Query brandguideAI with text only (no image) - uses Vision description
export async function queryBrandguideAI(
  query: string
): Promise<BrandguideResponse> {
  if (!BRANDGUIDE_API_KEY) {
    throw new BrandguideAPIError(
      'brandguideAI API kulcs nincs beállítva',
      'MISSING_CONFIG'
    );
  }

  try {
    const response = await fetch(BRANDGUIDE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BRANDGUIDE_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    console.log('[BRANDGUIDE API] Response status:', response.status);
    console.log('[BRANDGUIDE API] Answer length:', data.answer?.length || 0);
    console.log('[BRANDGUIDE API] Full answer:', data.answer);

    if (!response.ok) {
      const error = data.error as BrandguideError;
      console.log('[BRANDGUIDE API] Error details:', JSON.stringify(error));

      switch (error?.code) {
        case 'QUOTA_EXCEEDED':
          throw new BrandguideAPIError(
            'A havi kvóta elfogyott. Kérjük próbáld újra a következő hónapban.',
            'QUOTA_EXCEEDED'
          );
        case 'INVALID_KEY':
          throw new BrandguideAPIError(
            'Érvénytelen API kulcs.',
            'INVALID_KEY'
          );
        case 'QUERY_TOO_LONG':
          throw new BrandguideAPIError(
            'A kérdés túl hosszú (max 5000 karakter).',
            'QUERY_TOO_LONG'
          );
        case 'MISSING_QUERY':
          throw new BrandguideAPIError(
            'Hiányzó kérdés.',
            'MISSING_QUERY'
          );
        default:
          throw new BrandguideAPIError(
            error?.message || 'brandguideAI hiba',
            error?.code || 'UNKNOWN_ERROR'
          );
      }
    }

    return data as BrandguideResponse;
  } catch (error) {
    if (error instanceof BrandguideAPIError) {
      throw error;
    }

    // Network or other error
    throw new BrandguideAPIError(
      'Nem sikerült kapcsolódni a brandguideAI szerverhez.',
      'CONNECTION_ERROR'
    );
  }
}

// Helper to build query with vision description
export function buildQueryWithVision(visionDescription: string, prompt: string): string {
  return `[Logó leírás]
${visionDescription}

[Feladat]
${prompt}`;
}

// PROMPT 1A: Scoring analysis - 7 criteria ONLY (split due to token limit)
export const LOGO_SCORING_PROMPT = `Értékeld a logót a Brandguide 100 pontos rendszerével!

Te egy lelkes, bátorító branding mentor vagy, aki SZERETI a logókat és izgatottan fedezi fel bennük a potenciált!

KOMMUNIKÁCIÓS SZABÁLYOK:
- TILOS használni: "de", "azonban", "viszont", "hiányzik", "nem elég", "gyenge", "rossz", "hiba"
- HELYETTE használd: "és", "emellett", "tovább erősíthető", "még több lehetőség rejlik benne", "érdemes kipróbálni"
- Minden mondatot POZITÍVAN kezdj!
- A fejlesztési javaslatokat LEHETŐSÉGKÉNT fogalmazd meg, ne kritikaként!

PONTOZÁSI ÚTMUTATÓ:

megkulonboztethetoseg (max 20 pont):
- 16-20: Kiemelkedően egyedi, azonnal felismerhető
- 11-15: Jó egyedi elemekkel rendelkezik, tovább erősíthető
- 6-10: Van alapja, de több egyediség adna neki erőt
- 0-5: Jó kiindulópont, de érdemes egyedibb irányba fejleszteni

egyszuruseg (max 18 pont):
- 15-18: Gyönyörűen letisztult, minden elem a helyén
- 10-14: Jó egyensúly, apró finomításokkal még jobb lehet
- 5-9: Van benne potenciál, egyszerűsítéssel erősödne
- 0-4: Bátor koncepció, fókuszálással hatékonyabb lenne

alkalmazhatosag (max 15 pont):
- 13-15: Minden méretben és felületen remekül működik
- 8-12: Jól alkalmazható, kis méretben érdemes tesztelni
- 4-7: Működik, de kis mérethez adaptáció segítene
- 0-3: Erős koncepció, technikai optimalizálás javítana rajta

emlekezetesseg (max 15 pont):
- 13-15: Azonnal bevésődik, erős vizuális identitás
- 8-12: Jól megjegyezhető, van benne erő
- 4-7: Szimpatikus, egy erősebb elem fokozná a hatást
- 0-3: Kellemes alap, karakteresebb elem emelné ki

idotallossag (max 12 pont):
- 10-12: Időtálló klasszikus, évtizedekig aktuális marad
- 6-9: Kiegyensúlyozott, hosszú távon is működik
- 3-5: Kortárs megoldás, érdemes a klasszikus elemeket erősíteni
- 0-2: Divatos és friss, klasszikusabb elemekkel stabilabb lenne

univerzalitas (max 10 pont):
- 8-10: Bárhol a világon azonnal érthető
- 5-7: Széles körben működik, jó alapokkal
- 2-4: Karakteres, célzott használathoz ideális
- 0-1: Speciális célközönségnek szól

lathatosag (max 10 pont):
- 8-10: Kiváló kontraszt, minden környezetben kitűnik
- 5-7: Jól látható, néhány háttéren érdemes tesztelni
- 2-4: Működik, kontraszterősítés segítene
- 0-1: Finom megjelenés, erősebb kontraszt javítana rajta

FONTOS az "i" mezőhöz (MAX 150 karakter):
- Kezdd azzal, ami JÓ!
- Használj lelkes, bátorító hangnemet!
- A javaslatot "érdemes kipróbálni" vagy "még izgalmasabb lenne" formában add!
- NE használj "de", "azonban", "hiányzik" szavakat!

CSAK JSON (7 szempont):
{"megkulonboztethetoseg":{"p":0,"m":20,"i":""},"egyszuruseg":{"p":0,"m":18,"i":""},"alkalmazhatosag":{"p":0,"m":15,"i":""},"emlekezetesseg":{"p":0,"m":15,"i":""},"idotallossag":{"p":0,"m":12,"i":""},"univerzalitas":{"p":0,"m":10,"i":""},"lathatosag":{"p":0,"m":10,"i":""}}`;

// PROMPT 1B: Summary analysis - separate call due to token limit
export const LOGO_SUMMARY_PROMPT = `Az előző értékelés alapján készíts LELKES, BÁTORÍTÓ összefoglalót a logóról!

KOMMUNIKÁCIÓS SZABÁLYOK:
- TILOS: "de", "azonban", "viszont", "hiányzik", "nem elég", "gyenge", "rossz"
- KÖTELEZŐ: pozitív, bátorító, lelkesítő hangnem végig!
- A fejlesztendő pontokat is LEHETŐSÉGKÉNT írd meg (pl. "Még több erőt adna, ha...")

ÖSSZEGZÉS STRUKTÚRA (osszegzes mező, 3 bekezdés):
1. bekezdés - ERŐSSÉGEK: Lelkesen írd le, ami KLASSZ a logóban! Használj pozitív jelzőket! (2-3 mondat)
2. bekezdés - IZGALMAS LEHETŐSÉGEK: Miben rejlik még potenciál? Hogyan válhatna még jobbá? Fogalmazd meg úgy, mintha egy barátodnak adnál ötleteket! (2-3 mondat)
3. bekezdés - ZÁRÓ BÁTORÍTÁS: Foglald össze pozitívan! Bátorítsd a tulajdonost! (1-2 mondat)

ERŐSSÉGEK: 3 lelkes, konkrét pont!
FEJLESZTÉSI LEHETŐSÉGEK: 3 pont, POZITÍVAN megfogalmazva (pl. "Még karakteresebbé válhatna, ha...")

CSAK JSON:
{"osszegzes":"","erossegek":["","",""],"fejlesztendo":["","",""]}`;

// PROMPT 2: Color analysis - lelkes, bátorító stílus
export const LOGO_COLORS_PROMPT = `Elemezd a logó színvilágát LELKESEN és BÁTORÍTÓAN!

TILOS SZAVAK: "de", "azonban", "viszont", "hiányzik", "nem elég", "gyenge", "unalmas", "hideg"
HASZNÁLJ: "klassz", "erős", "remek alap", "érdemes kipróbálni", "még izgalmasabb lenne"

Minden mező MAX 80 KARAKTER, lelkes hangnemben:
- harmonia: Mi a klassz a színekben? + egy ötlet ami még jobbá tenné
- pszichologia: Milyen pozitív üzenetet közvetít? + egy lehetőség az erősítésre
- technikai: Mi működik jól technikailag? + egy tipp a tökéletesítéshez
- javaslatok: 2 LELKESÍTŐ, megvalósítható ötlet (ne kritika, hanem lehetőség!)

JSON:
{"harmonia":"","pszichologia":"","technikai":"","javaslatok":["",""]}`;

// PROMPT 3: Typography analysis - lelkes, bátorító stílus
export const LOGO_TYPO_PROMPT = `Elemezd a logó tipográfiáját LELKESEN és BÁTORÍTÓAN!

TILOS SZAVAK: "de", "azonban", "viszont", "hiányzik", "nem elég", "gyenge", "generikus", "merev"
HASZNÁLJ: "karakteres", "erős", "jó választás", "érdemes kipróbálni", "még egyedibb lenne"

Minden mező MAX 80 KARAKTER, lelkes hangnemben:
- karakter: Mi a jó a betűtípus személyiségében? + egy ötlet a még erősebb karakterhez
- olvashatosag: Mi működik jól? + egy lehetőség a tökéletesítésre
- illeszkedés: Hogyan támogatja a márkát? + egy ötlet az összhang erősítésére
- javaslatok: 2 LELKESÍTŐ, megvalósítható ötlet (ne kritika, hanem inspiráció!)

JSON:
{"karakter":"","olvashatosag":"","illeszkedés":"","javaslatok":["",""]}`;

// PROMPT 4: Visual language analysis - lelkes, bátorító stílus
export const LOGO_VISUAL_PROMPT = `Elemezd a logó vizuális nyelvét LELKESEN és BÁTORÍTÓAN!

TILOS SZAVAK: "de", "azonban", "viszont", "hiányzik", "nem elég", "gyenge", "szétesik", "feszültség"
HASZNÁLJ: "dinamikus", "erős", "jó alap", "érdemes kipróbálni", "még hatásosabb lenne"

Minden mező MAX 80 KARAKTER, lelkes hangnemben:
- formak: Mi a klassz a formákban? + egy ötlet a még kifinomultabb megjelenéshez
- arculatiElemek: Mi az ikon erőssége? + egy lehetőség a továbbfejlesztésre
- stilusEgyseg: Mi működik jól az egységben? + egy tipp a még erősebb összhanghoz
- javaslatok: 2 LELKESÍTŐ, megvalósítható ötlet (inspiráció, ne kritika!)

JSON:
{"formak":"","arculatiElemek":"","stilusEgyseg":"","javaslatok":["",""]}`;
