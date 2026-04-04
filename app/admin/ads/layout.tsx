import type { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Pubs — Admin',
    description: 'Bannières site et campagnes vendeurs.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminAdsLayout({ children }: { children: ReactNode }) {
    return children
}
