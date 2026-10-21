import { headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { siteLocales } from './site-language';

export default getRequestConfig(async () => {
  const requested = (await headers()).get('x-site-locale');
  const locale = siteLocales.includes(requested) ? requested : 'it';
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
