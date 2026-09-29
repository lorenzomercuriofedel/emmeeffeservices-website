import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from './src/i18n/routing';
import { siteLocales } from './src/i18n/site-language';

const weatherMiddleware = createMiddleware(routing);
export default function proxy(request) {
  const path = request.nextUrl.pathname;
  if (path === '/meteo' || path.startsWith('/meteo/')) return weatherMiddleware(request);
  const requested = request.nextUrl.searchParams.get('lang');
  const locale = siteLocales.includes(requested) ? requested : 'it';
  const headers = new Headers(request.headers);
  headers.set('x-site-locale', locale);
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
