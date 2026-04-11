'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState, useEffect, type CSSProperties, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import RealEstateCard from '@/app/components/RealEstateCard'
import ImmobilierFilters, {
    type ImmoChipCity,
    type ImmoChipOffer,
} from '@/app/components/ImmobilierFilters'
import { parseListingExtras, IMMO_SUBCATEGORY_HEADERS } from '@/lib/realEstateListing'

const IMMO_SUBS = [
    'Maisons',
    'Appartements',
    'Terrains',
    'Luxe',
    'Hôtels',
    'Villas',
    'Locations',
] as const

/**
 * Anciennes sous-catégories supprimées côté DB (seed v1). On les filtre côté
 * client par sécurité au cas où elles traînent encore dans Supabase le temps
 * que le user exécute le SQL de cleanup.
 */
const IMMO_SUBS_BLOCKLIST = new Set<string>([
    'Terrains & Parcelles',
    'Maisons & Villas (Vente)',
    'Locations (Maisons, Studios, Chambres)',
    'Commerces & Bureaux (Magasins à louer)',
])

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

/** Filtre budget / chambres / surface — appliqué après chips + recherche. */
function applyAdvancedFilters(
    products: any[],
    budgetMin: string,
    budgetMax: string,
    minBedrooms: string,
    surfaceMin: string,
) {
    const minP = budgetMin.trim() === '' ? null : Number(budgetMin)
    const maxP = budgetMax.trim() === '' ? null : Number(budgetMax)
    const minBed =
        minBedrooms.trim() === '' ? null : Number.parseInt(minBedrooms, 10)
    const minSurf = surfaceMin.trim() === '' ? null : Number(surfaceMin)

    return products.filter((p) => {
        const price = Number(p.price)
        if (minP !== null && !Number.isNaN(minP) && price < minP) return false
        if (maxP !== null && !Number.isNaN(maxP) && price > maxP) return false

        if (minBed !== null && !Number.isNaN(minBed)) {
            const ex = parseListingExtras(p.listing_extras)
            const beds = ex?.bedrooms
            if (beds == null || Number(beds) < minBed) return false
        }

        if (minSurf !== null && !Number.isNaN(minSurf)) {
            const ex = parseListingExtras(p.listing_extras)
            const surf = ex?.surfaceValue
            if (surf == null || Number(surf) < minSurf) return false
        }

        return true
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
    /** Filtre > 5 M FCFA (bannière « Biens de prestige »). */
    const [prestigeFilter, setPrestigeFilter] = useState(false)

    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
    const [budgetMin, setBudgetMin] = useState('')
    const [budgetMax, setBudgetMax] = useState('')
    /** Valeur numérique min (1–5) ou '' = pas de filtre chambres. */
    const [minBedrooms, setMinBedrooms] = useState('')
    const [surfaceMin, setSurfaceMin] = useState('')

    useEffect(() => {
        setQ(qParam)
    }, [qParam])
    useEffect(() => {
        setSubSelect(selectedSub || '')
    }, [selectedSub])

    // `stats` n'est plus affiché dans le hero (on a retiré la rangée de compteurs
    // redondante) mais on garde le mapping pour le <select> qui doit rester trié
    // selon l'ordre canonique IMMO_SUBS.
    void IMMO_SUBS

    const filteredProducts = useMemo(() => {
        let list = applyImmoChips(products, chipCity, chipOffer)
        list = filterByTextQuery(list, qParam)
        return list
    }, [products, chipCity, chipOffer, qParam])

    const afterAdvancedFilters = useMemo(
        () => applyAdvancedFilters(filteredProducts, budgetMin, budgetMax, minBedrooms, surfaceMin),
        [filteredProducts, budgetMin, budgetMax, minBedrooms, surfaceMin],
    )

    const displayProducts = useMemo(() => {
        if (!prestigeFilter) return afterAdvancedFilters
        return afterAdvancedFilters.filter((p) => Number(p.price) > 5_000_000)
    }, [afterAdvancedFilters, prestigeFilter])

    const resetAdvancedFilters = useCallback(() => {
        setBudgetMin('')
        setBudgetMax('')
        setMinBedrooms('')
        setSurfaceMin('')
    }, [])

    const encodedCat = encodeURIComponent(categoryName)

    /** Remet chips, filtres avancés, prestige et efface la recherche URL (`q`). */
    const resetAllFilters = useCallback(() => {
        setChipCity(null)
        setChipOffer(null)
        setPrestigeFilter(false)
        resetAdvancedFilters()
        setShowAdvancedFilters(false)
        const params = new URLSearchParams()
        if (selectedSub?.trim()) params.set('sub', selectedSub.trim())
        const qs = params.toString()
        router.push(qs ? `/category/${encodedCat}?${qs}` : `/category/${encodedCat}`)
    }, [router, encodedCat, selectedSub, resetAdvancedFilters])

    const cardFadeStyle = (index: number): CSSProperties => ({
        animationDelay: index < 12 ? `${index * 60}ms` : '0ms',
    })

    const inputClass =
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white'

    const firstGridChunk = displayProducts.slice(0, 6)
    const restGridChunk = displayProducts.slice(6)

    const handlePrestigeBannerClick = () => {
        setPrestigeFilter((prev) => !prev)
        setTimeout(() => {
            document.getElementById('immo-product-grid')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        }, 80)
    }

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
            <section className="w-full bg-gradient-to-br from-[#0C447C] via-[#185FA5] to-[#378ADD] px-4 py-6 text-white sm:py-8 md:py-10">
                <div className="mx-auto max-w-4xl text-center">
                    <h1 className="text-2xl font-light tracking-tight text-white md:text-3xl">Trouvez votre bien idéal</h1>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-white/75 md:text-base">
                        Maisons, terrains, appartements — Brazzaville &amp; Pointe-Noire
                    </p>
                </div>

                <form
                    onSubmit={onSearch}
                    className="mx-auto mt-5 max-w-2xl rounded-xl bg-white p-4 shadow-xl dark:bg-white"
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
            </section>

            <div className="mx-auto w-full max-w-7xl flex-grow overflow-x-hidden px-4 py-6 md:py-8">
                <nav className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Link href="/" className="transition-colors hover:text-green-600 dark:hover:text-green-500">
                        Accueil
                    </Link>{' '}
                    / {category.name}
                </nav>

                <ImmobilierFilters
                    categoryName={categoryName}
                    subCategories={(category.sub_category || []).filter(
                        (s) => !IMMO_SUBS_BLOCKLIST.has(s.name.trim()),
                    )}
                    selectedSub={selectedSub}
                    subCounts={immoSubCounts}
                    totalCount={immoTotal}
                    chipCity={chipCity}
                    chipOffer={chipOffer}
                    onChipCity={setChipCity}
                    onChipOffer={setChipOffer}
                />

                <button
                    type="button"
                    onClick={() => setShowAdvancedFilters((v) => !v)}
                    className="mt-3 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Filtres avancés
                    <ChevronDown
                        size={16}
                        className={`shrink-0 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </button>

                <div
                    className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                        showAdvancedFilters ? 'max-h-[560px]' : 'max-h-0'
                    }`}
                >
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="block min-w-0">
                                <span className="sr-only">Budget minimum</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="Budget min (FCFA)"
                                    value={budgetMin}
                                    onChange={(e) => setBudgetMin(e.target.value)}
                                    className={inputClass}
                                />
                            </label>
                            <label className="block min-w-0">
                                <span className="sr-only">Budget maximum</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="Budget max (FCFA)"
                                    value={budgetMax}
                                    onChange={(e) => setBudgetMax(e.target.value)}
                                    className={inputClass}
                                />
                            </label>
                            <label className="block min-w-0">
                                <span className="sr-only">Nombre de chambres minimum</span>
                                <select
                                    value={minBedrooms}
                                    onChange={(e) => setMinBedrooms(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Chambres</option>
                                    <option value="1">1+</option>
                                    <option value="2">2+</option>
                                    <option value="3">3+</option>
                                    <option value="4">4+</option>
                                    <option value="5">5+</option>
                                </select>
                            </label>
                            <label className="block min-w-0">
                                <span className="sr-only">Surface minimum</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="Surface min (m²)"
                                    value={surfaceMin}
                                    onChange={(e) => setSurfaceMin(e.target.value)}
                                    className={inputClass}
                                />
                            </label>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={resetAdvancedFilters}
                                className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                Réinitialiser
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAdvancedFilters(false)}
                                className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Appliquer
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 mb-2">
                    <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                        {IMMO_SUBCATEGORY_HEADERS[selectedSub || '']?.title ?? 'Tous les biens disponibles'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {IMMO_SUBCATEGORY_HEADERS[selectedSub || '']?.subtitle ?? 'Cliquez sur un bien pour voir tous les détails'}
                        {' — '}
                        {displayProducts.length === 1
                            ? '1 bien trouvé'
                            : `${displayProducts.length} biens trouvés`}
                    </p>
                </div>

                <div
                    id="immo-product-grid"
                    className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {displayProducts.length > 0 ? (
                        <>
                            {firstGridChunk.map((p: any, i: number) => (
                                <div
                                    key={p.id}
                                    className="min-w-0 opacity-0 animate-fadeIn"
                                    style={cardFadeStyle(i)}
                                >
                                    <RealEstateCard product={p} />
                                </div>
                            ))}
                            {displayProducts.length >= 1 && (
                                <div className="col-span-full flex flex-col gap-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">
                                            EXCLUSIF
                                        </p>
                                        <h2 className="mt-1 text-xl font-medium text-white">Biens de prestige</h2>
                                        <p className="mt-2 max-w-md text-sm text-slate-400">
                                            Découvrez notre sélection de biens haut de gamme à Brazzaville &amp;
                                            Pointe-Noire
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handlePrestigeBannerClick}
                                        className="w-full shrink-0 cursor-pointer rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100 sm:w-auto"
                                    >
                                        {prestigeFilter ? 'Voir tous les prix' : 'Découvrir'}
                                    </button>
                                </div>
                            )}
                            {restGridChunk.map((p: any, i: number) => (
                                <div
                                    key={p.id}
                                    className="min-w-0 opacity-0 animate-fadeIn"
                                    style={cardFadeStyle(6 + i)}
                                >
                                    <RealEstateCard product={p} />
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="col-span-full py-16 text-center">
                            <div className="mb-4 text-5xl" aria-hidden>
                                🏠
                            </div>
                            <p className="font-medium text-slate-500 dark:text-slate-400">
                                Aucun bien ne correspond à vos critères
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Essayez d&apos;élargir votre recherche
                            </p>
                            <button
                                type="button"
                                onClick={resetAllFilters}
                                className="mt-4 cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-12 rounded-2xl bg-slate-50 p-8 text-center dark:bg-slate-800/50">
                    <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                        Vous avez un bien à vendre ou à louer ?
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Publiez votre annonce et touchez des acheteurs qualifiés
                    </p>
                    <div className="mt-6 flex flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                        <Link
                            href="/vendor/dashboard"
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            Publier mon annonce
                        </Link>
                        <Link
                            href="/devenir-vendeur"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Devenir vendeur
                        </Link>
                    </div>
                </div>
            </div>
        </>
    )
}
