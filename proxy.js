import { NextResponse } from 'next/server';
import { siteLocales } from './src/i18n/site-language';

export default function proxy(request) {
  const requested = request.nextUrl.searchParams.get('lang');
  const locale = siteLocales.includes(requested) ? requested : 'it';
  const headers = new Headers(request.headers);
  headers.set('x-site-locale', locale);
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
