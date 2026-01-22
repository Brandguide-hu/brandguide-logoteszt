/**
 * brandguideAI Partner API client - V2
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás
 * 2. brandguideAI Hívás 1 - Pontozás + Összefoglaló
 * 3. brandguideAI Hívás 2 - Szöveges elemzések
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildVisionPrompt } from './prompts-v2';

const BRANDGUIDE_ENDPOINT = process.env.BRANDGUIDE_ENDPOINT || 'https://udqiowvplrkdrviahylk.supabase.co/functions/v1/partner-api';
const BRANDGUIDE_API_KEY = process.env.BRANDGUIDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// ============================================================================
// CLAUDE VISION - "Vakvezető Designer"
// ============================================================================

/**
 * Analyze image with Claude Vision using the "Vakvezető Designer" prompt
 */
export async function analyzeImageWithVision(
  imageBase64: string,
  mediaType: string,
  userColors?: string[],
  userFontName?: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY nincs beállítva');
  }

  const anthropic = new Anthropic({ apiKey });
  const visionPrompt = buildVisionPrompt(userColors, userFontName);

  console.log('[VISION] Analyzing image with Claude Vision (Vakvezető Designer)...');
  console.log('[VISION] API Key prefix:', apiKey.substring(0, 10) + '...');
  console.log('[VISION] Using model:', CLAUDE_MODEL);
  if (userColors?.length) console.log('[VISION] User colors:', userColors.join(', '));
  if (userFontName) console.log('[VISION] User font name:', userFontName);

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
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
            text: visionPrompt,
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

// ============================================================================
// BRANDGUIDE AI TYPES
// ============================================================================

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

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  // Claude Vision hibák
  VISION_NO_API_KEY: 'ANTHROPIC_API_KEY nincs beállítva',
  VISION_NO_RESPONSE: 'Claude Vision nem adott választ',
  VISION_INVALID_IMAGE: 'A kép formátuma nem támogatott',

  // brandguideAI hibák
  BRANDGUIDE_NO_API_KEY: 'brandguideAI API kulcs nincs beállítva',
  BRANDGUIDE_QUOTA_EXCEEDED: 'A havi kvóta elfogyott. Kérjük próbáld újra a következő hónapban.',
  BRANDGUIDE_INVALID_KEY: 'Érvénytelen API kulcs',
  BRANDGUIDE_QUERY_TOO_LONG: 'A kérdés túl hosszú (max 5000 karakter)',
  BRANDGUIDE_CONNECTION_ERROR: 'Nem sikerült kapcsolódni a brandguideAI szerverhez',

  // JSON parse hibák
  PARSE_ERROR_SCORING: 'Nem sikerült feldolgozni a pontozás válaszát',
  PARSE_ERROR_DETAILS: 'Nem sikerült feldolgozni a részletes elemzés válaszát',

  // Validálási hibák
  VALIDATION_SCORE_MISMATCH: 'A pontszámok összege nem egyezik',

  // Supabase hibák
  DB_SAVE_ERROR: 'Nem sikerült menteni az elemzést',
};

// ============================================================================
// BRANDGUIDE AI API
// ============================================================================

/**
 * Query brandguideAI with text only (Vision description)
 */
