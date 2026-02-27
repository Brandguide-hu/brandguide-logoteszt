'use client';

interface TShirtMockupProps {
  logoUrl: string;
}

export function TShirtMockup({ logoUrl }: TShirtMockupProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-6 aspect-square flex flex-col items-center justify-center gap-3">
      {/* T-shirt shape using CSS */}
      <div className="relative w-28 h-32">
        {/* T-shirt body */}
        <svg viewBox="0 0 120 140" className="w-full h-full">
          {/* Sleeves */}
          <path
            d="M 15 25 L 0 50 L 15 55 L 15 25"
            fill="#e5e7eb"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M 105 25 L 120 50 L 105 55 L 105 25"
            fill="#e5e7eb"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          {/* Body */}
          <path
            d="M 15 25 Q 30 15 60 15 Q 90 15 105 25 L 105 130 Q 60 135 15 130 Z"
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          {/* Collar */}
          <path
            d="M 40 18 Q 60 30 80 18"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.5"
          />
        </svg>

        {/* Logo on shirt */}
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          <img src={logoUrl} alt="Póló logó" className="w-10 h-10 object-contain" />
        </div>
      </div>

      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Póló</span>
    </div>
  );
}
