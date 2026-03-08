'use client';

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
}

export function CategorySelect({ selected, onChange }: CategorySelectProps) {
  const selectedCat = MOCKUP_CATEGORIES.find(c => c.id === selected);
  const SelectedIcon = selectedCat ? CATEGORY_ICONS[selectedCat.id] : Globe01;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Melyik iparágba tartozik a logód?</h2>
        <p className="text-sm text-gray-500 mt-1">Válaszd ki a legmegfelelőbb kategóriát.</p>
      </div>

      {/* Pill grid */}
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

      {/* Selection indicator */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <SelectedIcon className="size-4 text-gray-500" />
        <span className="text-sm text-gray-700">
          Kijelölve: <strong className="font-semibold text-gray-900">{selectedCat?.label}</strong>
        </span>
      </div>
    </div>
  );
}