export async function queryBrandguideAI(
  query: string
): Promise<BrandguideResponse> {
  if (!BRANDGUIDE_API_KEY) {
    throw new BrandguideAPIError(
      ERROR_MESSAGES.BRANDGUIDE_NO_API_KEY,
      'MISSING_CONFIG'
    );
  }

  // Log query length (no truncation - limit has been increased)
  console.log('[BRANDGUIDE API] Query length:', query.length, 'characters');

  try {
    console.log('[BRANDGUIDE API] Sending query, length:', query.length);

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

    // Check if response looks truncated
    const answer = data.answer || '';
    const trimmed = answer.trim();
    if (trimmed && !trimmed.endsWith('}') && !trimmed.endsWith('```')) {
      console.warn('[BRANDGUIDE API] WARNING: Response may be truncated! Last 50 chars:', answer.slice(-50));
    }

    if (!response.ok) {
      const error = data.error as BrandguideError;
      console.error('[BRANDGUIDE API] Error:', JSON.stringify(error));

      switch (error?.code) {
        case 'QUOTA_EXCEEDED':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_QUOTA_EXCEEDED, 'QUOTA_EXCEEDED');
        case 'INVALID_KEY':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_INVALID_KEY, 'INVALID_KEY');
        case 'QUERY_TOO_LONG':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_QUERY_TOO_LONG, 'QUERY_TOO_LONG');
        case 'MISSING_QUERY':
          throw new BrandguideAPIError('Hiányzó kérdés.', 'MISSING_QUERY');
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

    console.error('[BRANDGUIDE API] Connection error:', error);
    throw new BrandguideAPIError(
      ERROR_MESSAGES.BRANDGUIDE_CONNECTION_ERROR,
      'CONNECTION_ERROR'
    );
  }
}

// ============================================================================
// JSON PARSING HELPERS
// ============================================================================

/**
 * Try to repair truncated JSON by closing open brackets
 */
function tryRepairJSON(jsonStr: string): string {
  let repaired = jsonStr.trim();

  // Count open brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of repaired) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  // If we're in a string, close it
  if (inString) {
    repaired += '"';
  }

  // Remove trailing incomplete key-value pairs and commas
  // This handles cases like: "key": "truncated value
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
  repaired = repaired.replace(/,\s*$/, '');
  repaired = repaired.replace(/:\s*$/, ': null');

  // Close open brackets
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }

  return repaired;
}

/**
 * Parse JSON from brandguideAI response
 * Handles markdown code blocks, truncated responses, and other formatting
 */
export function parseJSONResponse<T>(response: string, errorMessage: string): T {
  const tryParse = (jsonStr: string): T | null => {
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return null;
    }
  };

  // Try to extract JSON from markdown code blocks (with or without closing ```)
  const jsonMatchClosed = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonMatchOpen = response.match(/```(?:json)?\s*([\s\S]*)/);
  const jsonMatch = jsonMatchClosed || jsonMatchOpen;

  if (jsonMatch) {
    const jsonContent = jsonMatch[1].trim();
    console.log('[PARSE] Found JSON in code block, length:', jsonContent.length);
    const result = tryParse(jsonContent);
    if (result) {
      console.log('[PARSE] Parsed successfully, keys:', Object.keys(result as object));
      return result;
    }

    // Try to repair truncated JSON
    const repaired = tryRepairJSON(jsonContent);
    const repairedResult = tryParse(repaired);
    if (repairedResult) {
      console.log('[PARSE] Successfully repaired truncated JSON from code block');
      console.log('[PARSE] Repaired keys:', Object.keys(repairedResult as object));
      return repairedResult;
    }
  }

  // Try to find raw JSON object
  const rawJsonMatch = response.match(/\{[\s\S]*\}?/);
  if (rawJsonMatch) {
    const result = tryParse(rawJsonMatch[0]);
    if (result) return result;

    // Try to repair truncated JSON
    const repaired = tryRepairJSON(rawJsonMatch[0]);
    const repairedResult = tryParse(repaired);
    if (repairedResult) {
      console.log('[PARSE] Successfully repaired truncated JSON');
      return repairedResult;
    }
  }

  // Try direct parse
  const directResult = tryParse(response);
  if (directResult) return directResult;

  // Try to repair direct response
  const repaired = tryRepairJSON(response);
  const repairedResult = tryParse(repaired);
  if (repairedResult) {
    console.log('[PARSE] Successfully repaired truncated response');
    return repairedResult;
  }

  console.error('[PARSE] JSON parse error - could not parse or repair');
  console.error('[PARSE] Raw response (first 500 chars):', response.slice(0, 500));
  console.error('[PARSE] Raw response (last 200 chars):', response.slice(-200));
  throw new Error(errorMessage);
}
