'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getFollowedProducts } from '@/lib/getFollowedProducts'
import ProductCard from '@/app/components/ProductCard'
import { Bell, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function FeedPage() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const loadFeed = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data } = await getFollowedProducts(user.id)
                setProducts(data || [])
            }
            setLoading(false)
        }
        loadFeed()
    }, [])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
    )

    if (!user) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <Bell size={48} className="text-slate-200 mb-4" />
            <h1 className="text-xl font-black uppercase italic">Connectez-vous</h1>
            <p className="text-slate-500 text-sm max-w-xs mt-2">
                Connectez-vous pour voir les nouveautés de vos boutiques préférées.
            </p>
            <Link href="/login" className="mt-6 bg-black text-white px-8 py-3 rounded-2xl font-black uppercase text-xs">
                Se connecter
            </Link>
        </div>
    )

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 px-4 py-12">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="text-orange-500" size={24} />
                        <span className="font-black uppercase text-[10px] tracking-[0.3em] text-orange-500">Votre Flux Personnel</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                        Nouveautés <span className="text-slate-400">Suivies</span>
                    </h1>
                </header>

                {products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <p className="font-black uppercase text-slate-400 italic">
                            Aucune nouveauté pour le moment.<br />
                            Abonnez-vous à des vendeurs pour voir leurs articles ici !
                        </p>
                        <Link href="/search" className="inline-block mt-6 text-orange-500 font-black uppercase text-[10px] tracking-widest border-b-2 border-orange-500">
                            Découvrir des boutiques
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}