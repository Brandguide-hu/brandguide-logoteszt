'use client';

import Script from 'next/script';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/**
 * Google Consent Mode v2 default + GTM loader
 * A consent default MINDIG "denied" — a CookieConsentProvider frissíti elfogadáskor.
 * Ha localStorage-ban van mentett consent, azt azonnal alkalmazzuk.
 */
export function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      {/* 1. Consent Mode v2 defaults — MUST run before GTM */}
      <Script
        id="gtm-consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            window.gtag = function(){dataLayer.push(arguments);};
            window.gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied',
              'functionality_storage': 'granted',
              'security_storage': 'granted',
              'wait_for_update': 500
            });
            // Restore saved consent from localStorage
            try {
              var saved = localStorage.getItem('cookie_consent');
              if (saved) {
                var c = JSON.parse(saved);
                window.gtag('consent', 'update', {
                  'analytics_storage': c.analytics ? 'granted' : 'denied',
                  'ad_storage': c.marketing ? 'granted' : 'denied',
                  'ad_user_data': c.marketing ? 'granted' : 'denied',
                  'ad_personalization': c.marketing ? 'granted' : 'denied'
                });
              }
            } catch(e) {}
          `,
        }}
      />
      {/* 2. GTM script loader */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
    </>
  );
}

export function GoogleTagManagerNoscript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
