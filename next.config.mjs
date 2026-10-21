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
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Cache lunga per le immagini ottimizzate dall'Image Optimizer
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        // Asset aziendali serviti direttamente da /public
        source: '/company/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
