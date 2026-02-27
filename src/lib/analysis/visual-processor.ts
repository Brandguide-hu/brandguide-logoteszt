import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { analyzeBalance, analyzeSymmetry, analyzeComplexity, generateSilhouette } from './geometry';
import { extractDominantColors, generateContrastMatrix, simulateColorblindness } from './color-analyzer';
import type { VisualAnalysis } from '@/types';

interface ProcessResult {
  visualAnalysis: VisualAnalysis;
  processingTimeMs: number;
  imagesGenerated: number;
}

/**
 * Main visual processor: runs all analyses and uploads results to Supabase Storage
 */
export async function processVisualAnalysis(
  analysisId: string,
  userId: string,
  imageBuffer: Buffer
): Promise<ProcessResult> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const storagePath = `${userId}/${analysisId}`;
  let imagesGenerated = 0;

  // Run geometry and color analyses in parallel
  const [balance, symmetryResult, complexity, silhouetteBuffer, dominantColors] = await Promise.all([
    analyzeBalance(imageBuffer),
    analyzeSymmetry(imageBuffer),
    analyzeComplexity(imageBuffer),
    generateSilhouette(imageBuffer),
    extractDominantColors(imageBuffer),
  ]);

  // Run colorblind simulations in parallel
  const [protanopia, deuteranopia, tritanopia, achromatopsia] = await Promise.all([
    simulateColorblindness(imageBuffer, 'protanopia'),
    simulateColorblindness(imageBuffer, 'deuteranopia'),
    simulateColorblindness(imageBuffer, 'tritanopia'),
    simulateColorblindness(imageBuffer, 'achromatopsia'),
  ]);

  // Upload all generated images to Supabase Storage in parallel
  const uploads = [
    { path: `${storagePath}/silhouette.webp`, buffer: silhouetteBuffer },
    { path: `${storagePath}/symmetry_h.webp`, buffer: symmetryResult.heatmapH },
    { path: `${storagePath}/symmetry_v.webp`, buffer: symmetryResult.heatmapV },
    { path: `${storagePath}/colorblind_protanopia.webp`, buffer: protanopia },
    { path: `${storagePath}/colorblind_deuteranopia.webp`, buffer: deuteranopia },
    { path: `${storagePath}/colorblind_tritanopia.webp`, buffer: tritanopia },
    { path: `${storagePath}/colorblind_achromatopsia.webp`, buffer: achromatopsia },
  ];

  await Promise.all(
    uploads.map(async ({ path, buffer }) => {
      const { error } = await supabase.storage
        .from('visual-analysis')
        .upload(path, buffer, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (error) {
        console.error(`[visual-processor] Upload error for ${path}:`, error.message);
        throw new Error(`Failed to upload ${path}: ${error.message}`);
      }
      imagesGenerated++;
    })
  );

  // Build the contrast matrix
  const contrastMatrix = generateContrastMatrix(dominantColors);

  // Get public URLs
  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('visual-analysis').getPublicUrl(path);
    return data.publicUrl;
  };

  const visualAnalysis: VisualAnalysis = {
    geometry: {
      balance,
      symmetry: {
        ...symmetryResult.symmetry,
        heatmap_h_path: getPublicUrl(`${storagePath}/symmetry_h.webp`),
        heatmap_v_path: getPublicUrl(`${storagePath}/symmetry_v.webp`),
      },
      complexity,
      silhouette: {
        silhouette_path: getPublicUrl(`${storagePath}/silhouette.webp`),
      },
    },
    colors: {
      dominant_colors: dominantColors,
      contrast_matrix: contrastMatrix,
      colorblind_paths: {
        protanopia: getPublicUrl(`${storagePath}/colorblind_protanopia.webp`),
        deuteranopia: getPublicUrl(`${storagePath}/colorblind_deuteranopia.webp`),
        tritanopia: getPublicUrl(`${storagePath}/colorblind_tritanopia.webp`),
        achromatopsia: getPublicUrl(`${storagePath}/colorblind_achromatopsia.webp`),
      },
    },
  };

  // Save to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase
    .from('analyses') as any)
    .update({
      visual_analysis: visualAnalysis,
      visual_analysis_at: new Date().toISOString(),
    })
    .eq('id', analysisId);

  if (updateError) {
    throw new Error(`Failed to save visual analysis: ${updateError.message}`);
  }

  return {
    visualAnalysis,
    processingTimeMs: Date.now() - startTime,
    imagesGenerated,
  };
}
