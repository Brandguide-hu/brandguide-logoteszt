'use client';

interface AppIconMockupProps {
  logoUrl: string;
}

export function AppIconMockup({ logoUrl }: AppIconMockupProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 p-6 aspect-square flex flex-col items-center justify-center gap-3">
      {/* App icon frame */}
      <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center p-3 ring-1 ring-black/5">
        <img src={logoUrl} alt="App ikon" className="max-w-full max-h-full object-contain" />
      </div>

      {/* App label */}
      <div className="text-center">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
      </div>

      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">App ikon</span>
    </div>
  );
}
