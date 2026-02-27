import { createClient } from '@supabase/supabase-js';
import { processVisualAnalysis } from './src/lib/analysis/visual-processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function test() {
  const analysisId = '9019a826-2b7f-4833-9903-2ef7131cd1f5'; // Billingo

  const { data, error } = await supabase
    .from('analyses')
    .select('id, logo_name, logo_base64, user_id')
    .eq('id', analysisId)
    .single();

  if (error || !data) {
    console.log('Error fetching analysis:', error?.message);
    return;
  }

  const analysis = data as any;
  console.log('Processing visual analysis for:', analysis.logo_name);
  console.log('Analysis ID:', analysis.id);

  if (!analysis.logo_base64) {
    console.log('No logo base64 data');
    return;
  }

  const imageBuffer = Buffer.from(analysis.logo_base64, 'base64');
  console.log('Image buffer:', imageBuffer.length, 'bytes');

  console.log('\nStarting full visual analysis pipeline...');
  const startTime = Date.now();

  const result = await processVisualAnalysis(
    analysisId,
    analysis.user_id || 'test-user',
    imageBuffer
  );

  console.log('\n✅ Visual analysis completed!');
  console.log('Processing time:', result.processingTimeMs + 'ms');
  console.log('Images generated:', result.imagesGenerated);
  console.log('\nGeometry balance:', JSON.stringify(result.visualAnalysis.geometry.balance));
  console.log('Symmetry H/V:', result.visualAnalysis.geometry.symmetry.horizontal + '% /', result.visualAnalysis.geometry.symmetry.vertical + '%');
  console.log('Complexity:', result.visualAnalysis.geometry.complexity.category);
  console.log('Dominant colors:', result.visualAnalysis.colors.dominant_colors.length);
  console.log('Contrast pairs:', result.visualAnalysis.colors.contrast_matrix.length);
  console.log('\nVisual URL: /dashboard/' + analysisId + '/visual');

  // Verify DB was updated
  const { data: updated } = await supabase
    .from('analyses')
    .select('visual_analysis, visual_analysis_at')
    .eq('id', analysisId)
    .single();

  const updatedAnalysis = updated as any;
  if (updatedAnalysis?.visual_analysis) {
    console.log('\n✅ DB updated successfully!');
    console.log('visual_analysis_at:', updatedAnalysis.visual_analysis_at);
  } else {
    console.log('\n❌ DB was NOT updated');
  }
}

test().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
