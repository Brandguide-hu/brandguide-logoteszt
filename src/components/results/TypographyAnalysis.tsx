'use client';

import { Type } from 'lucide-react';
import { TypographyAnalysis as TypographyAnalysisType } from '@/types';
import { Card, CardContent } from '@/components/ui';

interface TypographyAnalysisProps {
  analysis: TypographyAnalysisType;
}

export function TypographyAnalysis({ analysis }: TypographyAnalysisProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-highlight-yellow rounded-lg flex items-center justify-center">
            <Type className="w-5 h-5 text-accent-yellow" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">Tipográfia elemzés</h3>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-text-primary mb-1">Karakter</h4>
            <p className="text-text-secondary">{analysis.karakter}</p>
          </div>

          <div>
            <h4 className="font-medium text-text-primary mb-1">Olvashatóság</h4>
            <p className="text-text-secondary">{analysis.olvashatos}</p>
          </div>

          <div>
            <h4 className="font-medium text-text-primary mb-1">Brandhez illeszkedés</h4>
            <p className="text-text-secondary">{analysis.illeszkedés}</p>
          </div>

          {analysis.javaslatok && analysis.javaslatok.length > 0 && (
            <div className="bg-highlight-yellow rounded-lg p-4 mt-4">
              <h4 className="font-medium text-highlight-yellow-text mb-2">Javaslatok</h4>
              <ul className="space-y-1">
                {analysis.javaslatok.map((javaslat, index) => (
                  <li key={index} className="text-sm text-text-primary flex items-start gap-2">
                    <span className="text-accent-yellow">•</span>
                    <span>{javaslat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
