'use client'

import { usePathname } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'
import BottomNav from '../components/BottomNav'
import DeferredCookieConsent from '../components/DeferredCookieConsent'
import { Toaster } from 'sonner'

function isCheckoutTunnelPath(pathname: string | null): boolean {
    if (!pathname) return false
    if (pathname === '/cart' || pathname === '/checkout') return true
    return pathname.startsWith('/checkout/')
}

function isPatisserieShopPath(pathname: string | null): boolean {
    if (!pathname) return false
    return /^\/patisserie\/[^/]+/.test(pathname)
}

export default function PublicLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const tunnel = isCheckoutTunnelPath(pathname)
    const isLanding = pathname === '/'
    const isPatisserieShop = isPatisserieShopPath(pathname)

    // Pages qui n'ont pas besoin de padding bas pour la BottomNav
    const noBottomPad = tunnel || isPatisserieShop

    return (
        <>
            {!isLanding && <Header />}
            <Toaster position="top-right" richColors closeButton />

            <main className={`min-h-screen${noBottomPad ? '' : ' pb-20'}`}>{children}</main>

            {!tunnel && !isLanding && <Footer />}
            <BottomNav />
            <DeferredCookieConsent />
        </>
    )
}
