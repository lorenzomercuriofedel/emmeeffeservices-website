import { fetchStations } from '@/src/services/api';
import { routing } from '@/src/i18n/routing';

const PROD_URL = 'https://www.meteopine.it';

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  PROD_URL;

// Costruisce l'URL assoluto per una pagina in una data lingua (it senza prefisso).
function urlFor(locale, path) {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const suffix = path === '/' ? '' : path;
  const p = `${prefix}${suffix}` || '/';
  return `${baseUrl}${p}`;
}

// Mappa hreflang (tutte le lingue + x-default) per una pagina.
function languagesFor(path) {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, urlFor(locale, path)])
  );
  languages['x-default'] = urlFor(routing.defaultLocale, path);
  return languages;
}

// Genera un'entry per ogni lingua, ciascuna con gli alternates hreflang.
function localizedEntries(path, { lastModified, changeFrequency, priority }) {
  const languages = languagesFor(path);
  return routing.locales.map((locale) => ({
    url: urlFor(locale, path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap() {
  const lastModified = new Date();

  const staticPaths = [
    { path: '/', changeFrequency: 'hourly', priority: 1.0 },
    { path: '/contatti', changeFrequency: 'yearly', priority: 0.4 },
  ];

  let stations = [];
  try {
    stations = await fetchStations();
  } catch {
    stations = [];
  }

  const stationPaths = stations.map((s) => ({
    path: `/stazione/${s.id}`,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  return [...staticPaths, ...stationPaths].flatMap(({ path, changeFrequency, priority }) =>
    localizedEntries(path, { lastModified, changeFrequency, priority })
  );
}
