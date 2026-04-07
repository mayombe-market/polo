'use client'

import Link from 'next/link'

export type ImmoChipCity = null | 'brazzaville' | 'pointe-noire'
export type ImmoChipOffer = null | 'vente' | 'location'

type SubDef = {
    name: string
    label: string
    icon: string
    inactiveClass: string
}

const SUB_DEFS: SubDef[] = [
    {
        name: 'Maisons',
        label: 'Maisons',
        icon: '🏠',
        inactiveClass:
            'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950',
    },
    {
        name: 'Appartements',
        label: 'Appartements',
        icon: '🏢',
        inactiveClass:
            'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800',
    },
    {
        name: 'Terrains',
        label: 'Terrains',
        icon: '🌿',
        inactiveClass:
            'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950',
    },
    {
        name: 'Luxe',
        label: 'Luxe',
        icon: '💎',
        inactiveClass:
            'border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-950',
    },
    {
        name: 'Hôtels',
        label: 'Hôtels',
        icon: '🏨',
        inactiveClass:
            'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-950',
    },
    {
        name: 'Villas',
        label: 'Villas',
        icon: '🏖️',
        inactiveClass:
            'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950',
    },
    {
        name: 'Locations',
        label: 'Locations',
        icon: '🔑',
        inactiveClass:
            'border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-950',
    },
]

function defForSub(name: string): SubDef | undefined {
    return SUB_DEFS.find((d) => d.name === name)
}

type Props = {
    categoryName: string
    /** Sous-catégories Supabase (id + name) */
    subCategories: { id: string; name: string }[] | undefined
    selectedSub: string | null
    subCounts: Record<string, number>
    totalCount: number
    chipCity: ImmoChipCity
    chipOffer: ImmoChipOffer
    onChipCity: (v: ImmoChipCity) => void
    onChipOffer: (v: ImmoChipOffer) => void
}

export default function ImmobilierFilters({
    categoryName,
    subCategories,
    selectedSub,
    subCounts,
    totalCount,
    chipCity,
    chipOffer,
    onChipCity,
    onChipOffer,
}: Props) {
    const enc = encodeURIComponent(categoryName)

    const toggleCity = (v: Exclude<ImmoChipCity, null>) => {
        onChipCity(chipCity === v ? null : v)
    }

    const toggleOffer = (v: Exclude<ImmoChipOffer, null>) => {
        onChipOffer(chipOffer === v ? null : v)
    }

    return (
        <div className="w-full space-y-4">
            {/* Filtres principaux — liens SSR */}
            <div
                className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Types de biens"
            >
                <Link
                    href={`/category/${enc}`}
                    scroll={false}
                    className={[
                        'inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
                        !selectedSub
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                >
                    <span aria-hidden>🏠</span>
                    <span>Tout</span>
                    <span className="tabular-nums opacity-90">({totalCount})</span>
                </Link>

                {(subCategories || []).map((sub) => {
                    const def = defForSub(sub.name)
                    const count = subCounts[sub.name] ?? 0
                    const active = selectedSub === sub.name
                    const label = def?.label ?? sub.name
                    const icon = def?.icon ?? '📌'
                    const inactive = def?.inactiveClass ?? 'border border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

                    return (
                        <Link
                            key={sub.id}
                            href={`/category/${enc}?sub=${encodeURIComponent(sub.name)}`}
                            scroll={false}
                            className={[
                                'inline-flex max-w-[min(85vw,320px)] shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
                                active ? 'border border-blue-600 bg-blue-600 text-white shadow-md' : inactive,
                            ].join(' ')}
                        >
                            <span aria-hidden>{icon}</span>
                            <span className="truncate">{label}</span>
                            <span className="shrink-0 tabular-nums opacity-90">({count})</span>
                        </Link>
                    )
                })}
            </div>

            {/* Chips rapides — client uniquement */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:w-auto dark:text-slate-400">
                        Ville
                    </span>
                    <button
                        type="button"
                        onClick={() => toggleCity('brazzaville')}
                        className={[
                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                            chipCity === 'brazzaville'
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                        ].join(' ')}
                    >
                        Brazzaville
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleCity('pointe-noire')}
                        className={[
                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                            chipCity === 'pointe-noire'
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                        ].join(' ')}
                    >
                        Pointe-Noire
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:w-auto dark:text-slate-400">
                        Offre
                    </span>
                    <button
                        type="button"
                        onClick={() => toggleOffer('vente')}
                        className={[
                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                            chipOffer === 'vente'
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                        ].join(' ')}
                    >
                        Vente
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleOffer('location')}
                        className={[
                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                            chipOffer === 'location'
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                        ].join(' ')}
                    >
                        Location
                    </button>
                </div>
            </div>
        </div>
    )
}
