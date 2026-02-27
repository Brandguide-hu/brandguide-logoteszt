'use client';

interface StorefrontMockupProps {
  logoUrl: string;
}

export function StorefrontMockup({ logoUrl }: StorefrontMockupProps) {
  return (
    <div className="rounded-xl bg-gradient-to-b from-sky-100 to-sky-200 p-6 aspect-square flex flex-col items-center justify-end gap-2">
      {/* Building */}
      <div className="w-full max-w-[160px] flex flex-col items-center">
        {/* Sign */}
        <div className="w-24 h-10 bg-white rounded-lg shadow-md flex items-center justify-center p-1.5 mb-1 ring-1 ring-black/5">
          <img src={logoUrl} alt="Üzletportál logó" className="max-w-full max-h-full object-contain" />
        </div>

        {/* Awning */}
        <div className="w-full h-3 bg-red-400/60 rounded-t-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }} />

        {/* Storefront */}
        <div className="w-full bg-gray-700 rounded-b-lg p-2 flex gap-1">
          <div className="flex-1 bg-sky-100/30 rounded h-12" />
          <div className="w-6 bg-gray-600 rounded h-12" />
          <div className="flex-1 bg-sky-100/30 rounded h-12" />
        </div>
      </div>

      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Üzletportál</span>
    </div>
  );
}
