import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.emmeeffeservices.it' }],
        destination: 'https://emmeeffeservices.it/:path*',
        permanent: true,
      },
      { source: '/contatti', destination: '/meteo/contatti', permanent: true },
      { source: '/stazione/:path*', destination: '/meteo/stazione/:path*', permanent: true },
      { source: '/it/:path*', destination: '/meteo/:path*', permanent: true },
      { source: '/en/:path*', destination: '/meteo/en/:path*', permanent: true },
      { source: '/de/:path*', destination: '/meteo/de/:path*', permanent: true },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Cache lunga per le immagini ottimizzate dall'Image Optimizer
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'www.meteotrentinoaltoadige.it' },
      { protocol: 'https', hostname: 'www.vololiberotrentino.it' },
    ],
  },
  async headers() {
    return [
      {
        // Asset statici serviti direttamente da /public (immagini, icone meteo)
        source: '/:dir(images|icons)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
