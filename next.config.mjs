/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'srdxtwzhsqqyxxkdinfi.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
    ],
  },
  experimental: {
    webpackBuildWorker: false,
  },
  async redirects() {
    return [
      // =========================================================================
      // 1. Account & Orders Unified Hub Consolidation (308 Permanent)
      // =========================================================================
      {
        source: '/orders',
        destination: '/account?tab=orders',
        permanent: true,
      },
      {
        source: '/wishlist',
        destination: '/account?tab=wishlist',
        permanent: true,
      },
      {
        source: '/addresses',
        destination: '/account?tab=addresses',
        permanent: true,
      },
      {
        source: '/tracking',
        destination: '/account?tab=tracking',
        permanent: true,
      },

      // =========================================================================
      // 2. Account Subroute Consolidation (308 Permanent)
      // =========================================================================
      {
        source: '/account/wishlist',
        destination: '/account?tab=wishlist',
        permanent: true,
      },
      {
        source: '/account/payments',
        destination: '/account?tab=payments',
        permanent: true,
      },
      {
        source: '/account/profile',
        destination: '/account?tab=profile',
        permanent: true,
      },
      {
        source: '/account/support',
        destination: '/account?tab=support',
        permanent: true,
      },

      // =========================================================================
      // 3. Category Slugs Canonicalization (308 Permanent)
      // =========================================================================
      {
        source: '/category/men-clothing',
        destination: '/category/mens-clothing',
        permanent: true,
      },
      {
        source: '/category/men-shoes',
        destination: '/category/mens-shoes',
        permanent: true,
      },
      {
        source: '/category/men-wallets',
        destination: '/category/mens-wallets',
        permanent: true,
      },
      {
        source: '/category/men-watches',
        destination: '/category/mens-watches',
        permanent: true,
      },
      {
        source: '/category/men',
        destination: '/fashion/men',
        permanent: true,
      },
      {
        source: '/category/jewellery',
        destination: '/category/womens-jewellery',
        permanent: true,
      },
      {
        source: '/category/jewelry',
        destination: '/category/womens-jewellery',
        permanent: true,
      },
      {
        source: '/category/eyewear',
        destination: '/category/womens-eyewear',
        permanent: true,
      },
      {
        source: '/category/sunglasses',
        destination: '/category/womens-eyewear',
        permanent: true,
      },
      {
        source: '/category/handbags',
        destination: '/category/handbags-clutches',
        permanent: true,
      },
      {
        source: '/category/clutches',
        destination: '/category/handbags-clutches',
        permanent: true,
      },
      {
        source: '/category/travel-luggage',
        destination: '/category/luggage',
        permanent: true,
      },
      {
        source: '/category/bags',
        destination: '/category/bags-backpacks',
        permanent: true,
      },
      {
        source: '/category/bags-luggage',
        destination: '/fashion/bags-luggage',
        permanent: true,
      },
      {
        source: '/category/bags-luggage/bags-backpacks',
        destination: '/category/bags-backpacks',
        permanent: true,
      },
      {
        source: '/category/bags-luggage/handbags-clutches',
        destination: '/category/handbags-clutches',
        permanent: true,
      },
      {
        source: '/category/bags-luggage/luggage',
        destination: '/category/luggage',
        permanent: true,
      },
      {
        source: '/category/kids',
        destination: '/fashion/kids',
        permanent: true,
      },
      {
        source: '/category/kids-boys-clothing',
        destination: '/category/boys-clothing',
        permanent: true,
      },
      {
        source: '/category/kids-girls-clothing',
        destination: '/category/girls-clothing',
        permanent: true,
      },
      {
        source: '/category/kids/boys-clothing',
        destination: '/category/boys-clothing',
        permanent: true,
      },
      {
        source: '/category/kids/girls-clothing',
        destination: '/category/girls-clothing',
        permanent: true,
      },
      {
        source: '/category/smartwatches',
        destination: '/category/watches#smartwatches',
        permanent: true,
      },
      {
        source: '/category/lingerie',
        destination: '/category/lingerie-sleep-lounge',
        permanent: true,
      },
      {
        source: '/category/womens-western-wear',
        destination: '/category/western-wear',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/api/(admin|vendor|orders|addresses|cart|checkout)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;
