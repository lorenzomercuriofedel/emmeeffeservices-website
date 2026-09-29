import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Esclude API, asset interni di Next/Vercel e file con estensione (immagini, ecc.)
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
