import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageWithVision, queryBrandguideAI, buildQueryWithVision, LOGO_SCORING_PROMPT, LOGO_SUMMARY_PROMPT, LOGO_COLORS_PROMPT, LOGO_TYPO_PROMPT, LOGO_VISUAL_PROMPT } from '@/lib/brandguide-api';

interface DebugLog {
  timestamp: string;
  step: string;
  type: 'input' | 'output';
  data: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { logo, mediaType } = body as {
    logo: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  };

  if (!logo) {
    return NextResponse.json({ error: 'Logó megadása kötelező' }, { status: 400 });
  }

  const logs: DebugLog[] = [];
  const addLog = (step: string, type: 'input' | 'output', data: string) => {
    logs.push({
      timestamp: new Date().toISOString(),
      step,
      type,
      data,
    });
  };

  try {
    // ========================================
    // STEP 0: Claude Vision
    // ========================================
    addLog('Claude Vision', 'input', `[Image base64 - ${logo.length} karakter]\n\nPROMPT:\n${getVisionPrompt()}`);

    const visionDescription = await analyzeImageWithVision(logo, mediaType);
    addLog('Claude Vision', 'output', visionDescription);

    // Create short version for later calls
    const visionShort = visionDescription.slice(0, 1200);

    // ========================================
    // ROUND 1A: Scoring (7 criteria only)
    // ========================================
    const scoringQuery = buildQueryWithVision(visionDescription, LOGO_SCORING_PROMPT);
    addLog('brandguideAI - Scoring (7 szempont)', 'input', scoringQuery);

    const scoringResponse = await queryBrandguideAI(scoringQuery);
    addLog('brandguideAI - Scoring (7 szempont)', 'output', scoringResponse.answer);

    // ========================================
    // ROUND 1B: Summary (separate call)
    // ========================================
    const summaryQuery = buildQueryWithVision(visionShort, LOGO_SUMMARY_PROMPT);
    addLog('brandguideAI - Summary (összegzés)', 'input', summaryQuery);

    const summaryResponse = await queryBrandguideAI(summaryQuery);
    addLog('brandguideAI - Summary (összegzés)', 'output', summaryResponse.answer);

    // ========================================
    // ROUND 3: Colors (shorter vision)
    // ========================================
    const colorsQuery = buildQueryWithVision(visionShort, LOGO_COLORS_PROMPT);
    addLog('brandguideAI - Colors', 'input', colorsQuery);

    const colorsResponse = await queryBrandguideAI(colorsQuery);
    addLog('brandguideAI - Colors', 'output', colorsResponse.answer);

    // ========================================
    // ROUND 4: Typography (shorter vision)
    // ========================================
    const typoQuery = buildQueryWithVision(visionShort, LOGO_TYPO_PROMPT);
    addLog('brandguideAI - Typography', 'input', typoQuery);

    const typoResponse = await queryBrandguideAI(typoQuery);
    addLog('brandguideAI - Typography', 'output', typoResponse.answer);

    // ========================================
    // ROUND 5: Visual (shorter vision)
    // ========================================
    const visualQuery = buildQueryWithVision(visionShort, LOGO_VISUAL_PROMPT);
    addLog('brandguideAI - Visual', 'input', visualQuery);

    const visualResponse = await queryBrandguideAI(visualQuery);
    addLog('brandguideAI - Visual', 'output', visualResponse.answer);

    return NextResponse.json({ logs });

  } catch (error) {
    addLog('ERROR', 'output', error instanceof Error ? error.message : 'Ismeretlen hiba');
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      logs,
    });
  }
}

// Get Vision prompt for display
function getVisionPrompt(): string {
  return `Készíts részletes technikai leltárt erről a logóról! Légy objektív és precíz.

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
}
