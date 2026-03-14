/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200],
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        remotePatterns: [
            { protocol: 'https', hostname: '*.unsplash.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'ui-avatars.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
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
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "img-src 'self' data: blob: https://*.unsplash.com https://images.unsplash.com https://ui-avatars.com https://*.supabase.co https://www.googletagmanager.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.googletagmanager.com",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; '),
                    },
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
