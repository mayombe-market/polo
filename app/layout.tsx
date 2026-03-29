import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { RealtimeProvider } from '@/hooks/useRealtime'
import { CartProvider } from '@/hooks/userCart'
import Script from 'next/script'
import { ZodClientInit } from '@/app/components/ZodClientInit'
import DeferredPwaWidgets from '@/app/components/DeferredPwaWidgets'
import DiagnosticsListener from '@/app/components/DiagnosticsListener'

export const viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata = {
  title: {
    default: 'Mayombe Market — Mode, Beauté & Lifestyle au Congo',
    template: '%s | Mayombe Market',
  },
  description: 'Marketplace congolaise : mode, beauté, accessoires et lifestyle. Achetez local, soutenez les entrepreneurs du Congo-Brazzaville.',
  metadataBase: new URL('https://mayombe-market.com'),
  openGraph: {
    type: 'website',
    locale: 'fr_CG',
    url: 'https://mayombe-market.com',
    siteName: 'Mayombe Market',
    title: 'Mayombe Market — Mode, Beauté & Lifestyle au Congo',
    description: 'Marketplace congolaise : mode, beauté, accessoires et lifestyle. Achetez local, soutenez les entrepreneurs du Congo-Brazzaville.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mayombe Market',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mayombe Market — Mode, Beauté & Lifestyle au Congo',
    description: 'Marketplace congolaise : mode, beauté, accessoires et lifestyle.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://mayombe-market.com',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mayombe Market',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || 'G-SLRPK4NETV'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="antialiased font-sans">
      <head>
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
      </head>
      <body className="m-0 p-0">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`}
        </Script>

        {/* Zod v4 : jitless côté client (léger ; gardé synchrone pour éviter toute course aux formulaires) */}
        <ZodClientInit />

        {/* ENTÊTE : UNIQUEMENT LE DRAPEAU DU CONGO */}
        <header className="w-full h-4 sticky top-0 z-50 shadow-sm">
          <div className="w-full h-full" style={{
            background: `linear-gradient(135deg,
                  #009543 0%, #009543 45%,
                  #FBDE4A 45%, #FBDE4A 55%,
                  #DC241F 55%, #DC241F 100%)`
          }}></div>
        </header>

        {/* PWA + offline : bundle chargé après hydratation (réduit TBT) */}
        <DeferredPwaWidgets />

        {/* Erreurs JS / promises non gérées → Console [Mayombe] */}
        <DiagnosticsListener />

        {/* CONTENU DE LA PAGE */}
        <AuthProvider>
          <RealtimeProvider>
            <CartProvider>
              <main>
                {children}
              </main>
            </CartProvider>
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
