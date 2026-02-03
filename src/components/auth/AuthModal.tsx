'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthModal } from '@/providers/auth-modal-provider';

type AuthMode = 'login' | 'register';

export function AuthModal() {
  const router = useRouter();
  const { isOpen, defaultTab, redirectAfterAuth, closeAuthModal } = useAuthModal();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Sync tab with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultTab);
      setEmail('');
      setName('');
      setAcceptedTerms(false);
      setMessage(null);
      setSubmitted(false);
      setIsLoading(false);
    }
  }, [isOpen, defaultTab]);

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
      if (mode === 'register') {
        if (!acceptedTerms) {
          setMessage({ type: 'error', text: 'Az ÁSZF elfogadása kötelező' });
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage({ type: 'error', text: data.error });
          setIsLoading(false);
          return;
        }

        setSubmitted(true);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setMessage({ type: 'error', text: 'Ez az email nincs regisztrálva. Regisztrálj először!' });
            setMode('register');
            setIsLoading(false);
            return;
          }
          setMessage({ type: 'error', text: data.error });
          setIsLoading(false);
          return;
        }

        setSubmitted(true);
      }
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
              {mode === 'login'
                ? 'Bejelentkezési linket küldtünk ide:'
                : 'Megerősítő linket küldtünk ide:'}
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

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <img src="/logolab-logo-newLL.svg" alt="LogoLab" className="h-10" />
          </div>
          <p className="text-gray-500 mt-2 text-sm">
            {mode === 'login' ? 'Jelentkezz be a fiókodba' : 'Hozz létre egy fiókot'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode('login'); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bejelentkezés
          </button>
          <button
            onClick={() => { setMode('register'); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Regisztráció
          </button>
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
          {mode === 'register' && (
            <div>
              <label htmlFor="modal-name" className="block text-sm font-medium text-gray-700 mb-1">
                Név
              </label>
              <input
                id="modal-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Teljes neved"
                required
                minLength={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
              />
            </div>
          )}

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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
            />
          </div>

          {mode === 'register' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
              />
              <span className="text-sm text-gray-600">
                Elfogadom az{' '}
                <a href="/aszf" target="_blank" className="text-yellow-600 hover:underline">
                  ÁSZF-et
                </a>{' '}
                és az{' '}
                <a href="/adatvedelem" target="_blank" className="text-yellow-600 hover:underline">
                  Adatvédelmi tájékoztatót
                </a>
              </span>
            </label>
          )}

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
            ) : mode === 'login' ? (
              'Bejelentkezési link küldése'
            ) : (
              'Regisztráció'
            )}
          </button>
        </form>

        {/* Info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === 'login'
            ? 'Egy bejelentkezési linket küldünk az email címedre. Jelszó nem szükséges.'
            : 'Egy megerősítő linket küldünk az email címedre.'}
        </p>
      </div>
    </div>
  );
}
