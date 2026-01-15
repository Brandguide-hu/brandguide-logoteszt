import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Peti stílus prompt - tárgyilagos, építő mentor
const PETI_STYLE_PROMPT = `Te Peti vagy, egy tapasztalt branding mentor.

PETI STÍLUSA:
- Tárgyilagos és szakszerű, de emberi
- Építő szemléletű: az erősségekre épít, a fejlesztendőket fejlődési lehetőségként fogalmazza meg
- Mentor-szerű: tanácsot ad, nem ítélkezik
- Természetes, közvetlen beszédmód – mint egy kolléga, aki segít

HANGNEM:
- Egyszerű, világos mondatok
- Nincs túlzás egyik irányba sem (se kritikus, se lelkendező)
- Kevés felkiáltójel (szinte semmi)
- Nincs szuperlatívusz ("fantasztikus", "briliáns", "csodálatos")

KERÜLENDŐ SZAVAK:
- Negatív: "gyenge", "rossz", "hibás", "hiányzik", "probléma", "sajnos"
- Túlzó pozitív: "fantasztikus!", "csodálatos!", "briliáns!", "lenyűgöző!"
- Kritikus fordulatok: "De őszintén?", "Ez bizony...", "Azonban..."

ÁTFOGALMAZÁSI MINTÁK:
- "Túl generikus" → "Jó alap, egyedi elemekkel erősíthető"
- "Gyenge kontraszt" → "A kontraszt finomításával javulna"
- "Nem emlékezetes" → "Egy karakteresebb elem segítene"
- "Hiányzik X" → "X hozzáadásával még jobb lenne"

A szakmai tartalom maradjon meg, csak a megfogalmazás legyen építő és mentor-szerű.

VÁLASZOLJ TISZTA JSON FORMÁTUMBAN, UGYANAZZAL A STRUKTÚRÁVAL!`;

interface RephraseRequest {
  osszegzes: string;
  erossegek: string[];
  fejlesztendo: string[];
  szempontok: Record<string, { indoklas: string }>;
  szinek?: {
    harmonia: string;
    pszichologia: string;
    technikai: string;
    javaslatok: string[];
  };
  tipografia?: {
    karakter: string;
    olvashatosag: string;
    illeszkedés: string;
    javaslatok: string[];
  };
  vizualisNyelv?: {
    formak: string;
    arculatiElemek: string;
    stilusEgyseg: string;
    javaslatok: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const body = await request.json() as RephraseRequest;

    // Összeállítjuk az átfogalmazandó szövegeket
    const textsToRephrase = {
      osszegzes: body.osszegzes,
      erossegek: body.erossegek,
      fejlesztendo: body.fejlesztendo,
      szempontIndoklasok: Object.fromEntries(
        Object.entries(body.szempontok || {}).map(([key, value]) => [key, value.indoklas])
      ),
      szinek: body.szinek ? {
        harmonia: body.szinek.harmonia,
        pszichologia: body.szinek.pszichologia,
        technikai: body.szinek.technikai,
        javaslatok: body.szinek.javaslatok,
      } : undefined,
      tipografia: body.tipografia ? {
        karakter: body.tipografia.karakter,
        olvashatosag: body.tipografia.olvashatosag,
        illeszkedés: body.tipografia.illeszkedés,
        javaslatok: body.tipografia.javaslatok,
      } : undefined,
      vizualisNyelv: body.vizualisNyelv ? {
        formak: body.vizualisNyelv.formak,
        arculatiElemek: body.vizualisNyelv.arculatiElemek,
        stilusEgyseg: body.vizualisNyelv.stilusEgyseg,
        javaslatok: body.vizualisNyelv.javaslatok,
      } : undefined,
    };

    console.log('[REPHRASE] Sending to Claude for Peti style rephrasing...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${PETI_STYLE_PROMPT}

EREDETI SZÖVEGEK:
${JSON.stringify(textsToRephrase, null, 2)}

Válaszolj CSAK a JSON objektummal, semmi mással!`,
        },
      ],
    });

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    console.log('[REPHRASE] Claude response received, length:', textContent.text.length);

    // Parse the JSON response
    let rephrasedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rephrasedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[REPHRASE] JSON parse error:', parseError);
      console.error('[REPHRASE] Raw response:', textContent.text.slice(0, 500));
      throw new Error('Failed to parse Claude response as JSON');
    }

    return NextResponse.json({
      success: true,
      rephrased: rephrasedData,
    });

  } catch (error) {
    console.error('[REPHRASE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
