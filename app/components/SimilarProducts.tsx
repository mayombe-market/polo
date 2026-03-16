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
                        .limit(6)

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
                        .limit(6)

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
                    .limit(6)

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

    return (
        <div className="mt-8 mb-6 px-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-orange-500" />
                <h2 className="text-lg font-black uppercase italic tracking-tighter dark:text-[#F0ECE2]">
                    Produits similaires
                </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 pb-24">
                {products.slice(0, 4).map((p: any) => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>
        </div>
    )
}

export default SimilarProducts
