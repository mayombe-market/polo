/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    images: {
        /**
         * Désactive l’optimizer Vercel (`/_next/image`) pour tout `next/image` restant.
         * L’app utilise surtout des `<img>` directs (Supabase / Cloudinary / URLs externes).
         */
        unoptimized: true,
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200],
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        remotePatterns: [
            { protocol: 'https', hostname: '*.unsplash.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'ui-avatars.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: 'res.cloudinary.com' },
        ],
    },
    async headers() {
        const noStoreCatalog = [
            {
                key: 'Cache-Control',
                value: 'private, no-cache, no-store, must-revalidate',
            },
        ]
        return [
            // Pages publiques dynamiques (liste produits, RSC ?_rsc=…) : limiter les 304 fantômes au refresh.
            { source: '/', headers: noStoreCatalog },
            { source: '/search', headers: noStoreCatalog },
            { source: '/feed', headers: noStoreCatalog },
            { source: '/category/:path*', headers: noStoreCatalog },
            { source: '/sub_category/:path*', headers: noStoreCatalog },
            { source: '/product/:path*', headers: noStoreCatalog },
            { source: '/store/:path*', headers: noStoreCatalog },
            {
                source: '/(.*)',
                headers: [
                    // Audit sécurité : alignés avec proxy.ts (CSP reste uniquement côté proxy).
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
                    },
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    // CSP : uniquement dans proxy.ts (getContentSecurityPolicy) pour éviter
                    // deux politiques qui s’intersectent et bloquent Cloudflare / polices self-hosted.
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
