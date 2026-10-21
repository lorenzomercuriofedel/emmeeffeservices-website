export const siteLocales = ['it', 'en', 'de'];
export function siteHome(locale) {
  return locale === 'it' ? '/' : `/?lang=${locale}`;
}

// Preserve the current page, filters and anchor when switching language.
export function languageHref(pathname, search, locale, hash = '') {
  const query = new URLSearchParams(search);
  query.delete('lang');
  if (locale !== 'it') query.set('lang', locale);
  const qs = query.toString();
  return `${pathname}${qs ? `?${qs}` : ''}${hash}`;
}
