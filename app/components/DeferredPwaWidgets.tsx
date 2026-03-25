'use client'

import dynamic from 'next/dynamic'

const ServiceWorkerRegister = dynamic(() => import('@/app/components/ServiceWorkerRegister'), {
    ssr: false,
})
const OfflineBanner = dynamic(() => import('@/app/components/OfflineBanner'), { ssr: false })

/** PWA / offline : chargés uniquement côté client pour alléger le thread principal au premier paint. */
export default function DeferredPwaWidgets() {
    return (
        <>
            <ServiceWorkerRegister />
            <OfflineBanner />
        </>
    )
}
