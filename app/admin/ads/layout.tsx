import type { ReactNode } from 'react'

/** Évite qu’une vieille version HTML/edge soit servie pour cette route admin. */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminAdsLayout({ children }: { children: ReactNode }) {
    return children
}
