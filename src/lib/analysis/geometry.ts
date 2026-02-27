import sharp from 'sharp';
import type { GeometryBalance, GeometrySymmetry, GeometryComplexity } from '@/types';

/**
 * Analyze visual balance by comparing center of mass vs geometric center
 */
export async function analyzeBalance(imageBuffer: Buffer): Promise<GeometryBalance> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const alpha = data[idx + 3] / 255;
      // Weight by darkness * alpha (darker = heavier visual weight)
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const weight = (1 - luminance) * alpha;

      totalWeight += weight;
      weightedX += x * weight;
      weightedY += y * weight;
    }
  }

  const centerOfMass = totalWeight > 0
    ? { x: weightedX / totalWeight, y: weightedY / totalWeight }
    : { x: width / 2, y: height / 2 };

  const geometricCenter = { x: width / 2, y: height / 2 };

  const deviationX = (centerOfMass.x - geometricCenter.x) / width;
  const deviationY = (centerOfMass.y - geometricCenter.y) / height;
  const deviationPercent = Math.sqrt(deviationX ** 2 + deviationY ** 2) * 100;

  let direction = 'centered';
  if (deviationPercent > 2) {
    const parts: string[] = [];
    if (deviationY < -0.02) parts.push('top');
    if (deviationY > 0.02) parts.push('bottom');
    if (deviationX < -0.02) parts.push('left');
    if (deviationX > 0.02) parts.push('right');
    direction = parts.join('-') || 'centered';
  }

  return {
    center_of_mass: {
      x: Math.round((centerOfMass.x / width) * 100) / 100,
      y: Math.round((centerOfMass.y / height) * 100) / 100,
    },
    geometric_center: { x: 0.5, y: 0.5 },
    deviation_percent: Math.round(deviationPercent * 10) / 10,
    direction,
  };
}

/**
 * Analyze symmetry by comparing the image with its horizontal/vertical flip
 */
export async function analyzeSymmetry(
  imageBuffer: Buffer
): Promise<{ symmetry: Omit<GeometrySymmetry, 'heatmap_h_path' | 'heatmap_v_path'>; heatmapH: Buffer; heatmapV: Buffer }> {
  const size = 256;

  const normalized = await sharp(imageBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .greyscale()
    .raw()
    .toBuffer();

  // Horizontal symmetry (flip left-right)
  const flippedH = await sharp(imageBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .flop()
    .greyscale()
    .raw()
    .toBuffer();

  // Vertical symmetry (flip top-bottom)
  const flippedV = await sharp(imageBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .flip()
    .greyscale()
    .raw()
    .toBuffer();

  let diffSumH = 0;
  let diffSumV = 0;
  const heatmapDataH = Buffer.alloc(size * size * 3);
  const heatmapDataV = Buffer.alloc(size * size * 3);

  for (let i = 0; i < size * size; i++) {
    const diffH = Math.abs(normalized[i] - flippedH[i]);
    const diffV = Math.abs(normalized[i] - flippedV[i]);

    diffSumH += diffH;
    diffSumV += diffV;

    // Heatmap: green = similar, red = different
    const hIdx = i * 3;
    heatmapDataH[hIdx] = Math.min(255, diffH * 3);     // R
    heatmapDataH[hIdx + 1] = Math.max(0, 255 - diffH * 3); // G
    heatmapDataH[hIdx + 2] = 0;                         // B

    heatmapDataV[hIdx] = Math.min(255, diffV * 3);
    heatmapDataV[hIdx + 1] = Math.max(0, 255 - diffV * 3);
    heatmapDataV[hIdx + 2] = 0;
  }

  const maxDiff = size * size * 255;
  const horizontalScore = Math.round((1 - diffSumH / maxDiff) * 100);
  const verticalScore = Math.round((1 - diffSumV / maxDiff) * 100);

  const heatmapH = await sharp(heatmapDataH, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 80 })
    .toBuffer();

  const heatmapV = await sharp(heatmapDataV, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    symmetry: { horizontal: horizontalScore, vertical: verticalScore },
    heatmapH,
    heatmapV,
  };
}

/**
 * Analyze complexity using entropy and edge density
 */
export async function analyzeComplexity(imageBuffer: Buffer): Promise<GeometryComplexity> {
  const size = 256;

  const greyData = await sharp(imageBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .greyscale()
    .raw()
    .toBuffer();

  // Shannon entropy
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < greyData.length; i++) {
    histogram[greyData[i]]++;
  }
  const totalPixels = greyData.length;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > 0) {
      const p = histogram[i] / totalPixels;
      entropy -= p * Math.log2(p);
    }
  }

  // Edge density using simple Sobel-like gradient
  let edgeCount = 0;
  const threshold = 30;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const gx = Math.abs(greyData[idx + 1] - greyData[idx - 1]);
      const gy = Math.abs(greyData[idx + size] - greyData[idx - size]);
      const gradient = Math.sqrt(gx * gx + gy * gy);
      if (gradient > threshold) edgeCount++;
    }
  }
  const edgeDensity = edgeCount / ((size - 2) * (size - 2));

  // Categorize
  let category: 'simple' | 'moderate' | 'complex';
  const complexityScore = entropy * 0.6 + edgeDensity * 100 * 0.4;
  if (complexityScore < 3) category = 'simple';
  else if (complexityScore < 5.5) category = 'moderate';
  else category = 'complex';

  return {
    entropy: Math.round(entropy * 100) / 100,
    edge_density: Math.round(edgeDensity * 1000) / 1000,
    category,
  };
}

/**
 * Generate silhouette (black on white) version of the logo
 */
export async function generateSilhouette(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .threshold(128)
    .negate()
    .webp({ quality: 80 })
    .toBuffer();
}
