/**
 * Google Tag Manager dataLayer helper
 * Minden GTM event pusholás ezen keresztül megy.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export function pushToDataLayer(event: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({ event, ...data });
  }
}
