'use client';

import { useEffect, useState } from 'react';
import { Rating } from '@/types';
import { getRatingColor, getRatingIcon } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  rating: Rating;
  animate?: boolean;
}

export function ScoreDisplay({ score, rating, animate = true }: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const color = getRatingColor(rating);
  const icon = getRatingIcon(rating);

  useEffect(() => {
    if (!animate) return;

    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animate]);

  // Calculate the circumference and offset for the circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-64 h-64">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="var(--color-gray-200)"
            strokeWidth="16"
          />
          {/* Progress circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-6xl font-bold animate-score"
            style={{ color }}
          >
            {displayScore}
          </span>
          <span className="text-tertiary text-lg">/100</span>
        </div>
      </div>

      {/* Rating badge */}
      <div
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <span className="text-2xl">{icon}</span>
        <span>{rating}</span>
      </div>
    </div>
  );
}
