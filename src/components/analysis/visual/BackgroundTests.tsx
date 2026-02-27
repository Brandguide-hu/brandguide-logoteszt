'use client';

import { useEffect, useState, useRef } from 'react';
import type { DominantColor } from '@/types';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { TOOLTIPS } from '@/lib/constants/tooltips';

interface BackgroundTestsProps {
  logoUrl: string;
  dominantColors: DominantColor[];
}

const BACKGROUNDS = [
  { label: 'Fehér', color: '#ffffff', textColor: 'text-gray-500' },
  { label: 'Fekete', color: '#000000', textColor: 'text-gray-400' },
  { label: 'Szürke', color: '#f3f4f6', textColor: 'text-gray-500' },
  { label: 'Sötét szürke', color: '#374151', textColor: 'text-gray-400' },
  { label: 'Krém', color: '#fef3c7', textColor: 'text-gray-500' },
];

/** WCAG relative luminance from hex color */
function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two hex colors */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 10) / 10;
}

/**
 * Remove near-white background from a logo image using canvas.
 * Returns a transparent-background data URL.
 */
function useTransparentLogo(logoUrl: string): string | null {
  const [transparentUrl, setTransparentUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!logoUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Detect background color from corners (sample 5x5 from each corner)
      const sampleSize = 5;
      const corners = [
        { x: 0, y: 0 },                                    // top-left
        { x: canvas.width - sampleSize, y: 0 },            // top-right
        { x: 0, y: canvas.height - sampleSize },           // bottom-left
        { x: canvas.width - sampleSize, y: canvas.height - sampleSize }, // bottom-right
      ];

      let bgR = 0, bgG = 0, bgB = 0;
      let sampleCount = 0;

      for (const corner of corners) {
        for (let dy = 0; dy < sampleSize; dy++) {
          for (let dx = 0; dx < sampleSize; dx++) {
            const px = corner.x + dx;
            const py = corner.y + dy;
            if (px >= canvas.width || py >= canvas.height) continue;
            const idx = (py * canvas.width + px) * 4;
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            sampleCount++;
          }
        }
      }

      bgR = Math.round(bgR / sampleCount);
      bgG = Math.round(bgG / sampleCount);
      bgB = Math.round(bgB / sampleCount);

      // Only remove background if it's near-white or near a single color
      const isLightBg = bgR > 200 && bgG > 200 && bgB > 200;

      if (isLightBg) {
        // Threshold: how close a pixel must be to the bg color to be made transparent
        const threshold = 40;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const dist = Math.sqrt(
            (r - bgR) ** 2 +
            (g - bgG) ** 2 +
            (b - bgB) ** 2
          );

          if (dist < threshold) {
            // Make fully transparent
            data[i + 3] = 0;
          } else if (dist < threshold * 1.5) {
            // Soft edge: partial transparency for anti-aliasing
            const alpha = Math.round(((dist - threshold) / (threshold * 0.5)) * 255);
            data[i + 3] = Math.min(data[i + 3], alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }

      setTransparentUrl(canvas.toDataURL('image/png'));
    };

    img.src = logoUrl;
  }, [logoUrl]);

  return transparentUrl;
}

export function BackgroundTests({ logoUrl, dominantColors }: BackgroundTestsProps) {
  const transparentLogoUrl = useTransparentLogo(logoUrl);

  // Primary foreground color = dominant color with highest percentage (skip near-white/near-black)
  const fgColor = dominantColors.find(c => c.hsl.l > 10 && c.hsl.l < 90)?.hex
    || dominantColors[0]?.hex
    || '#000000';

  // Add dominant colors as backgrounds too
  const allBackgrounds = [
    ...BACKGROUNDS,
    ...dominantColors.slice(0, 2).map(c => ({
      label: c.hex,
      color: c.hex,
      textColor: c.hsl.l > 50 ? 'text-gray-600' : 'text-gray-300',
    })),
  ];

  const displayUrl = transparentLogoUrl || logoUrl;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">Háttér tesztek<InfoTooltip text={TOOLTIPS.color.backgrounds} /></h3>

      <div className="grid grid-cols-2 gap-2">
        {allBackgrounds.slice(0, 6).map((bg, idx) => {
          const ratio = getContrastRatio(fgColor, bg.color);
          const passes = ratio >= 3;
          return (
            <div key={idx} className="space-y-1">
              <div
                className="relative aspect-square rounded-lg overflow-hidden flex items-center justify-center p-3 border border-gray-200"
                style={{ backgroundColor: bg.color }}
              >
                <img
                  src={displayUrl}
                  alt={`Logó ${bg.label} háttéren`}
                  className="max-w-full max-h-full object-contain"
                />
                {/* Contrast badge */}
                <div
                  className={`absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                    passes
                      ? 'bg-emerald-100/90 text-emerald-700'
                      : 'bg-red-100/90 text-red-600'
                  }`}
                >
                  {passes ? '✓' : '✗'}
                  <span className="font-mono">{ratio}:1</span>
                </div>
              </div>
              <p className={`text-[10px] text-center ${bg.textColor}`}>
                {bg.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
