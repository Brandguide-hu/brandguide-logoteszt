'use client';

import { TestLevel } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface LevelSelectorProps {
  selected: TestLevel;
  onChange: (level: TestLevel) => void;
}

const levels = [
  {
    id: 'basic' as TestLevel,
    name: 'Alap teszt',
    icon: '🔍',
    description: 'Gyors elemzés a 7 szempont szerint',
    features: ['Logó értékelés', '7 szempont', 'Összpontszám'],
    time: '~30 mp',
  },
  {
    id: 'detailed' as TestLevel,
    name: 'Részletes teszt',
    icon: '🎨',
    description: 'Logó + színpaletta + tipográfia',
    features: ['Minden az alapból', 'Színelemzés', 'Tipográfia', 'Radar chart'],
    time: '~1-2 perc',
    recommended: true,
  },
];

export function LevelSelector({ selected, onChange }: LevelSelectorProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {levels.map((level) => (
        <button
          key={level.id}
          onClick={() => onChange(level.id)}
          className={cn(
            'relative text-left p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-md',
            selected === level.id
              ? 'border-accent-yellow bg-highlight-yellow/30'
              : 'border-bg-tertiary bg-bg-primary hover:border-text-muted'
          )}
        >
          {level.recommended && (
            <div className="absolute -top-3 right-4 bg-accent-yellow text-white text-xs font-bold px-2 py-1 rounded">
              AJÁNLOTT
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="text-3xl">{level.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary">{level.name}</h3>
                {selected === level.id && (
                  <CheckCircle className="w-5 h-5 text-accent-yellow" />
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1">{level.description}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {level.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs bg-bg-secondary px-2 py-1 rounded text-text-secondary"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <p className="text-xs text-text-muted mt-3">{level.time}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
