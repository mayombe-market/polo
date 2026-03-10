import './globals.css' // Assure-toi que ce fichier existe et contient @tailwind directives
import { Inter } from 'next/font/google'
import { CartProvider } from '@/hooks/userCart'
import Script from 'next/script'
import ServiceWorkerRegister from '@/app/components/ServiceWorkerRegister'

const inter = Inter({ subsets: ['latin'] })

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
    icon: '/favicon.ico',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      {process.env.NEXT_PUBLIC_GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}
          </Script>
        </>
      )}
      <body className={`${inter.className} m-0 p-0`}>
        {/* SPLASH SCREEN — rendu en HTML pur, disparaît une fois l'app chargée */}
        <div id="splash-screen">
          <div className="splash-logo">
            <img src="/logo.png" alt="Mayombe Market" width={88} height={46} />
          </div>
          <div className="splash-title">Mayombe Market</div>
          <div className="splash-subtitle">Mode & Lifestyle au Congo</div>
          <div className="splash-loader"></div>
        </div>
        <Script id="splash-dismiss" strategy="afterInteractive">
          {`
            (function() {
              var splash = document.getElementById('splash-screen');
              if (!splash) return;
              // Attendre que la page soit complètement rendue
              function hideSplash() {
                splash.classList.add('splash-hidden');
                setTimeout(function() { splash.remove(); }, 600);
              }
              // Minimum 1.2s d'affichage pour que ce soit joli, max 4s
              var minDelay = setTimeout(function() {
                if (document.readyState === 'complete') hideSplash();
                else window.addEventListener('load', hideSplash);
              }, 1200);
              // Timeout de sécurité : toujours cacher après 4s
              setTimeout(hideSplash, 4000);
            })();
          `}
        </Script>

        {/* ENTÊTE : UNIQUEMENT LE DRAPEAU DU CONGO */}
        <header className="w-full h-4 sticky top-0 z-50 shadow-sm">
          <div className="w-full h-full" style={{
            background: `linear-gradient(135deg,
                  #009543 0%, #009543 45%,
                  #FBDE4A 45%, #FBDE4A 55%,
                  #DC241F 55%, #DC241F 100%)`
          }}></div>
        </header>

        {/* SERVICE WORKER PWA */}
        <ServiceWorkerRegister />

        {/* CONTENU DE LA PAGE */}
        <CartProvider>
          <main>
            {children}
          </main>
        </CartProvider>
      </body>
    </html>
  )
}