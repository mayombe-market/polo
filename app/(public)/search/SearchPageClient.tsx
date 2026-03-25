'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { searchProducts } from '@/lib/searchProducts'
import { withTimeout } from '@/lib/supabase-utils'
import { sanitizeSearchQueryForDisplay } from '@/lib/sanitizeUserDisplay'
import { X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/app/components/ProductCard'

export default function SearchPageClient() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const query = searchParams.get('q') || ''
    const displayQuery = useMemo(() => sanitizeSearchQueryForDisplay(query), [query])

    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(false)

    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)

    const [visibleCount, setVisibleCount] = useState(24)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        sort: searchParams.get('sort') || 'newest',
        inStock: searchParams.get('inStock') === 'true',
        filter: searchParams.get('filter') || '',
    })

    useEffect(() => {
        const next = {
            category: searchParams.get('category') || '',
            minPrice: searchParams.get('minPrice') || '',
            maxPrice: searchParams.get('maxPrice') || '',
            sort: searchParams.get('sort') || 'newest',
            inStock: searchParams.get('inStock') === 'true',
            filter: searchParams.get('filter') || '',
        }
        setFilters((prev) => {
            if (
                prev.category === next.category &&
                prev.minPrice === next.minPrice &&
                prev.maxPrice === next.maxPrice &&
                prev.sort === next.sort &&
                prev.inStock === next.inStock &&
                prev.filter === next.filter
            ) {
                return prev
            }
            return next
        })
    }, [searchParams.toString()])

    const fetchResults = async (page: number) => {
        setLoading(true)
        try {
            const { data, totalPages: total, count } = await withTimeout(searchProducts(query, filters, page))
            setProducts(data || [])
            setTotalPages(total)
            setTotalItems(count)
            setVisibleCount(24)
        } catch (err) {
            console.error('Erreur recherche:', err)
        } finally {
            setLoading(false)
            if (page > 1) window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    useEffect(() => {
        setCurrentPage(1)
        fetchResults(1)
    }, [query, filters])

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
        fetchResults(newPage)
    }

    const updateFilter = (key: string, value: any) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)

        const params = new URLSearchParams(searchParams.toString())
        if (key === 'inStock') {
            if (value) params.set('inStock', 'true')
            else params.delete('inStock')
        } else if (value) {
            params.set(key, value.toString())
        } else {
            params.delete(key)
        }
        router.push(`/search?${params.toString()}`, { scroll: false })
    }

    useEffect(() => {
        if (!sentinelRef.current) return
        if (loading) return
        if (visibleCount >= products.length) return

        const el = sentinelRef.current
        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0]
                if (!first?.isIntersecting) return
                setVisibleCount((c) => Math.min(c + 24, products.length))
            },
            { root: null, rootMargin: '800px 0px', threshold: 0 }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [visibleCount, products.length, loading])

    const visibleProducts = useMemo(
        () => products.slice(0, visibleCount),
        [products, visibleCount]
    )

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 px-4 py-8">
            <div className="max-w-7xl mx-auto">

                <div className="mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                            {displayQuery ? (
                                <>
                                    Résultats pour{' '}
                                    <span className="text-orange-500">« {displayQuery} »</span>
                                </>
                            ) : (
                                <>Recherche & catalogue</>
                            )}
                        </h1>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">
                            {totalItems} articles trouvés
                        </p>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase"
                    >
                        <SlidersHorizontal size={14} /> {showFilters ? 'Fermer' : 'Filtres'}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">

                    <aside className={`lg:w-64 space-y-8 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] space-y-8 border border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em]">Trier</h3>
                                <select
                                    value={filters.sort}
                                    onChange={(e) => updateFilter('sort', e.target.value)}
                                    className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer"
                                >
                                    <option value="newest">Nouveautés</option>
                                    <option value="popular">Plus populaires</option>
                                    <option value="price_asc">Prix croissant</option>
                                    <option value="price_desc">Prix décroissant</option>
                                </select>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em]">Budget (FCFA)</h3>
                                <div className="space-y-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.minPrice}
                                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold outline-none border border-transparent focus:border-orange-500 transition-all"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.maxPrice}
                                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold outline-none border border-transparent focus:border-orange-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={filters.inStock}
                                    onChange={(e) => updateFilter('inStock', e.target.checked)}
                                    className="w-5 h-5 accent-orange-500 rounded-lg cursor-pointer"
                                />
                                <span className="text-[10px] font-black uppercase italic">En stock</span>
                            </div>

                            <button
                                onClick={() => {
                                    setFilters({
                                        category: '',
                                        minPrice: '',
                                        maxPrice: '',
                                        sort: 'newest',
                                        inStock: false,
                                        filter: '',
                                    })
                                    const params = new URLSearchParams()
                                    if (query.trim()) params.set('q', query.trim())
                                    router.push(params.toString() ? `/search?${params.toString()}` : '/search')
                                }}
                                className="w-full py-3 text-[10px] font-black uppercase bg-white dark:bg-slate-800 text-red-500 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                            >
                                <X size={12} /> Effacer les filtres
                            </button>
                        </div>
                    </aside>

                    <div className="flex-1">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6" aria-busy="true" aria-label="Chargement des résultats">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <ProductCard key={`ph-${i}`} isLoading aboveFold />
                                ))}
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <ProductCard key={`sk-${i}`} isLoading />
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {visibleProducts.map((product, index) => (
                                        <ProductCard key={product.id} product={product} aboveFold={index < 10} />
                                    ))}
                                </div>
                                {visibleCount < products.length && (
                                    <div ref={sentinelRef} className="h-12" />
                                )}

                                {totalPages > 1 && (
                                    <div className="mt-16 flex justify-center items-center gap-6">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 disabled:opacity-20 transition-all hover:bg-orange-500 hover:text-white"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>

                                        <div className="flex items-center gap-2 font-black text-sm uppercase italic">
                                            <span className="text-orange-500">{currentPage}</span>
                                            <span className="text-slate-300">/</span>
                                            <span>{totalPages}</span>
                                        </div>

                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            className="p-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black disabled:opacity-20 transition-all hover:bg-orange-500 hover:text-white"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                                <p className="font-black uppercase text-slate-300 text-xl italic tracking-tighter">
                                    Aucun article trouvé pour votre recherche
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
