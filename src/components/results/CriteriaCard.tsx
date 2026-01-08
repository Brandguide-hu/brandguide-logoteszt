'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { CriteriaScore, CriteriaMeta } from '@/types';
import { cn } from '@/lib/utils';

interface CriteriaCardProps {
  criteria: CriteriaMeta;
  score: CriteriaScore;
}

export function CriteriaCard({ criteria, score }: CriteriaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage = (score.pont / score.maxPont) * 100;

  const getBarColor = () => {
    if (percentage >= 80) return 'bg-score-excellent';
    if (percentage >= 60) return 'bg-score-good';
    if (percentage >= 40) return 'bg-score-fair';
    return 'bg-score-poor';
  };

  return (
    <div className="bg-bg-primary border border-bg-tertiary rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-bg-secondary transition-colors"
      >
        <span className="text-2xl">{criteria.icon}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-text-primary">{criteria.displayName}</h3>
            <span className="font-bold text-text-primary">
              {score.pont}/{score.maxPont}
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-bg-tertiary animate-fade-in">
          <p className="text-sm text-text-muted mb-3">{criteria.description}</p>
          <p className="text-text-secondary mb-4">{score.indoklas}</p>

          {score.tippek && score.tippek.length > 0 && (
            <div className="bg-highlight-yellow rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-accent-yellow" />
                <span className="font-medium text-sm text-highlight-yellow-text">
                  Javaslatok
                </span>
              </div>
              <ul className="space-y-1">
                {score.tippek.map((tip, index) => (
                  <li key={index} className="text-sm text-text-primary flex items-start gap-2">
                    <span className="text-accent-yellow">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
