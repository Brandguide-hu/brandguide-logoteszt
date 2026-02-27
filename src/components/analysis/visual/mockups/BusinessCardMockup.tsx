'use client';

interface BusinessCardMockupProps {
  logoUrl: string;
}

export function BusinessCardMockup({ logoUrl }: BusinessCardMockupProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 aspect-square flex flex-col items-center justify-center gap-3">
      {/* Business card */}
      <div className="w-full max-w-[160px] aspect-[1.75/1] bg-white rounded-lg shadow-xl p-3 flex flex-col justify-between">
        {/* Top: logo */}
        <div className="h-6 flex items-center">
          <img src={logoUrl} alt="Névjegy logó" className="max-h-full max-w-[60%] object-contain" />
        </div>

        {/* Bottom: dummy text lines */}
        <div className="space-y-1">
          <div className="w-16 h-1 bg-gray-300 rounded-full" />
          <div className="w-24 h-1 bg-gray-200 rounded-full" />
          <div className="w-20 h-1 bg-gray-200 rounded-full" />
        </div>
      </div>

      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Névjegykártya</span>
    </div>
  );
}
