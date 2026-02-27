import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { title: 'LogoLab - Elemzés eredménye' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase
      .from('analyses')
      .select('logo_name, creator_name, result, logo_base64')
      .eq('id', id)
      .single();

    if (!data) return { title: 'LogoLab - Elemzés eredménye' };

    const logoName = data.logo_name || 'Névtelen logó';
    const score = (data.result as { osszpontszam?: number } | null)?.osszpontszam;
    const title = score
      ? `${logoName} – ${score}/100 pont | LogoLab`
      : `${logoName} | LogoLab`;

    const description = score
      ? `${logoName} ${score}/100 pontot kapott a LogoLab brandguide SCORE elemzésen. Teszteld a saját logódat is!`
      : `Nézd meg ${logoName} logó elemzési eredményét a LogoLab-on!`;

    // OG image: ha van logo_base64, adjuk át az /api/og/[id] endpointnak
    const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu'}/api/og/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${logoName} LogoLab elemzés`,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: 'LogoLab - Elemzés eredménye' };
  }
}

export default function EredmenyLayout({ children }: Props) {
  return <>{children}</>;
}
