export const dynamic = 'force-dynamic';

const PROD_URL = 'https://emmeeffeservices.it';

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  PROD_URL;

export default function sitemap() {
  const lastModified = new Date();
  const companyLanguages = { it: `${baseUrl}/`, en: `${baseUrl}/?lang=en`, de: `${baseUrl}/?lang=de` };
  const companyEntries = Object.values(companyLanguages).map((url) => ({
    url, lastModified, changeFrequency: 'monthly', priority: 1,
    alternates: { languages: { ...companyLanguages, 'x-default': `${baseUrl}/` } },
  }));
  const legalEntries = ['/privacy', '/cookie'].map(path => ({ url: `${baseUrl}${path}`, lastModified, changeFrequency: 'yearly', priority: 0.3 }));
  return [...legalEntries, ...companyEntries];
}
