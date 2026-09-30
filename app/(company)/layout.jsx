import { SITE_TITLE } from '@/src/utils/seo';
import './company.css';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

const companyMetadata = {
  metadataBase: new URL('https://emmeeffeservices.it'),
  title: SITE_TITLE,
  description: 'Analisi di dati meteo-climatici, ambientali, catastali e storici. Analisi fondiarie, mappe e report. Emme-Effe Services di Lorenzo Mercurio Fedel, a Miola, Baselga di Piné, Trentino.',
  alternates: { canonical: '/' },
  openGraph: {
    title: SITE_TITLE,
    description: 'Competenze informatiche e conoscenza del territorio. Analisi dati e analisi fondiarie dal cuore del Trentino.',
    siteName: 'Emme-Effe Services di Lorenzo Mercurio Fedel',
    type: 'website', locale: 'it_IT', url: '/',
  },
};

export const viewport = { themeColor: '#224f8b' };

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations('company');
  const languages = { it: '/', en: '/?lang=en', de: '/?lang=de', 'x-default': '/' };
  return { ...companyMetadata, description: t('intro'), alternates: { canonical: languages[locale], languages },
    openGraph: { ...companyMetadata.openGraph, description: t('intro'), locale: { it: 'it_IT', en: 'en_US', de: 'de_DE' }[locale], url: languages[locale] } };
}

export default async function CompanyLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return <html lang={locale}><head><link rel="icon" href="data:," /></head><body><NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider></body></html>;
}
