'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InfoCircle } from '@untitledui/icons';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position calculation
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition(rect.top < 120 ? 'bottom' : 'top');
    }
  }, [isOpen]);

  // Click outside to close (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: Event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsOpen(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsOpen(false), 100);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setIsOpen(false), 100);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Információ"
        className="relative ml-1 text-[#70728E] hover:text-[#222331] transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF012]
                   rounded-full cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <InfoCircle className="w-4 h-4" />

        {isOpen && (
          <div
            ref={tooltipRef}
            role="tooltip"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            className={`
              absolute z-50 w-[280px] px-3 py-2
              bg-[#222331] text-white text-[13px] leading-[1.4] text-left font-normal
              rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)]
              animate-[tooltipFade_150ms_ease-out]
              ${position === 'top'
                ? 'bottom-full mb-2'
                : 'top-full mt-2'}
            `}
          >
            {text}
            {/* Arrow */}
            <div
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
              }}
              className={`
                absolute w-0 h-0
                border-x-[6px] border-x-transparent
                ${position === 'top'
                  ? 'top-full border-t-[6px] border-t-[#222331]'
                  : 'bottom-full border-b-[6px] border-b-[#222331]'}
              `}
            />
          </div>
        )}
      </button>
    </span>
  );
}
