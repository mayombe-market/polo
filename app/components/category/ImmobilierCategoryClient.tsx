'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState, useEffect, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import RealEstateCard from '@/app/components/RealEstateCard'
import ImmobilierFilters, {
    type ImmoChipCity,
    type ImmoChipOffer,
} from '@/app/components/ImmobilierFilters'
import { parseListingExtras } from '@/lib/realEstateListing'

const IMMO_SUBS = [
    'Terrains & Parcelles',
    'Maisons & Villas (Vente)',
    'Locations (Maisons, Studios, Chambres)',
    'Commerces & Bureaux (Magasins à louer)',
] as const

type Props = {
    category: { id: string; name: string; sub_category?: { id: string; name: string }[] }
    products: any[]
    categoryName: string
    selectedSub: string | null
    immoSubCounts: Record<string, number>
    immoTotal: number
}

function applyImmoChips(products: any[], chipCity: ImmoChipCity, chipOffer: ImmoChipOffer) {
    return products.filter((p) => {
        const ex = parseListingExtras(p.listing_extras)
        if (chipOffer) {
            if (!ex || ex.offerType !== chipOffer) return false
        }
        if (chipCity) {
            if (!ex?.city) return false
            const c = ex.city.toLowerCase()
            if (chipCity === 'brazzaville') return c.includes('brazzaville')
            if (chipCity === 'pointe-noire') {
                return c.includes('pointe-noire') || c.includes('pointe noire') || c.includes('p.-noire')
            }
        }
        return true
    })
}

function filterByTextQuery(products: any[], q: string) {
    const needle = q.trim().toLowerCase()
    if (!needle) return products
    return products.filter((p) => {
        const extras = parseListingExtras(p.listing_extras)
        const city = extras?.city?.toLowerCase() ?? ''
        const district = extras?.district?.toLowerCase() ?? ''
        const name = (p.name || '').toLowerCase()
        const sub = (p.subcategory || '').toLowerCase()
        return (
            city.includes(needle) ||
            district.includes(needle) ||
            name.includes(needle) ||
            sub.includes(needle)
        )
    })
}

export default function ImmobilierCategoryClient({
    category,
    products,
    categoryName,
    selectedSub,
    immoSubCounts,
    immoTotal,
}: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const qParam = searchParams.get('q') || ''

    const [q, setQ] = useState(qParam)
    const [subSelect, setSubSelect] = useState<string>(() => selectedSub || '')
    const [chipCity, setChipCity] = useState<ImmoChipCity>(null)
    const [chipOffer, setChipOffer] = useState<ImmoChipOffer>(null)

    useEffect(() => {
        setQ(qParam)
    }, [qParam])
    useEffect(() => {
        setSubSelect(selectedSub || '')
    }, [selectedSub])

    const stats = useMemo(() => {
        return IMMO_SUBS.map((name) => ({
            name,
            count: immoSubCounts[name] ?? 0,
        }))
    }, [immoSubCounts])

    const filteredProducts = useMemo(() => {
        let list = applyImmoChips(products, chipCity, chipOffer)
        list = filterByTextQuery(list, qParam)
        return list
    }, [products, chipCity, chipOffer, qParam])

    const encodedCat = encodeURIComponent(categoryName)

    const onSearch = useCallback(
        (e: FormEvent) => {
            e.preventDefault()
            const params = new URLSearchParams()
            if (subSelect.trim()) params.set('sub', subSelect.trim())
            if (q.trim()) params.set('q', q.trim())
            const qs = params.toString()
            router.push(qs ? `/category/${encodedCat}?${qs}` : `/category/${encodedCat}`)
        },
        [router, encodedCat, subSelect, q],
    )

    return (
        <>
            <section className="w-full bg-gradient-to-br from-[#0C447C] via-[#185FA5] to-[#378ADD] px-4 py-8 text-white sm:py-10 md:py-12">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="mb-4 inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/95 sm:text-[11px]">
                        Immobilier au Congo
                    </p>
                    <h1 className="text-3xl font-light tracking-tight text-white md:text-4xl">Trouvez votre bien idéal</h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-white/75 md:text-base">
                        Maisons, terrains, appartements — Brazzaville & Pointe-Noire
                    </p>
                </div>

                <form
                    onSubmit={onSearch}
                    className="mx-auto mt-8 max-w-2xl rounded-xl bg-white p-4 shadow-xl dark:bg-white"
                    role="search"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
                        <label className="sr-only" htmlFor="immo-q">
                            Quartier, ville
                        </label>
                        <input
                            id="immo-q"
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Quartier, ville..."
                            className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                        />

                        <label className="sr-only" htmlFor="immo-sub">
                            Type de bien
                        </label>
                        <select
                            id="immo-sub"
                            value={subSelect}
                            onChange={(e) => setSubSelect(e.target.value)}
                            className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 sm:min-w-[200px] sm:flex-1"
                        >
                            <option value="">Tous les types de biens</option>
                            {IMMO_SUBS.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="min-h-[44px] w-full shrink-0 rounded-lg bg-[#185FA5] px-6 text-sm font-semibold text-white transition hover:bg-[#144d88] sm:w-auto"
                        >
                            Rechercher
                        </button>
                    </div>
                </form>

                <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-6 gap-y-4 text-center sm:gap-8">
                    {stats.map(({ name, count }) => (
                        <div key={name} className="min-w-[120px] px-2">
                            <p className="text-2xl font-bold tabular-nums text-white md:text-3xl">{count}</p>
                            <p className="mt-1 text-[10px] font-medium leading-tight text-white/80 sm:text-xs">{name}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="mx-auto w-full max-w-7xl flex-grow px-4 py-12">
                <nav className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Link href="/" className="transition-colors hover:text-green-600 dark:hover:text-green-500">
                        Accueil
                    </Link>{' '}
                    / {category.name}
                </nav>

                <ImmobilierFilters
                    categoryName={categoryName}
                    subCategories={category.sub_category}
                    selectedSub={selectedSub}
                    subCounts={immoSubCounts}
                    totalCount={immoTotal}
                    chipCity={chipCity}
                    chipOffer={chipOffer}
                    onChipCity={setChipCity}
                    onChipOffer={setChipOffer}
                />

                <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts && filteredProducts.length > 0 ? (
                        filteredProducts.map((p: any) => <RealEstateCard key={p.id} product={p} />)
                    ) : (
                        <div className="col-span-full py-32 text-center">
                            <div className="mb-4 text-5xl">📦</div>
                            <p className="font-medium italic text-slate-400">
                                Aucun article trouvé dans &quot;{selectedSub || category.name}&quot;.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
