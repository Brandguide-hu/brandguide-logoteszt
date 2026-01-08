'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface HighlightBoxProps extends HTMLAttributes<HTMLDivElement> {
  icon?: string;
}

export const HighlightBox = forwardRef<HTMLDivElement, HighlightBoxProps>(
  ({ className, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-highlight-yellow border-l-4 border-accent-yellow p-4 rounded-r-lg',
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
          <div className="text-text-primary">{children}</div>
        </div>
      </div>
    );
  }
);

HighlightBox.displayName = 'HighlightBox';
