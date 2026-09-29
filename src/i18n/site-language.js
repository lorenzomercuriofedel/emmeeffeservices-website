export const siteLocales = ['it', 'en', 'de'];
export function siteHome(locale) {
  return locale === 'it' ? '/' : `/?lang=${locale}`;
}
export function weatherHome(locale) {
  return locale === 'it' ? '/meteo' : `/meteo/${locale}`;
}

// Keeps the current section, query filters and anchor, including future non-weather sections.
export function languageHref(pathname, search, locale, hash = '') {
  const query = new URLSearchParams(search);
  query.delete('lang');
  let path = pathname;
  if (pathname === '/meteo' || pathname.startsWith('/meteo/')) {
    const suffix = pathname.slice(6).replace(/^\/(en|de)(?=\/|$)/, '');
    path = weatherHome(locale) + suffix;
  } else if (locale !== 'it') query.set('lang', locale);
  const qs = query.toString();
  return `${path}${qs ? `?${qs}` : ''}${hash}`;
}
