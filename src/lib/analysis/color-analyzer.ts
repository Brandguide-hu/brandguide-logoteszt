import sharp from 'sharp';
import chroma from 'chroma-js';
import type { DominantColor, ContrastPair } from '@/types';

/**
 * Extract dominant colors from the image using k-means-like quantization via sharp
 */
export async function extractDominantColors(imageBuffer: Buffer): Promise<DominantColor[]> {
  const size = 128;
  const { data, info } = await sharp(imageBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { channels } = info;

  // Collect non-transparent pixels
  const pixels: Array<[number, number, number]> = [];
  for (let i = 0; i < data.length; i += channels) {
    const alpha = data[i + 3];
    if (alpha > 128) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
  }

  if (pixels.length === 0) {
    return [{ hex: '#ffffff', percentage: 100, rgb: { r: 255, g: 255, b: 255 }, hsl: { h: 0, s: 0, l: 100 } }];
  }

  // Simple color quantization: bucket colors into 16x16x16 grid
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (const [r, g, b] of pixels) {
    const key = `${Math.floor(r / 16)}-${Math.floor(g / 16)}-${Math.floor(b / 16)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Sort by count, take top colors
  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalPixels = pixels.length;

  // Merge similar colors
  const merged: Array<{ r: number; g: number; b: number; count: number }> = [];
  for (const bucket of sorted) {
    const avgR = Math.round(bucket.r / bucket.count);
    const avgG = Math.round(bucket.g / bucket.count);
    const avgB = Math.round(bucket.b / bucket.count);

    const similar = merged.find(m => {
      const dr = Math.abs(m.r - avgR);
      const dg = Math.abs(m.g - avgG);
      const db = Math.abs(m.b - avgB);
      return dr + dg + db < 60;
    });

    if (similar) {
      const total = similar.count + bucket.count;
      similar.r = Math.round((similar.r * similar.count + avgR * bucket.count) / total);
      similar.g = Math.round((similar.g * similar.count + avgG * bucket.count) / total);
      similar.b = Math.round((similar.b * similar.count + avgB * bucket.count) / total);
      similar.count = total;
    } else {
      merged.push({ r: avgR, g: avgG, b: avgB, count: bucket.count });
    }
  }

  return merged
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(c => {
      const color = chroma(c.r, c.g, c.b);
      const [h, s, l] = color.hsl();
      return {
        hex: color.hex(),
        percentage: Math.round((c.count / totalPixels) * 1000) / 10,
        rgb: { r: c.r, g: c.g, b: c.b },
        hsl: {
          h: Math.round(isNaN(h) ? 0 : h),
          s: Math.round(s * 100),
          l: Math.round(l * 100),
        },
      };
    });
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = chroma(hex1).luminance();
  const lum2 = chroma(hex2).luminance();
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Generate WCAG contrast matrix between dominant colors + white/black
 */
export function generateContrastMatrix(dominantColors: DominantColor[]): ContrastPair[] {
  const testColors = [
    ...dominantColors.map(c => c.hex),
    '#ffffff',
    '#000000',
  ];

  // Remove duplicates
  const unique = [...new Set(testColors)];
  const pairs: ContrastPair[] = [];

  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const ratio = getContrastRatio(unique[i], unique[j]);
      pairs.push({
        foreground: unique[i],
        background: unique[j],
        ratio,
        wcag_aa: ratio >= 4.5,
        wcag_aa_large: ratio >= 3,
      });
    }
  }

  return pairs;
}

/**
 * Simulate colorblindness by applying transformation matrices
 */
export async function simulateColorblindness(
  imageBuffer: Buffer,
  type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
): Promise<Buffer> {
  const size = 512;
  const { data, info } = await sharp(imageBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { channels } = info;
  const output = Buffer.alloc(data.length);

  // Color blindness simulation matrices (Brettel et al.)
  const matrices: Record<string, number[][]> = {
    protanopia: [
      [0.567, 0.433, 0.0],
      [0.558, 0.442, 0.0],
      [0.0, 0.242, 0.758],
    ],
    deuteranopia: [
      [0.625, 0.375, 0.0],
      [0.7, 0.3, 0.0],
      [0.0, 0.3, 0.7],
    ],
    tritanopia: [
      [0.95, 0.05, 0.0],
      [0.0, 0.433, 0.567],
      [0.0, 0.475, 0.525],
    ],
    achromatopsia: [
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
    ],
  };

  const matrix = matrices[type];

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    output[i] = Math.min(255, Math.round(matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b));
    output[i + 1] = Math.min(255, Math.round(matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b));
    output[i + 2] = Math.min(255, Math.round(matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b));

    if (channels === 4) {
      output[i + 3] = data[i + 3];
    }
  }

  return sharp(output, { raw: { width: size, height: size, channels } })
    .webp({ quality: 80 })
    .toBuffer();
}
