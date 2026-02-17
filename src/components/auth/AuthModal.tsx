'use client';

import { useState, useEffect } from 'react';
import { useAuthModal } from '@/providers/auth-modal-provider';

export function AuthModal() {
  const { isOpen, closeAuthModal } = useAuthModal();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setMessage(null);
      setSubmitted(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Unified login endpoint - creates user if doesn't exist
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If user not found, try register endpoint
        if (res.status === 404) {
          const registerRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: email.split('@')[0] }),
          });

          const registerData = await registerRes.json();

          if (!registerRes.ok) {
            setMessage({ type: 'error', text: registerData.error || 'Hiba történt' });
            setIsLoading(false);
            return;
          }

          setSubmitted(true);
          return;
        }

        setMessage({ type: 'error', text: data.error || 'Hiba történt' });
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setMessage({ type: 'error', text: 'Hálózati hiba. Próbáld újra!' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeAuthModal();
    }
  };

  // Success state after submission
  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        onClick={handleBackdropClick}
      >
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-[fadeSlideUp_0.3s_ease]">
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Ellenőrizd az email fiókodat!
            </h3>
            <p className="text-gray-500 text-sm mb-2">
              Bejelentkezési linket küldtünk ide:
            </p>
            <p className="font-medium text-gray-900 mb-4">{email}</p>
            <p className="text-xs text-gray-400 mb-6">
              A link 15 percig érvényes. Nézd meg a spam mappát is!
            </p>
            <button
              onClick={closeAuthModal}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-[fadeSlideUp_0.3s_ease]">
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <img src="/logolab-logo-newLL.svg" alt="LogoLab" className="h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-3">Belépés</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Add meg az email címed, és küldünk egy linket
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email cím
            </label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="te@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Küldés...
              </span>
            ) : (
              'Link küldése'
            )}
          </button>
        </form>

        {/* Info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Jelszó nélkül, egyszerűen. Magic linket küldünk az email címedre.
        </p>
      </div>
    </div>
  );
}
