import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['it', 'en', 'de'],
  defaultLocale: 'it',
  localePrefix: {
    mode: 'always',
    prefixes: { it: '/meteo', en: '/meteo/en', de: '/meteo/de' },
  },
});
