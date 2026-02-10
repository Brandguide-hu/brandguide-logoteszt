'use client';

import { Tier, Category, CATEGORIES } from '@/types';
import { cx } from '@/utils/cx';

interface UploadFormProps {
  tier: Tier;
  logoName: string;
  creatorName: string;
  category: Category | '';
  email: string;
  aszfAccepted: boolean;
  isLoggedIn: boolean;
  onLogoNameChange: (value: string) => void;
  onCreatorNameChange: (value: string) => void;
  onCategoryChange: (value: Category | '') => void;
  onEmailChange: (value: string) => void;
  onAszfChange: (value: boolean) => void;
}

export function UploadForm({
  tier,
  logoName,
  creatorName,
  category,
  email,
  aszfAccepted,
  isLoggedIn,
  onLogoNameChange,
  onCreatorNameChange,
  onCategoryChange,
  onEmailChange,
  onAszfChange,
}: UploadFormProps) {
  const isFree = tier === 'free';

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Adatok megadása</h2>

      {/* Logó neve */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Logó neve <span className="text-gray-400">(opcionális)</span>
        </label>
        <input
          type="text"
          value={logoName}
          onChange={e => onLogoNameChange(e.target.value)}
          placeholder="pl. Cégem logója"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Név / cégnév */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Név / cégnév {isFree && <span className="text-red-500">*</span>}
          {!isFree && <span className="text-gray-400">(opcionális)</span>}
        </label>
        <input
          type="text"
          value={creatorName}
          onChange={e => onCreatorNameChange(e.target.value)}
          placeholder="Neved vagy a céged neve"
          required={isFree}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1">Ez jelenik meg a galériában az elemzésed mellett.</p>
      </div>

      {/* Iparág */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Iparág {isFree && <span className="text-red-500">*</span>}
          {!isFree && <span className="text-gray-400">(opcionális)</span>}
        </label>
        <select
          value={category}
          onChange={e => onCategoryChange(e.target.value as Category | '')}
          required={isFree}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none bg-white text-gray-900 cursor-pointer"
        >
          <option value="">Válassz iparágat...</option>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Email + ÁSZF — csak ha nincs bejelentkezve */}
      {!isLoggedIn && (
        <>
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email cím <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => onEmailChange(e.target.value)}
              placeholder="pelda@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aszfAccepted}
              onChange={e => onAszfChange(e.target.checked)}
              className="mt-1 h-4 w-4 text-yellow-400 rounded border-gray-300 focus:ring-yellow-400 cursor-pointer"
            />
            <span className="text-sm text-gray-600">
              Elfogadom az{' '}
              <a href="/aszf" target="_blank" className="text-gray-900 underline hover:text-yellow-600">
                Általános Szerződési Feltételeket
              </a>
              {' '}és az{' '}
              <a href="/adatvedelem" target="_blank" className="text-gray-900 underline hover:text-yellow-600">
                Adatvédelmi tájékoztatót
              </a>
              .
            </span>
          </label>
        </>
      )}

      {/* Ingyenes infóbox */}
      {isFree && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Az ingyenes elemzés a nyilvános Logo galériába kerül. A neve és az eredmény bárki számára látható lesz.</span>
        </div>
      )}
    </div>
  );
}
