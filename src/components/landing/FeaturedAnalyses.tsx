import { createClient } from '@supabase/supabase-js';
import { FeaturedAnalysesClient } from './FeaturedAnalysesClient';

interface FeaturedAnalysis {
    id: string;
    logo_name: string;
    logo_url: string;
    total_score: number;
    category: string;
    creator_name: string | null;
}

async function fetchFeaturedAnalyses(): Promise<FeaturedAnalysis[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return [];

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: featured, error: featuredError } = await supabase
        .from('featured_analyses')
        .select('analysis_id, display_order')
        .gte('display_order', 0)
        .lte('display_order', 99)
        .order('display_order', { ascending: true });

    if (featuredError || !featured || featured.length === 0) return [];

    const analysisIds = featured.map((f: { analysis_id: string }) => f.analysis_id);

    const { data: analyses, error: analysesError } = await supabase
        .from('analyses')
        .select('id, logo_name, logo_thumbnail_path, logo_original_path, logo_base64, category, result, creator_name')
        .in('id', analysisIds);

    if (analysesError || !analyses) return [];

    return featured
        .map((f: { analysis_id: string }) => {
            const analysis = analyses.find((a: { id: string }) => a.id === f.analysis_id);
            if (!analysis) return null;

            const result = analysis.result as Record<string, unknown> | null;
            const totalScore = (result?.osszpiontszam ?? result?.osszpontszam ?? 0) as number;

            let logoUrl = '';
            if (analysis.logo_base64) {
                logoUrl = `data:image/png;base64,${analysis.logo_base64}`;
            } else {
                const logoPath = analysis.logo_thumbnail_path || analysis.logo_original_path;
                if (logoPath) {
                    logoUrl = `${supabaseUrl}/storage/v1/object/public/logos/${logoPath}`;
                }
            }

            return {
                id: analysis.id,
                logo_name: analysis.logo_name || 'Névtelen logó',
                logo_url: logoUrl,
                total_score: totalScore,
                category: analysis.category || 'other',
                creator_name: analysis.creator_name || null,
            };
        })
        .filter((a): a is FeaturedAnalysis => a !== null)
        .slice(0, 3);
}

export async function FeaturedAnalyses() {
    const analyses = await fetchFeaturedAnalyses();

    if (analyses.length === 0) return null;

    return <FeaturedAnalysesClient analyses={analyses} />;
}
