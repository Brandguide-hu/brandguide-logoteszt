'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'cookie_consent';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface CookieConsentContextType {
  /** Whether the user has made a consent choice */
  consentGiven: boolean;
  /** Analytics cookies (GA4) */
  analytics: boolean;
  /** Marketing cookies (Meta Pixel, Google Ads) */
  marketing: boolean;
  /** Whether the consent modal should be shown */
  showModal: boolean;
  /** Accept all cookies */
  acceptAll: () => void;
  /** Reject all optional cookies */
  rejectAll: () => void;
  /** Save custom consent preferences */
  updateConsent: (analytics: boolean, marketing: boolean) => void;
  /** Open the consent settings modal */
  openSettings: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

function updateGtagConsent(analytics: boolean, marketing: boolean) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;
  gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const state: ConsentState = {
    analytics,
    marketing,
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Load saved consent on mount
  useEffect(() => {
    const saved = loadConsent();
    if (saved) {
      setAnalytics(saved.analytics);
      setMarketing(saved.marketing);
      setConsentGiven(true);
      setShowModal(false);
    } else {
      setShowModal(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    setAnalytics(true);
    setMarketing(true);
    setConsentGiven(true);
    setShowModal(false);
    saveConsent(true, true);
    updateGtagConsent(true, true);
  }, []);

  const rejectAll = useCallback(() => {
    setAnalytics(false);
    setMarketing(false);
    setConsentGiven(true);
    setShowModal(false);
    saveConsent(false, false);
    updateGtagConsent(false, false);
  }, []);

  const updateConsent = useCallback((newAnalytics: boolean, newMarketing: boolean) => {
    setAnalytics(newAnalytics);
    setMarketing(newMarketing);
    setConsentGiven(true);
    setShowModal(false);
    saveConsent(newAnalytics, newMarketing);
    updateGtagConsent(newAnalytics, newMarketing);
  }, []);

  const openSettings = useCallback(() => {
    setShowModal(true);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consentGiven,
        analytics,
        marketing,
        showModal,
        acceptAll,
        rejectAll,
        updateConsent,
        openSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}
