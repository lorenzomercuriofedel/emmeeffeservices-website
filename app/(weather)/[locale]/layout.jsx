import { WEATHER_TITLE } from '@/src/utils/seo';
import '../../globals.css';
import { Manrope, Fraunces } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import CookieNotice from '@/src/components/legal/CookieNotice';

const PROD_URL = 'https://emmeeffeservices.it';
const isProd = process.env.VERCEL_ENV === 'production';

// Font self-hosted via next/font (no render-blocking, preload e cache immutabile)
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Mappa locale → tag OpenGraph
const OG_LOCALE = { it: 'it_IT', en: 'en_US', de: 'de_DE' };

// Home path per ciascuna lingua (per canonical + hreflang)
const HOME_PATH = { it: '/meteo', en: '/meteo/en', de: '/meteo/de' };

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  PROD_URL;

const KEYWORDS = [
  'emme-effe meteo',
];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: WEATHER_TITLE,
      template: `%s | ${WEATHER_TITLE}`,
    },
    description: t('description'),
    keywords: KEYWORDS,
    authors: [{ name: 'Lorenzo Mercurio Fedel' }],
    creator: 'Rhaeticon',
    publisher: 'emme-effe meteo',
    alternates: {
      canonical: HOME_PATH[locale],
      languages: { it: '/meteo', en: '/meteo/en', de: '/meteo/de', 'x-default': '/meteo' },
    },
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale],
      url: new URL(HOME_PATH[locale], baseUrl).toString(),
      siteName: 'emme-effe meteo',
      title: WEATHER_TITLE,
      description: t('ogDescription'),
    },
    twitter: {
      card: 'summary_large_image',
      title: WEATHER_TITLE,
      description: t('twitterDescription'),
    },
    robots: isProd
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false, noimageindex: true },
        },
    category: 'weather',
  };
}

const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${baseUrl}/meteo/#organization`,
  name: 'emme-effe meteo',
  url: `${baseUrl}/meteo`,
  logo: `${baseUrl}/company/emme_effe__logouff.png`,
  description:
    "Portale meteorologico amatoriale che raccoglie rilevazioni in tempo reale dall'Altopiano di Piné (TN) dal 2014.",
  founder: { '@type': 'Person', name: 'Lorenzo Mercurio Fedel' },
  areaServed: {
    '@type': 'Place',
    name: 'Altopiano di Piné',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Trentino-Alto Adige',
      addressCountry: 'IT',
    },
  },
};

const jsonLdWebSite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${baseUrl}/meteo/#website`,
  url: `${baseUrl}/meteo`,
  name: 'emme-effe meteo',
  inLanguage: 'it-IT',
  publisher: { '@id': `${baseUrl}/meteo/#organization` },
  creator: {
    '@type': 'Organization',
    name: 'Rhaeticon',
    url: 'https://www.rhaeticon.it',
    description: 'Web agency delle Dolomiti.',
  },
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const webSiteLd = { ...jsonLdWebSite, inLanguage: locale };

  return (
    <html lang={locale} className={`${manrope.variable} ${fraunces.variable}`}>
      <head>
        <link rel="icon" href="data:," />
        <meta name="theme-color" content="#0a2942" />
      </head>
      <body className="flex flex-col min-h-screen">
        <NextIntlClientProvider>
          <Navbar section="meteo" />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>

        {/* JSON-LD strutturato (Google lo legge ovunque nel documento) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteLd) }}
        />

        <CookieNotice locale={locale} />
      </body>
    </html>
  );
}
