'use client';

import { Palette } from 'lucide-react';
import { ColorAnalysis as ColorAnalysisType } from '@/types';
import { Card, CardContent } from '@/components/ui';

interface ColorAnalysisProps {
  analysis: ColorAnalysisType;
}

export function ColorAnalysis({ analysis }: ColorAnalysisProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-highlight-yellow rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-accent-yellow" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">Színpaletta elemzés</h3>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-text-primary mb-1">Színharmónia</h4>
            <p className="text-text-secondary">{analysis.harmonia}</p>
          </div>

          <div>
            <h4 className="font-medium text-text-primary mb-1">Pszichológiai hatás</h4>
            <p className="text-text-secondary">{analysis.pszichologia}</p>
          </div>

          <div>
            <h4 className="font-medium text-text-primary mb-1">Technikai megfelelőség</h4>
            <p className="text-text-secondary">{analysis.technikai}</p>
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
