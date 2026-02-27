'use client';

interface LetterheadMockupProps {
  logoUrl: string;
}

export function LetterheadMockup({ logoUrl }: LetterheadMockupProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 aspect-square flex flex-col items-center justify-center gap-3">
      {/* Letterhead paper */}
      <div className="w-full max-w-[130px] aspect-[0.707/1] bg-white rounded-sm shadow-lg p-3 flex flex-col ring-1 ring-black/5">
        {/* Header with logo */}
        <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-gray-100">
          <img src={logoUrl} alt="Levélpapír logó" className="h-4 max-w-[40%] object-contain" />
          <div className="flex-1">
            <div className="w-full h-0.5 bg-gray-200 rounded-full mb-0.5" />
            <div className="w-3/4 h-0.5 bg-gray-200 rounded-full" />
          </div>
        </div>

        {/* Body text lines */}
        <div className="flex-1 space-y-1.5">
          <div className="w-full h-0.5 bg-gray-100 rounded-full" />
          <div className="w-full h-0.5 bg-gray-100 rounded-full" />
          <div className="w-3/4 h-0.5 bg-gray-100 rounded-full" />
          <div className="w-full h-0.5 bg-gray-100 rounded-full" />
          <div className="w-2/3 h-0.5 bg-gray-100 rounded-full" />
          <div className="w-full h-0.5 bg-gray-100 rounded-full" />
          <div className="w-5/6 h-0.5 bg-gray-100 rounded-full" />
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 mt-auto">
          <div className="w-full h-0.5 bg-gray-100 rounded-full" />
        </div>
      </div>

      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Levélpapír</span>
    </div>
  );
}
