'use client';

import { useEffect } from 'react';

// Carica la Cookie Solution di iubenda dopo l'hydration (in useEffect): nessun
// render lato server, nessuna mutazione dell'<head> prima di React → niente hydration mismatch.
export default function IubendaConsent({ locale }) {
  useEffect(() => {
    window._iub = window._iub || [];
    window._iub.csConfiguration = {
      cookiePolicyId: 17001218,
      siteId: 3824235,
      timeoutLoadConfiguration: 30000,
      lang: locale,
      enableTcf: true,
      tcfVersion: 2,
      tcfPurposes: {
        2: 'consent_only', 3: 'consent_only', 4: 'consent_only',
        5: 'consent_only', 6: 'consent_only', 7: 'consent_only',
        8: 'consent_only', 9: 'consent_only', 10: 'consent_only',
      },
      invalidateConsentWithoutLog: true,
      googleAdditionalConsentMode: true,
      consentOnContinuedBrowsing: false,
      banner: {
        position: 'top',
        acceptButtonDisplay: true,
        customizeButtonDisplay: true,
        closeButtonDisplay: true,
        closeButtonRejects: true,
        fontSizeBody: '14px',
      },
    };

    const load = (src) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      document.body.appendChild(s);
    };
    load('https://cdn.iubenda.com/cs/tcf/stub-v2.js');
    load('https://cdn.iubenda.com/cs/iubenda_cs.js');
  }, [locale]);

  return null;
}
