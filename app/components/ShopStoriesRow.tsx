'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Store } from 'lucide-react'

interface Seller {
    id: string
    full_name: string | null
    store_name: string | null
    shop_name: string | null
    avatar_url: string | null
}

export default function ShopStoriesRow() {
    const [sellers, setSellers] = useState<Seller[]>([])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchSellers = async () => {
            // Récupère tous les vendeurs ET admins (les admins peuvent aussi avoir une boutique)
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, store_name, shop_name, avatar_url, role')
                .in('role', ['vendor', 'admin'])
                .limit(20)

            if (data && data.length > 0) {
                setSellers(data)
            }
        }
        fetchSellers()
    }, [])

    if (sellers.length === 0) return null

    // Fonction utilitaire : le nom de boutique peut être dans store_name OU shop_name
    const getShopName = (seller: Seller) =>
        seller.store_name || seller.shop_name || seller.full_name || 'Boutique'

    return (
        <div className="max-w-7xl mx-auto">
            <div className="px-4 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Boutiques
                </span>
            </div>
            <div
                className="flex gap-4 overflow-x-auto px-4 pt-2 pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {sellers.map((seller) => (
                    <Link
                        key={seller.id}
                        href={`/seller/${seller.id}`}
                        className="flex flex-col items-center gap-2 flex-shrink-0 group"
                    >
                        <div className="w-16 h-16 rounded-full ring-[2.5px] ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 overflow-hidden bg-green-100 dark:bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                            {seller.avatar_url ? (
                                <Image
                                    src={seller.avatar_url}
                                    alt={getShopName(seller)}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-green-600 font-black text-xl italic">
                                    {getShopName(seller)[0]?.toUpperCase() || <Store size={20} />}
                                </div>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400 max-w-[72px] truncate text-center">
                            {getShopName(seller)}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
