import { Suspense } from 'react'
import type { Metadata } from 'next'
import SearchPageClient from './SearchPageClient'
import { sanitizeSearchQueryForDisplay } from '@/lib/sanitizeUserDisplay'

type SearchPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const sp = await searchParams
    const raw = sp.q
    const q = typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : ''
    const safe = sanitizeSearchQueryForDisplay(q)
    if (safe) {
        return { title: `Recherche : ${safe}` }
    }
    return { title: 'Recherche & catalogue' }
}

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 animate-pulse text-xs">
                    Chargement de l&apos;univers Mayombe...
                </div>
            }
        >
            <SearchPageClient />
        </Suspense>
    )
}
