import './globals.css' // Assure-toi que ce fichier existe et contient @tailwind directives
import { Inter } from 'next/font/google'
import { CartProvider } from '@/hooks/userCart'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

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
    apple: '/logo.png',
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
        {/* ENTÊTE : UNIQUEMENT LE DRAPEAU DU CONGO */}
        <header className="w-full h-4 sticky top-0 z-50 shadow-sm">
          <div className="w-full h-full" style={{
            background: `linear-gradient(135deg,
                  #009543 0%, #009543 45%,
                  #FBDE4A 45%, #FBDE4A 55%,
                  #DC241F 55%, #DC241F 100%)`
          }}></div>
        </header>

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