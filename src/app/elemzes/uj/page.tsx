'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { TierSelector } from '@/components/upload/TierSelector';
import { UploadForm } from '@/components/upload/UploadForm';
import { DropZone } from '@/components/upload/DropZone';
import { Tier, Category, TIER_INFO } from '@/types';
import { cx } from '@/utils/cx';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function NewAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: authLoading } = useAuth();

  // URL params
  const tierParam = searchParams.get('tier') as Tier | null;
  const upgradeFrom = searchParams.get('upgradeFrom');
  const canceled = searchParams.get('canceled') === 'true';

  // Ref a logo upload szekció scrollozásához
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedTier, setSelectedTier] = useState<Tier | null>(tierParam || (upgradeFrom ? 'paid' : null));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [email, setEmail] = useState('');
  const [brief, setBrief] = useState('');
  const [aszfAccepted, setAszfAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUseFree, setCanUseFree] = useState<boolean | null>(null);
  const [showCancelBanner, setShowCancelBanner] = useState(canceled);
  const [upgradeLoading, setUpgradeLoading] = useState(!!upgradeFrom);
  const [upgradePreviewUrl, setUpgradePreviewUrl] = useState<string | null>(null);

  // upgradeFrom: load the original analysis data and pre-fill the form
  useEffect(() => {
    if (!upgradeFrom) return;

    (async () => {
      try {
        const res = await fetch(`/api/result/${upgradeFrom}`);
        if (!res.ok) throw new Error('Nem található az eredeti elemzés');
        const data = await res.json();

        // Pre-fill form fields from the original analysis
        if (data.logo_name) setLogoName(data.logo_name);
        if (data.creator_name) setCreatorName(data.creator_name);
        if (data.category) setCategory(data.category as Category);
        if (data.brief) setBrief(data.brief);

        // Convert base64 to File object
        if (data.logo_base64) {
          let mimeType = 'image/png';
          if (data.logo_original_path) {
            const ext = data.logo_original_path.split('.').pop()?.toLowerCase();
            if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'webp') mimeType = 'image/webp';
          }

          const byteChars = atob(data.logo_base64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          const ext = mimeType.split('/')[1];
          const file = new File([blob], `logo.${ext}`, { type: mimeType });
          setLogoFile(file);
          setUpgradePreviewUrl(`data:${mimeType};base64,${data.logo_base64}`);
        }
      } catch (err) {
        console.error('[UPGRADE] Error loading original analysis:', err);
      } finally {
        setUpgradeLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeFrom]);

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
      if (brief.trim()) formData.append('brief', brief.trim());

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
          const supabase = getSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          const createRes = await fetch('/api/analysis/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ pendingAnalysisId }),
          });

          if (!createRes.ok) {
            const data = await createRes.json();
            setError(data.error || 'Hiba történt az elemzés létrehozása során');
            setIsSubmitting(false);
            return;
          }

          const { analysisId } = await createRes.json();
          router.push(`/elemzes/feldolgozas/${analysisId}`);
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

    // Scroll az upload szekció elejéhez rövid késleltetéssel (hogy a szekció megjelenjen)
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

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

  // Upgrade loading screen
  if (upgradeLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

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

          {/* Upgrade banner */}
          {upgradeFrom && (
            <div className="mb-6 p-4 bg-yellow-50 border border-[#FFF012] rounded-xl flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {upgradePreviewUrl ? (
                  <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden p-1">
                    <img src={upgradePreviewUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Teljes elemzés feloldása</p>
                <p className="text-sm text-gray-600 mt-0.5">A logód előtöltve. Válaszd ki a MAX csomagot és fizess a teljes elemzésért.</p>
              </div>
            </div>
          )}

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
              canUseFree={upgradeFrom ? false : canUseFree}
              isLoggedIn={!!user}
            />
          </div>

          {/* Step 2: Logo Upload */}
          {selectedTier && (
            <div ref={uploadSectionRef} className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Töltsd fel a logódat</h2>
              {/* Upgrade módban: előtöltött logó megjelenítése */}
              {upgradeFrom && upgradePreviewUrl ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden p-2 shrink-0">
                    <img src={upgradePreviewUrl} alt="Előtöltött logó" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{logoName || 'Logó'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Előtöltve a korábbi elemzésből</p>
                  </div>
                  <button
                    onClick={() => {
                      setLogoFile(null);
                      setUpgradePreviewUrl(null);
                    }}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Logó cseréje"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <DropZone
                  onFileSelect={handleLogoSelect}
                  file={logoFile}
                />
              )}
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
                brief={brief}
                aszfAccepted={aszfAccepted}
                isLoggedIn={!!user}
                onLogoNameChange={setLogoName}
                onCreatorNameChange={setCreatorName}
                onCategoryChange={setCategory}
                onEmailChange={setEmail}
                onBriefChange={setBrief}
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
