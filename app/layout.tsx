import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { RealtimeProvider } from '@/hooks/useRealtime'
import { CartProvider } from '@/hooks/userCart'
import { ZodClientInit } from '@/app/components/ZodClientInit'
import DeferredPwaWidgets from '@/app/components/DeferredPwaWidgets'
import DiagnosticsListener from '@/app/components/DiagnosticsListener'
import GtmDeferred from '@/app/components/GtmDeferred'
import OnlineRefresh from '@/app/components/OnlineRefresh'
import RecentOrdersWidget from '@/app/components/RecentOrdersWidget'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport = {
  themeColor: '#163D2B',
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
  // Origine Supabase Storage (hero + catalogue) — calculée au build pour
  // ouvrir la connexion TLS avant même la découverte du <link rel="preload">.
  let supabaseOrigin: string | null = null
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    }
  } catch {}

  return (
    <html lang="fr" className={`${inter.variable} antialiased dark`}>
      <head>
        {/* Préconnexions critiques au LCP : évite 300-600 ms de DNS+TLS
            sur l'image hero (souvent Unsplash ou Supabase Storage). */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        {supabaseOrigin ? (
          <>
            <link rel="dns-prefetch" href={supabaseOrigin} />
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
          </>
        ) : null}
      </head>
      <body className="m-0 p-0">
        {/* Google Analytics : chargé SEULEMENT à la 1ʳᵉ interaction utilisateur
            (scroll/click/keydown) ou après 10 s d'inactivité. Libère ~215 ms de
            main thread pendant la fenêtre LCP et supprime le "User Timing" GTM
            de 3.6 s qui polluait le TBT. */}
        <GtmDeferred measurementId={GA_MEASUREMENT_ID} />

        {/* Zod v4 : jitless côté client (léger ; gardé synchrone pour éviter toute course aux formulaires) */}
        <ZodClientInit />

        {/* PWA + offline : bundle chargé après hydratation (réduit TBT) */}
        <DeferredPwaWidgets />

        {/* Erreurs JS / promises non gérées → Console [Mayombe] */}
        <DiagnosticsListener />

        {/* Rechargement automatique au retour en ligne après coupure réseau */}
        <OnlineRefresh />

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

        {/* Widget popup activité récente — visible sur toutes les pages */}
        <RecentOrdersWidget />
      </body>
    </html>
  )
}
