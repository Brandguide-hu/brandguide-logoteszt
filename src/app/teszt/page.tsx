'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { DropZone, ColorPicker, LevelSelector, StreamingLoader } from '@/components/upload';
import { TestLevel } from '@/types';
import { fileToBase64, getMediaType } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

type Phase = 'start' | 'analyzing' | 'processing' | 'saving' | 'complete';

export default function TestPage() {
  const router = useRouter();
  const [testLevel, setTestLevel] = useState<TestLevel>('detailed');
  const [logo, setLogo] = useState<File | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming state
  const [streamingStatus, setStreamingStatus] = useState('');
  const [streamingPhase, setStreamingPhase] = useState<Phase>('start');
  const [streamingText, setStreamingText] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!logo) {
      setError('Kérlek töltsd fel a logódat!');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStreamingText('');
    setStreamingStatus('Elemzés indítása...');
    setStreamingPhase('start');

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
        // Check if it's JSON error response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Hiba történt az elemzés során');
        }
        throw new Error('Hiba történt az elemzés során');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Nem sikerült olvasni a választ');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              switch (currentEvent) {
                case 'status':
                  setStreamingStatus(parsed.message);
                  setStreamingPhase(parsed.phase as Phase);
                  break;
                case 'chunk':
                  setStreamingText((prev) => prev + parsed.text);
                  break;
                case 'complete':
                  setStreamingPhase('complete');
                  setStreamingStatus('Kész!');
                  // Redirect to results
                  setTimeout(() => {
                    router.push(`/eredmeny/${parsed.id}`);
                  }, 500);
                  break;
                case 'error':
                  throw new Error(parsed.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                console.warn('Failed to parse SSE data:', data);
              } else {
                throw e;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
      setIsSubmitting(false);
    }
  }, [logo, testLevel, colors, router]);

  // Show streaming loader when submitting
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-bg-secondary py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <StreamingLoader
            status={streamingStatus}
            phase={streamingPhase}
            streamingText={streamingText}
          />
        </div>
      </div>
    );
  }

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
              disabled={!logo}
              className="min-w-[200px]"
            >
              Elemzés indítása
              <ArrowRight className="w-5 h-5 ml-2" />
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
