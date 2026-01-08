'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { isValidHexColor, cn } from '@/lib/utils';

interface ColorPickerProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  maxColors?: number;
}

export function ColorPicker({ colors, onChange, maxColors = 6 }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState('#');
  const [error, setError] = useState<string | null>(null);

  const handleAddColor = () => {
    if (!inputValue || inputValue === '#') {
      setError('Adj meg egy színkódot');
      return;
    }

    const color = inputValue.startsWith('#') ? inputValue : `#${inputValue}`;

    if (!isValidHexColor(color)) {
      setError('Érvénytelen HEX színkód (pl. #FF5733)');
      return;
    }

    if (colors.includes(color.toUpperCase())) {
      setError('Ez a szín már hozzá van adva');
      return;
    }

    if (colors.length >= maxColors) {
      setError(`Maximum ${maxColors} szín adható hozzá`);
      return;
    }

    setError(null);
    onChange([...colors, color.toUpperCase()]);
    setInputValue('#');
  };

  const handleRemoveColor = (colorToRemove: string) => {
    onChange(colors.filter((c) => c !== colorToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddColor();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder="#FF5733"
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-yellow focus:border-transparent transition-all',
              error ? 'border-error' : 'border-bg-tertiary'
            )}
            maxLength={7}
          />
          {inputValue && inputValue !== '#' && isValidHexColor(inputValue.startsWith('#') ? inputValue : `#${inputValue}`) && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded border border-bg-tertiary"
              style={{ backgroundColor: inputValue.startsWith('#') ? inputValue : `#${inputValue}` }}
            />
          )}
        </div>
        <Button
          onClick={handleAddColor}
          disabled={colors.length >= maxColors}
          className="flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {colors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <div
              key={color}
              className="flex items-center gap-2 bg-bg-secondary rounded-lg px-3 py-2 group"
            >
              <div
                className="w-6 h-6 rounded border border-bg-tertiary shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-mono text-text-primary">{color}</span>
              <button
                onClick={() => handleRemoveColor(color)}
                className="w-5 h-5 rounded-full bg-bg-tertiary text-text-muted hover:bg-error hover:text-white transition-colors flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {colors.length === 0 && (
        <p className="text-sm text-text-muted">
          Add meg a brand színeidet HEX formátumban (opcionális)
        </p>
      )}
    </div>
  );
}
