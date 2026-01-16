/**
 * Rebranding API Route - TEMPORARILY DISABLED
 *
 * This route is disabled while the V2 architecture is being implemented.
 * The rebranding test is also disabled on the frontend.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'A rebranding teszt jelenleg nem elérhető. Kérlek próbáld később!',
      code: 'FEATURE_DISABLED'
    },
    { status: 503 }
  );
}
