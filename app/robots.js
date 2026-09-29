/**
 * robots.txt dinamico:
 * - production: allow tutto + sitemap
 * - preview / dev: disallow tutto (no indexing fino al deploy in prod)
 */

const PROD_URL = 'https://emmeeffeservices.it';
const isProd = process.env.VERCEL_ENV === 'production';

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  PROD_URL;

export default function robots() {
  if (!isProd) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
