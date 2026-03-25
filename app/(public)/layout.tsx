import { Suspense } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import CategoryBar from '../components/CategoryBar'
import DeferredShopStoriesRow from '../components/DeferredShopStoriesRow'
import DeferredCookieConsent from '../components/DeferredCookieConsent'
import { Toaster } from 'sonner'

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />

            {/* On enveloppe CategoryBar dans un Suspense car il utilise useSearchParams.
                Cela permet au reste du layout de charger même si les paramètres
                d'URL ne sont pas encore prêts.
            */}
            <Suspense fallback={<div className="h-16 bg-white dark:bg-slate-950 animate-pulse" />}>
                <CategoryBar />
            </Suspense>

            <DeferredShopStoriesRow />

            <main className="min-h-screen">
                {children}
            </main>

            <Footer />
            <DeferredCookieConsent />
        </>
    )
}
