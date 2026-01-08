'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { DropZone, ColorPicker, LevelSelector } from '@/components/upload';
import { TestLevel } from '@/types';
import { fileToBase64, getMediaType } from '@/lib/utils';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function TestPage() {
  const router = useRouter();
  const [testLevel, setTestLevel] = useState<TestLevel>('detailed');
  const [logo, setLogo] = useState<File | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!logo) {
      setError('Kérlek töltsd fel a logódat!');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const base64 = await fileToBase64(logo);
      const mediaType = getMediaType(logo);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logo: base64,
          mediaType,
          testLevel,
          colors: testLevel !== 'basic' ? colors : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba történt az elemzés során');
      }

      const data = await response.json();
      router.push(`/eredmeny/${data.id}`);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary py-8 md:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Logó elemzés
          </h1>
          <p className="text-text-secondary">
            Töltsd fel a logódat és kapj szakmai értékelést
          </p>
        </div>

        <div className="space-y-6">
          {/* Test Level Selection */}
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                1. Válaszd ki a teszt szintjét
              </h2>
              <LevelSelector selected={testLevel} onChange={setTestLevel} />
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                2. Töltsd fel a logódat
              </h2>
              <DropZone file={logo} onFileSelect={setLogo} />
            </CardContent>
          </Card>

          {/* Color Picker - only for detailed test */}
          {testLevel !== 'basic' && (
            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  3. Színpaletta (opcionális)
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  Add meg a brand színeidet a részletesebb elemzéshez
                </p>
                <ColorPicker colors={colors} onChange={setColors} />
              </CardContent>
            </Card>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!logo || isSubmitting}
              isLoading={isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Elemzés folyamatban...
                </>
              ) : (
                <>
                  Elemzés indítása
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Info box */}
          <div className="bg-highlight-yellow border-l-4 border-accent-yellow p-4 rounded-r-lg">
            <p className="text-sm text-text-primary">
              <strong>Tipp:</strong> A legjobb eredményhez használj jó minőségű,
              átlátszó hátterű (PNG) logót. Az elemzés a Claude AI segítségével
              készül, és körülbelül 30 másodpercet vesz igénybe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
