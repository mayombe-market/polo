'use client'

import { useState, useEffect, useMemo } from 'react'
import ProductCard from './ProductCard'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const SimilarProducts = ({ productId, subcategory, category }: {
    productId: string
    subcategory?: string
    category?: string
}) => {
    const [products, setProducts] = useState<any[]>([])

    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    useEffect(() => {
        if (!productId) return

        const fetchSimilar = async () => {
            try {
                const expiredIds = await getExpiredSellerIds(supabase)

                // 1. Essayer par sous-catégorie
                if (subcategory) {
                    let query = supabase
                        .from('products')
                        .select('*')
                        .eq('subcategory', subcategory)
                        .neq('id', productId)
                        .order('views_count', { ascending: false })
                        .limit(12)

                    query = excludeExpiredSellers(query, expiredIds)
                    const { data } = await query

                    if (data && data.length >= 2) {
                        setProducts(data)
                        return
                    }
                }

                // 2. Fallback par catégorie
                if (category) {
                    let query = supabase
                        .from('products')
                        .select('*')
                        .eq('category', category)
                        .neq('id', productId)
                        .order('views_count', { ascending: false })
                        .limit(12)

                    query = excludeExpiredSellers(query, expiredIds)
                    const { data } = await query

                    if (data && data.length > 0) {
                        setProducts(data)
                        return
                    }
                }

                // 3. Dernier fallback : produits populaires
                let query = supabase
                    .from('products')
                    .select('*')
                    .neq('id', productId)
                    .order('views_count', { ascending: false })
                    .limit(12)

                query = excludeExpiredSellers(query, expiredIds)
                const { data } = await query
                setProducts(data || [])
            } catch (err) {
                console.error('Erreur produits similaires:', err)
            }
        }

        fetchSimilar()
    }, [productId, subcategory, category, supabase])

    if (products.length === 0) return null

    const isNew = (createdAt: string | undefined) => {
        if (!createdAt) return false
        const t = new Date(createdAt).getTime()
        if (Number.isNaN(t)) return false
        return Date.now() - t < 30 * 24 * 60 * 60 * 1000
    }

    const list = products.slice(0, 12)

    return (
        <div className="mt-16 mb-10 px-4 lg:px-8">
            <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full bg-blue-600" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-[#F0ECE2]">
                        Vous aimerez aussi
                    </h2>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
                    Défilez →
                </span>
            </div>
            <div className="relative">
                <div className="flex gap-5 overflow-x-auto pb-8 pt-1 pr-6 no-scrollbar snap-x snap-mandatory scroll-pl-1">
                    {list.map((p: any) => (
                        <div
                            key={p.id}
                            className="relative flex-shrink-0 w-[min(260px,78vw)] snap-start"
                        >
                            {isNew(p.created_at) && (
                                <span className="absolute top-3 left-3 z-30 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 border border-white/10 shadow-lg">
                                    New
                                </span>
                            )}
                            <ProductCard product={p} />
                        </div>
                    ))}
                </div>
                <div
                    className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent dark:from-[#0A0A12] sm:w-20"
                    aria-hidden
                />
            </div>
        </div>
    )
}

export default SimilarProducts
