'use client'

import { usePathname } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'
import DeferredCookieConsent from '../components/DeferredCookieConsent'
import { Toaster } from 'sonner'

function isCheckoutTunnelPath(pathname: string | null): boolean {
    if (!pathname) return false
    if (pathname === '/cart' || pathname === '/checkout') return true
    return pathname.startsWith('/checkout/')
}

export default function PublicLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const tunnel = isCheckoutTunnelPath(pathname)

    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />

            <main className="min-h-screen bg-white">{children}</main>

            {!tunnel && <Footer />}
            <DeferredCookieConsent />
        </>
    )
}
