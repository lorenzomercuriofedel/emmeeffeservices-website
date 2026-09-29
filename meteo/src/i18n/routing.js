import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['it', 'en', 'de'],
  defaultLocale: 'it',
  // L'italiano resta sugli URL attuali (/, /contatti, …) senza prefisso;
  // inglese e tedesco vengono prefissati (/en, /de) — SEO esistente preservata.
  localePrefix: 'as-needed',
});
