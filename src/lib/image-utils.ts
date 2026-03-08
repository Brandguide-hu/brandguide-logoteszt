import sharp from 'sharp';

const MAX_VISION_DIMENSION = 4096;

/**
 * Resize image for Claude Vision API if needed.
 * Max dimension: 4096px (Claude API limit is 8000px, but it internally resizes to ~1568px anyway).
 * Returns original if already within limits.
 */
export async function resizeImageForVision(
  base64: string,
  mediaType: string
): Promise<{ base64: string; mediaType: string }> {
  const buffer = Buffer.from(base64, 'base64');
  const metadata = await sharp(buffer).metadata();
  const { width, height } = metadata;

  // If both dimensions are within limits, return as-is
  if (width && height && width <= MAX_VISION_DIMENSION && height <= MAX_VISION_DIMENSION) {
    return { base64, mediaType };
  }

  // Resize to fit within MAX_VISION_DIMENSION, convert to PNG (lossless)
  const resized = await sharp(buffer)
    .resize(MAX_VISION_DIMENSION, MAX_VISION_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  console.log(`[IMAGE] Resized from ${width}x${height} → ≤${MAX_VISION_DIMENSION}px (${Math.round(resized.length / 1024)}KB)`);
  return { base64: resized.toString('base64'), mediaType: 'image/png' };
}
