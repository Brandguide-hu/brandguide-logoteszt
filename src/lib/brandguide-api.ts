/**
 * brandguideAI KB-Extract API client
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás
 * 2. kb-extract API - Egyetlen hívás structured output-tal (scoring + summary + details)
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildVisionPrompt } from './prompts-v2';

const BRANDGUIDE_ENDPOINT = process.env.BRANDGUIDE_ENDPOINT || 'https://udqiowvplrkdrviahylk.supabase.co/functions/v1/kb-extract';
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
  const apiKey = process.env.CLAUDE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_VISION_API_KEY nincs beállítva');
  }

  const anthropic = new Anthropic({ apiKey });
  const visionPrompt = buildVisionPrompt(userColors, userFontName);

  console.log('[VISION] Analyzing image with Claude Vision (Vakvezető Designer)...');
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
// KB-EXTRACT API TYPES
// ============================================================================

export interface KBExtractSource {
  source_id: string;
  title: string;
  type: 'pdf' | 'video' | 'article';
  page?: number;
  snippet?: string;
}

export interface KBExtractUsage {
  remaining: number;
  limit: number;
}

export interface KBExtractMeta {
  mode: 'strict' | 'best_effort';
  validation: {
    passed: boolean;
    errors: string[];
  };
  language: 'hu' | 'en';
  tokens_used: number;
  trace_id: string;
}

export interface KBExtractResponse<T> {
  data: T;
  meta: KBExtractMeta;
  sources: KBExtractSource[];
  usage: KBExtractUsage;
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
  VISION_NO_API_KEY: 'CLAUDE_VISION_API_KEY nincs beállítva',
  VISION_NO_RESPONSE: 'Claude Vision nem adott választ',
  VISION_INVALID_IMAGE: 'A kép formátuma nem támogatott',

  // KB-Extract API hibák
  BRANDGUIDE_NO_API_KEY: 'brandguideAI API kulcs nincs beállítva',
  BRANDGUIDE_QUOTA_EXCEEDED: 'A havi kvóta elfogyott. Kérjük próbáld újra a következő hónapban.',
  BRANDGUIDE_INVALID_KEY: 'Érvénytelen API kulcs',
  BRANDGUIDE_INVALID_SCHEMA: 'Érvénytelen schema',
  BRANDGUIDE_CANNOT_SATISFY: 'Az API nem tudta a kért struktúrában visszaadni az adatot',
  BRANDGUIDE_CONNECTION_ERROR: 'Nem sikerült kapcsolódni a brandguideAI szerverhez',

  // Validálási hibák
  VALIDATION_SCORE_MISMATCH: 'A pontszámok összege nem egyezik',

  // Supabase hibák
  DB_SAVE_ERROR: 'Nem sikerült menteni az elemzést',
};

// ============================================================================
// KB-EXTRACT API
// ============================================================================

/**
 * Query kb-extract API with structured output schema
 */
export async function queryKBExtract<T>(
  query: string,
  imageDescription: string,
  schema: object,
  mode: 'strict' | 'best_effort' = 'strict',
  options?: { max_sources?: number; language?: 'hu' | 'en' }
): Promise<KBExtractResponse<T>> {
  if (!BRANDGUIDE_API_KEY) {
    throw new BrandguideAPIError(
      ERROR_MESSAGES.BRANDGUIDE_NO_API_KEY,
      'MISSING_CONFIG'
    );
  }

  console.log('[KB-EXTRACT] Sending query, length:', query.length);
  console.log('[KB-EXTRACT] Image description length:', imageDescription.length);
  console.log('[KB-EXTRACT] Mode:', mode);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout (Netlify has 60s limit)

    const response = await fetch(BRANDGUIDE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BRANDGUIDE_API_KEY,
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        query,
        image_description: imageDescription,
        output: {
          schema,
          mode,
        },
        options: {
          max_sources: options?.max_sources ?? 5,
          language: options?.language ?? 'hu',
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    console.log('[KB-EXTRACT] Response status:', response.status);

    if (!response.ok) {
      const error = responseData.error as { code?: string; message?: string };
      console.error('[KB-EXTRACT] Error:', JSON.stringify(error));

      switch (error?.code) {
        case 'QUOTA_EXCEEDED':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_QUOTA_EXCEEDED, 'QUOTA_EXCEEDED');
        case 'INVALID_KEY':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_INVALID_KEY, 'INVALID_KEY');
        case 'INVALID_SCHEMA':
        case 'MISSING_SCHEMA':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_INVALID_SCHEMA, 'INVALID_SCHEMA');
        case 'CANNOT_SATISFY_SCHEMA':
          throw new BrandguideAPIError(ERROR_MESSAGES.BRANDGUIDE_CANNOT_SATISFY, 'CANNOT_SATISFY_SCHEMA');
        default:
          throw new BrandguideAPIError(
            error?.message || 'brandguideAI hiba',
            error?.code || 'UNKNOWN_ERROR'
          );
      }
    }

    const result = responseData as KBExtractResponse<T>;

    console.log('[KB-EXTRACT] Tokens used:', result.meta?.tokens_used);
    console.log('[KB-EXTRACT] Validation passed:', result.meta?.validation?.passed);
    console.log('[KB-EXTRACT] Sources count:', result.sources?.length);
    console.log('[KB-EXTRACT] Usage remaining:', result.usage?.remaining, '/', result.usage?.limit);

    if (result.meta?.validation && !result.meta.validation.passed) {
      console.warn('[KB-EXTRACT] Validation errors:', result.meta.validation.errors);
    }

    return result;
  } catch (error) {
    if (error instanceof BrandguideAPIError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[KB-EXTRACT] Request timed out after 55s');
      throw new BrandguideAPIError(
        'A kb-extract API nem válaszolt időben (55s timeout). Kérlek próbáld újra.',
        'TIMEOUT'
      );
    }

    console.error('[KB-EXTRACT] Connection error:', error);
    throw new BrandguideAPIError(
      ERROR_MESSAGES.BRANDGUIDE_CONNECTION_ERROR,
      'CONNECTION_ERROR'
    );
  }
}
