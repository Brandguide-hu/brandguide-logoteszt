'use client';

interface PhoneMockupProps {
  logoUrl: string;
}

export function PhoneMockup({ logoUrl }: PhoneMockupProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 aspect-square flex flex-col items-center justify-center gap-3">
      {/* Phone frame */}
      <div className="w-20 h-36 rounded-2xl bg-gray-900 p-1 shadow-xl ring-1 ring-gray-700">
        {/* Screen */}
        <div className="w-full h-full rounded-xl bg-white flex flex-col items-center overflow-hidden">
          {/* Status bar */}
          <div className="w-full h-3 bg-gray-100 flex items-center justify-center">
            <div className="w-8 h-1 bg-gray-900 rounded-full" />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2">
            {/* Logo */}
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={logoUrl} alt="Telefon logó" className="max-w-full max-h-full object-contain" />
            </div>

            {/* Placeholder content */}
            <div className="w-full space-y-1">
              <div className="w-3/4 h-0.5 bg-gray-200 rounded-full mx-auto" />
              <div className="w-1/2 h-0.5 bg-gray-200 rounded-full mx-auto" />
            </div>

            {/* Button */}
            <div className="w-12 h-2.5 bg-gray-900 rounded-full" />
          </div>

          {/* Bottom bar */}
          <div className="w-full h-2 bg-gray-50 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-gray-300 rounded-full" />
          </div>
        </div>
      </div>

      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Mobil nézet</span>
    </div>
  );
}
