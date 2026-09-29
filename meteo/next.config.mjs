import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
