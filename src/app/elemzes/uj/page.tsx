'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { TierSelector } from '@/components/upload/TierSelector';
import { UploadForm } from '@/components/upload/UploadForm';
import { DropZone } from '@/components/upload/DropZone';
import { Tier, Category, TIER_INFO } from '@/types';
import { cx } from '@/utils/cx';

function NewAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: authLoading } = useAuth();

  // URL params
  const tierParam = searchParams.get('tier') as Tier | null;
  const canceled = searchParams.get('canceled') === 'true';

  // Form state
  const [selectedTier, setSelectedTier] = useState<Tier | null>(tierParam || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [email, setEmail] = useState('');
  const [aszfAccepted, setAszfAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUseFree, setCanUseFree] = useState<boolean | null>(null);
  const [showCancelBanner, setShowCancelBanner] = useState(canceled);

  // Pre-fill from profile
  useEffect(() => {
    if (profile?.name && !creatorName) {
      setCreatorName(profile.name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  // Check free availability
  useEffect(() => {
    checkFreeAvailability();
  }, [user]);

  const checkFreeAvailability = async () => {
    try {
      const res = await fetch('/api/user/can-free-analysis');
      const data = await res.json();
      setCanUseFree(data.canUse);
    } catch {
      setCanUseFree(true);
    }
  };

  // Track page view
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    fetch('/api/tracking/upload-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        eventType: 'page_view',
        tier: tierParam,
        referrer: document.referrer || null,
      }),
    }).catch(() => {}); // Fire and forget
  }, []);

  // Validate form
  const isFormValid = useCallback(() => {
    if (!selectedTier) return false;
    if (!logoFile) return false;

    const isFree = selectedTier === 'free';
    if (isFree) {
      if (!creatorName.trim()) return false;
      if (!category) return false;
    }

    // Auth fields required only when not logged in
    if (!user) {
      if (!email.trim()) return false;
      if (!aszfAccepted) return false;
    }

    return true;
  }, [selectedTier, logoFile, creatorName, category, email, aszfAccepted, user]);

  // Submit handler
  const handleSubmit = async () => {
    if (!isFormValid() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const sessionId = getOrCreateSessionId();

    // Track submit click
    fetch('/api/tracking/upload-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        eventType: 'submit_clicked',
        tier: selectedTier,
        hasLogo: true,
        hasEmail: !!email || !!user,
      }),
    }).catch(() => {});

    try {
      // 1. Prepare: upload logo + form data to temp storage
      const formData = new FormData();
      formData.append('logo', logoFile!);
      formData.append('sessionId', sessionId);
      formData.append('tier', selectedTier!);
      formData.append('logoName', logoName || 'Névtelen logó');
      if (creatorName) formData.append('creatorName', creatorName);
      if (category) formData.append('category', category);
      if (email) formData.append('email', email);
      if (user?.id) formData.append('userId', user.id);

      const prepareRes = await fetch('/api/analysis/prepare', {
        method: 'POST',
        body: formData,
      });

      if (!prepareRes.ok) {
        const data = await prepareRes.json();
        setError(data.error || 'Hiba történt a feltöltés során');
        setIsSubmitting(false);
        return;
      }

      const { pendingAnalysisId } = await prepareRes.json();

      // 2. Route based on tier + auth state
      if (user) {
        // --- BEJELENTKEZETT USER ---
        if (selectedTier === 'free') {
          // Free + logged in: start analysis immediately
          const createRes = await fetch('/api/analysis/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingAnalysisId }),
          });

          if (!createRes.ok) {
            const data = await createRes.json();
            setError(data.error || 'Hiba történt az elemzés létrehozása során');
            setIsSubmitting(false);
            return;
          }

          const { analysisId } = await createRes.json();
          router.push(`/dashboard/${analysisId}`);
        } else {
          // Paid + logged in: Stripe checkout
          await redirectToStripe(pendingAnalysisId, selectedTier!, email || user.email!);
        }
      } else {
        // --- NEM BEJELENTKEZETT USER ---
        if (selectedTier === 'free') {
          // Free + not logged in: lazy register → email megerősítés
          const lazyRes = await fetch('/api/auth/lazy-register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pendingAnalysisId }),
          });

          if (!lazyRes.ok) {
            const data = await lazyRes.json();
            setError(data.error || 'Hiba történt a regisztráció során');
            setIsSubmitting(false);
            return;
          }

          // Track auth started
          fetch('/api/tracking/upload-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, eventType: 'auth_started', tier: selectedTier }),
          }).catch(() => {});

          router.push(`/elemzes/megerosites?email=${encodeURIComponent(email)}&pending=${pendingAnalysisId}`);
        } else {
          // Paid + not logged in: Stripe checkout
          await redirectToStripe(pendingAnalysisId, selectedTier!, email);
        }
      }
    } catch (err) {
      console.error('[UPLOAD] Error:', err);
      setError('Váratlan hiba történt. Kérlek próbáld újra.');
      setIsSubmitting(false);
    }
  };

  // Stripe redirect helper
  const redirectToStripe = async (pendingAnalysisId: string, tier: Tier, customerEmail: string) => {
    const sessionId = getOrCreateSessionId();

    // Track Stripe redirect
    fetch('/api/tracking/upload-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, eventType: 'stripe_redirect', tier }),
    }).catch(() => {});

    const checkoutRes = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pendingAnalysisId,
        tier,
        email: customerEmail,
      }),
    });

    const checkoutData = await checkoutRes.json();

    if (!checkoutRes.ok || !checkoutData.url) {
      setError('Hiba történt a fizetés indítása során');
      setIsSubmitting(false);
      return;
    }

    window.location.href = checkoutData.url;
  };

  // Tier change tracking
  const handleTierSelect = (tier: Tier) => {
    setSelectedTier(tier);

    const sessionId = getOrCreateSessionId();
    fetch('/api/tracking/upload-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, eventType: 'tier_selected', tier }),
    }).catch(() => {});
  };

  // Logo change tracking
  const handleLogoSelect = (file: File | null) => {
    setLogoFile(file);

    if (file) {
      const sessionId = getOrCreateSessionId();
      fetch('/api/tracking/upload-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, eventType: 'logo_selected', tier: selectedTier, hasLogo: true }),
      }).catch(() => {});
    }
  };

  // Button label
  const getButtonLabel = () => {
    if (isSubmitting) return 'Feldolgozás...';
    if (!selectedTier) return 'Válassz csomagot';
    if (selectedTier === 'free') return 'Light csomag — elemzés indítása';
    return `Fizetés és elemzés indítása — ${TIER_INFO[selectedTier].price}`;
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Greeting */}
          {user && profile && (
            <p className="text-lg text-gray-600 mb-2">
              Szia, {profile.name || user.email}! 👋
            </p>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Logó elemzés</h1>

          {/* Cancel banner */}
          {showCancelBanner && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 flex items-center justify-between">
              <span>A fizetés megszakadt. A formot nem veszítetted el, próbáld újra!</span>
              <button onClick={() => setShowCancelBanner(false)} className="ml-4 text-orange-400 hover:text-orange-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Step 1: Tier Selection */}
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
            <TierSelector
              selectedTier={selectedTier}
              onSelect={handleTierSelect}
              canUseFree={canUseFree}
              isLoggedIn={!!user}
            />
          </div>

          {/* Step 2: Logo Upload */}
          {selectedTier && (
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Töltsd fel a logódat</h2>
              <DropZone
                onFileSelect={handleLogoSelect}
                file={logoFile}
              />
            </div>
          )}

          {/* Step 3: Form Fields */}
          {selectedTier && logoFile && (
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
              <UploadForm
                tier={selectedTier}
                logoName={logoName}
                creatorName={creatorName}
                category={category}
                email={email}
                aszfAccepted={aszfAccepted}
                isLoggedIn={!!user}
                onLogoNameChange={setLogoName}
                onCreatorNameChange={setCreatorName}
                onCategoryChange={setCategory}
                onEmailChange={setEmail}
                onAszfChange={setAszfAccepted}
              />
            </div>
          )}

          {/* Error (gomb felett, hogy mindig látható) */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
              className={cx(
                'px-8 py-3.5 font-semibold rounded-xl transition-all text-base',
                isFormValid() && !isSubmitting
                  ? 'bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 cursor-pointer shadow-sm hover:shadow'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {getButtonLabel()}
                </span>
              ) : (
                getButtonLabel()
              )}
            </button>
            {/* Validációs hint: mi hiányzik */}
            {selectedTier && !isFormValid() && !isSubmitting && (
              <p className="text-xs text-gray-400">
                {!logoFile
                  ? 'Tölts fel egy logót a folytatáshoz'
                  : !user && !email.trim()
                  ? 'Add meg az email címedet'
                  : !user && !aszfAccepted
                  ? 'Fogadd el az ÁSZF-et'
                  : selectedTier === 'free' && !creatorName.trim()
                  ? 'Add meg a neved vagy a céged nevét'
                  : selectedTier === 'free' && !category
                  ? 'Válassz iparágat'
                  : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Helper: anonymous session ID for tracking
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('logolab_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('logolab_session_id', sessionId);
  }
  return sessionId;
}

// Wrap in Suspense for useSearchParams
export default function NewAnalysisPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    }>
      <NewAnalysisContent />
    </Suspense>
  );
}
