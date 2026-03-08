'use client';

import { useState, useEffect } from 'react';
import { MockupCategory, MOCKUP_CATEGORIES } from '@/types';
import {
  Home03, Heart, CpuChip01, Briefcase01, Palette, Activity,
  ShoppingBag01, Building05, GraduationHat01, Globe01,
} from '@untitledui/icons';
import { ComponentType, SVGAttributes } from 'react';

const CATEGORY_ICONS: Record<MockupCategory, ComponentType<SVGAttributes<SVGSVGElement>>> = {
  food_beverage: Home03,
  fashion_lifestyle: Heart,
  tech_digital: CpuChip01,
  professional: Briefcase01,
  creative_agency: Palette,
  health_wellness: Activity,
  retail_shop: ShoppingBag01,
  hospitality: Building05,
  education: GraduationHat01,
  universal: Globe01,
};

interface CategorySelectProps {
  selected: MockupCategory;
  onChange: (id: MockupCategory) => void;
  logoFile: File | null;
  logoPreviewUrl?: string | null;
}

export function CategorySelect({ selected, onChange, logoFile, logoPreviewUrl }: CategorySelectProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoPreviewUrl || null);

  // Generate preview URL from file if needed
  useEffect(() => {
    if (logoPreviewUrl) {
      setPreviewUrl(logoPreviewUrl);
      return;
    }
    if (!logoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile, logoPreviewUrl]);

  const selectedCat = MOCKUP_CATEGORIES.find(c => c.id === selected);
  const SelectedIcon = selectedCat ? CATEGORY_ICONS[selectedCat.id] : Globe01;

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* A) Logo preview strip */}
      {logoFile && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-[52px] h-[52px] bg-white rounded-[10px] border border-gray-200 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
            {previewUrl && (
              <img src={previewUrl} alt="Logó" className="max-w-full max-h-full object-contain" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{logoFile.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatSize(logoFile.size)}</p>
          </div>
        </div>
      )}

      {/* B) Info banner */}
      <div className="flex items-center gap-2 p-3 bg-[#FFFDE0] border border-[#FFF012] rounded-xl">
        <span className="text-sm text-gray-700">Válaszd ki a logód iparágát</span>
      </div>

      {/* C) Title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Melyik iparágba tartozik a logód?</h2>
        <p className="text-sm text-gray-500 mt-1">Válaszd ki a legmegfelelőbb kategóriát.</p>
      </div>

      {/* D) Pill grid */}
      <div className="flex flex-wrap gap-2">
        {MOCKUP_CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isSelected = selected === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-[#222331] text-[#FFF012] border-[#222331]'
                  : 'bg-white text-[#222331] border-[#E5E5E0] hover:border-gray-400 hover:shadow-sm'
              }`}
            >
              <Icon className={`size-4 ${isSelected ? 'text-[#FFF012]' : 'text-gray-400'}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* E) Selection indicator */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <SelectedIcon className="size-4 text-gray-500" />
        <span className="text-sm text-gray-700">
          Kijelölve: <strong className="font-semibold text-gray-900">{selectedCat?.label}</strong>
        </span>
      </div>
    </div>
  );
}
