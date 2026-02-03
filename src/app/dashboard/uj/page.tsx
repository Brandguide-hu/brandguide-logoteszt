'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Tier, Category, CATEGORIES, TIER_INFO } from '@/types';
import { cx } from '@/utils/cx';

type Step = 'tier' | 'upload' | 'details' | 'confirm';

const STEPS: { key: Step; label: string }[] = [
  { key: 'tier', label: 'Csomag' },
  { key: 'upload', label: 'Feltöltés' },
  { key: 'details', label: 'Adatok' },
  { key: 'confirm', label: 'Indítás' },
];

export default function NewAnalysisPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>('tier');
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUseFree, setCanUseFree] = useState<boolean | null>(null);

  // Set creator name from profile
  useEffect(() => {
    if (profile?.name && !creatorName) {
      setCreatorName(profile.name);
    }
  }, [profile, creatorName]);

  // Check free analysis availability
  useEffect(() => {
    if (user) {
      checkFreeAvailability();
    }
  }, [user]);

  const checkFreeAvailability = async () => {
    try {
      const res = await fetch('/api/user/can-free-analysis');
      const data = await res.json();
      setCanUseFree(data.canUse);
    } catch {
      setCanUseFree(true); // Default to true on error
    }
  };

  // File handling
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Csak PNG, JPG vagy WebP formátum engedélyezett');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maximum 5MB méretű fájl engedélyezett');
      return;
    }
    setError(null);
    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Color picker
  const addColor = (color: string) => {
    if (brandColors.length < 5 && !brandColors.includes(color)) {
      setBrandColors([...brandColors, color]);
    }
  };

  const removeColor = (color: string) => {
    setBrandColors(brandColors.filter(c => c !== color));
  };

  // Navigation
  const canGoNext = () => {
    switch (step) {
      case 'tier': return selectedTier !== null;
      case 'upload': return logoFile !== null;
      case 'details': return category !== '';
      case 'confirm': return true;
      default: return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const goBack = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  // Submit
  const handleSubmit = async () => {
    if (!user || !logoFile || !selectedTier || !category) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });

      // Create analysis record
      const supabase = getSupabaseBrowserClient();
      const { data: analysis, error: createError } = await (supabase
        .from('analyses') as any)
        .insert({
          user_id: user.id,
          tier: selectedTier,
          status: selectedTier === 'free' ? 'processing' : 'pending',
          visibility: selectedTier === 'free' ? 'pending_approval' : 'private',
          logo_name: logoName || 'Névtelen logó',
          creator_name: creatorName || profile?.name || 'Ismeretlen',
          category,
          logo_base64: base64,
          test_level: 'detailed',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[NEW ANALYSIS] Create error:', createError);
        setError('Hiba történt az elemzés létrehozása során');
        setIsSubmitting(false);
        return;
      }

      // For paid tiers, redirect to Stripe checkout
      if (selectedTier !== 'free') {
        const checkoutRes = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisId: analysis.id,
            tier: selectedTier,
            userId: user.id,
          }),
        });

        const checkoutData = await checkoutRes.json();

        if (!checkoutRes.ok || !checkoutData.url) {
          setError('Hiba történt a fizetés indítása során');
          setIsSubmitting(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = checkoutData.url;
        return;
      }

      // Free tier: update timestamp and start analysis immediately
      await (supabase.from('profiles') as any)
        .update({ last_free_analysis_at: new Date().toISOString() })
        .eq('id', user.id);

      // Start analysis - call the existing analyze API
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo: base64,
          mediaType: logoFile.type,
          testLevel: 'detailed',
          colors: brandColors.length > 0 ? brandColors : undefined,
          analysisId: analysis.id,
        }),
      });

      if (!analyzeRes.ok) {
        setError('Hiba történt az elemzés indítása során');
        setIsSubmitting(false);
        return;
      }

      // Redirect to result page
      router.push(`/dashboard/${analysis.id}`);
    } catch (err) {
      console.error('[NEW ANALYSIS] Error:', err);
      setError('Váratlan hiba történt');
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Új elemzés</h1>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={cx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    i <= currentStepIndex
                      ? 'bg-[#FFF012] text-gray-900'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {i < currentStepIndex ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={cx('text-sm hidden sm:block', i <= currentStepIndex ? 'text-gray-900 font-medium' : 'text-gray-400')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cx('w-8 h-0.5', i < currentStepIndex ? 'bg-[#FFF012]' : 'bg-gray-200')} />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step content */}
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
            {/* STEP 1: Tier selection */}
            {step === 'tier' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Válassz csomagot</h2>
                <div className="grid gap-4">
                  {(Object.entries(TIER_INFO) as [Tier, typeof TIER_INFO.free][]).map(([tier, info]) => {
                    const isDisabled = tier === 'free' && canUseFree === false;
                    return (
                      <button
                        key={tier}
                        onClick={() => !isDisabled && setSelectedTier(tier)}
                        disabled={isDisabled}
                        className={cx(
                          'w-full text-left p-5 rounded-xl border-2 transition-all',
                          selectedTier === tier
                            ? 'border-[#FFF012] bg-yellow-50'
                            : isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{info.label}</span>
                          <span className="text-sm font-medium text-gray-600">{info.price}</span>
                        </div>
                        {isDisabled && (
                          <p className="text-xs text-orange-600 mb-2">Ma már felhasználtad. Holnap újra elérhető!</p>
                        )}
                        <ul className="space-y-1">
                          {info.features.map(f => (
                            <li key={f} className="text-sm text-gray-500 flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {f}
                            </li>
                          ))}
                        </ul>
                        {tier === 'free' && (
                          <p className="text-xs text-gray-400 mt-2">Az elemzés publikus lesz a galériában.</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Logo upload */}
            {step === 'upload' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Töltsd fel a logódat</h2>

                {logoPreview ? (
                  <div className="mb-6">
                    <div className="relative bg-gray-50 rounded-xl p-8 flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-h-64 max-w-full object-contain"
                      />
                      <button
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">{logoFile?.name}</p>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('logo-input')?.click()}
                  >
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-gray-600 font-medium mb-1">Húzd ide a logót vagy kattints</p>
                    <p className="text-sm text-gray-400">PNG, JPG vagy WebP, max 5MB</p>
                  </div>
                )}

                <input
                  id="logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            )}

            {/* STEP 3: Details */}
            {step === 'details' && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Adatok megadása</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logó neve <span className="text-gray-400">(opcionális)</span>
                  </label>
                  <input
                    type="text"
                    value={logoName}
                    onChange={e => setLogoName(e.target.value)}
                    placeholder="pl. Cégem logója"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Készítő neve
                  </label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={e => setCreatorName(e.target.value)}
                    placeholder="Neved vagy a tervező neve"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategória <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as Category)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none bg-white cursor-pointer"
                  >
                    <option value="">Válassz kategóriát...</option>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand színek <span className="text-gray-400">(opcionális, max 5)</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {brandColors.map(color => (
                      <button
                        key={color}
                        onClick={() => removeColor(color)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm group hover:bg-red-50"
                      >
                        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
                        <span className="text-gray-600 group-hover:text-red-600">{color}</span>
                        <svg className="w-3 h-3 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ))}
                    {brandColors.length < 5 && (
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm text-gray-500 cursor-pointer hover:bg-gray-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Szín hozzáadása
                        <input
                          type="color"
                          className="w-0 h-0 opacity-0 absolute"
                          onChange={(e) => addColor(e.target.value)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Confirm */}
            {step === 'confirm' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Összegzés</h2>

                <div className="space-y-4">
                  {/* Logo preview */}
                  {logoPreview && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-lg" />
                      <div>
                        <p className="font-medium text-gray-900">{logoName || 'Névtelen logó'}</p>
                        <p className="text-sm text-gray-500">{creatorName}</p>
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">Csomag</span>
                      <p className="font-medium text-gray-900">{selectedTier ? TIER_INFO[selectedTier].label : '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">Kategória</span>
                      <p className="font-medium text-gray-900">{category ? CATEGORIES[category] : '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">Ár</span>
                      <p className="font-medium text-gray-900">{selectedTier ? TIER_INFO[selectedTier].price : '-'}</p>
                    </div>
                    {brandColors.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-500">Színek</span>
                        <div className="flex gap-1 mt-1">
                          {brandColors.map(c => (
                            <div key={c} className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Free tier notice */}
                  {selectedTier === 'free' && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                      Az ingyenes elemzés publikus lesz a Logo galériában. Jóváhagyás után jelenik meg.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={step === 'tier' ? () => router.push('/dashboard') : goBack}
              className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {step === 'tier' ? 'Vissza' : 'Előző'}
            </button>

            {step === 'confirm' ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Elemzés indítása...
                  </span>
                ) : selectedTier === 'free' ? (
                  'Ingyenes elemzés indítása'
                ) : (
                  `Fizetés (${selectedTier ? TIER_INFO[selectedTier].price : ''})`
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext()}
                className="px-8 py-3 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Következő
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
