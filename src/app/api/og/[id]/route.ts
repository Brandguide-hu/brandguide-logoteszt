import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// OG image endpoint: visszaadja a logó képét base64-ből PNG-ként
// A social share preview-hoz (1200x630 körül nem tudunk Vercel Edge-en kép nélkül dolgozni,
// ezért a logó képet adjuk vissza közvetlenül, ami megfelelő lesz OG imagenek)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new NextResponse('Not configured', { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase
      .from('analyses')
      .select('logo_base64, logo_thumbnail_path, logo_original_path')
      .eq('id', id)
      .single();

    if (!data) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Ha van base64, azt adjuk vissza PNG-ként
    if (data.logo_base64) {
      const buffer = Buffer.from(data.logo_base64, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    // Fallback: Supabase storage URL redirect
    const logoPath = data.logo_thumbnail_path || data.logo_original_path;
    if (logoPath) {
      const storageUrl = `${supabaseUrl}/storage/v1/object/public/logos/${logoPath}`;
      return NextResponse.redirect(storageUrl);
    }

    return new NextResponse('No image', { status: 404 });
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}
