'use client';

import { useState, useEffect } from 'react';
import { useCookieConsent } from '@/providers/cookie-consent-provider';

export function CookieConsentModal() {
  const { showModal, acceptAll, rejectAll, updateConsent, analytics, marketing } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [customAnalytics, setCustomAnalytics] = useState(analytics);
  const [customMarketing, setCustomMarketing] = useState(marketing);

  // Sync toggles when modal opens
  useEffect(() => {
    if (showModal) {
      setCustomAnalytics(analytics);
      setCustomMarketing(marketing);
      setShowCustomize(false);
    }
  }, [showModal, analytics, marketing]);

  // Lock body scroll
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  if (!showModal) return null;

  const handleSaveCustom = () => {
    updateConsent(customAnalytics, customMarketing);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 animate-[fadeSlideUp_0.3s_ease]">
        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Cookie beállítások
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Sütiket használunk a weboldal működéséhez, statisztikák gyűjtéséhez és marketing célokra.
          Választhatsz, mely sütiket engedélyezed. A szükséges sütik mindig aktívak.
          {' '}
          <a href="/adatvedelem" target="_blank" className="text-blue-600 hover:underline">
            Adatvédelmi tájékoztató
          </a>
        </p>

        {/* Customize section */}
        {showCustomize && (
          <div className="mb-6 space-y-3">
            {/* Necessary — always on */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Szükséges</p>
                <p className="text-xs text-gray-500">Alapvető működés, bejelentkezés</p>
              </div>
              <div className="w-11 h-6 bg-green-500 rounded-full relative cursor-not-allowed opacity-70">
                <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </div>

            {/* Analytics toggle */}
            <button
              type="button"
              onClick={() => setCustomAnalytics(!customAnalytics)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">Statisztika</p>
                <p className="text-xs text-gray-500">Google Analytics, látogatottság mérés</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${customAnalytics ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${customAnalytics ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </button>

            {/* Marketing toggle */}
            <button
              type="button"
              onClick={() => setCustomMarketing(!customMarketing)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">Marketing</p>
                <p className="text-xs text-gray-500">Meta Pixel, hirdetés mérés</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${customMarketing ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${customMarketing ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          {!showCustomize ? (
            <>
              <button
                onClick={acceptAll}
                className="w-full py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Elfogadom mind
              </button>
              <button
                onClick={rejectAll}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors cursor-pointer"
              >
                Csak szükségesek
              </button>
              <button
                onClick={() => setShowCustomize(true)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Testreszabás
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveCustom}
                className="w-full py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Választás mentése
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Vissza
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
