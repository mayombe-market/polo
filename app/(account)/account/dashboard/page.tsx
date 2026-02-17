'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
    Package,
    Heart,
    MapPin,
    ArrowUpRight,
    ShoppingBag,
    Clock,
    ChevronRight,
    Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function AccountDashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        orders: 0,
        favorites: 0,
        addressSet: false
    })
    const [lastOrder, setLastOrder] = useState<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    let orderCount = 0
                    let favoriteCount = 0
                    let latest = null
                    let profile = null

                    try {
                        const res = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
                        orderCount = res.count || 0
                    } catch {}

                    try {
                        const res = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
                        favoriteCount = res.count || 0
                    } catch {}

                    try {
                        const res = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
                        latest = res.data
                    } catch {}

                    try {
                        const res = await supabase.from('profiles').select('city, district').eq('id', user.id).maybeSingle()
                        profile = res.data
                    } catch {}

                    setStats({
                        orders: orderCount,
                        favorites: favoriteCount,
                        addressSet: !!(profile?.city && profile?.district)
                    })
                    setLastOrder(latest)
                }
            } catch (err) {
                console.error('Erreur Dashboard:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [supabase])

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
    )

    return (
        <div className="space-y-10">
            {/* GREETING */}
            <header>
                <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
                    Mboté <span className="text-orange-500">Na Yo!</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">
                    Ton résumé d'activité Mayombe
                </p>
            </header>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/orders" className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-orange-500 transition-colors group">
                    <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        <Package size={24} />
                    </div>
                    <p className="text-4xl font-black italic">{stats.orders}</p>
                    <p className="text-[10px] font-black uppercase text-slate-400">Commandes passées</p>
                </Link>

                <Link href="/account/favorites" className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-red-500 transition-colors group">
                    <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-red-500 group-hover:text-white transition-all">
                        <Heart size={24} />
                    </div>
                    <p className="text-4xl font-black italic">{stats.favorites}</p>
                    <p className="text-[10px] font-black uppercase text-slate-400">Dans ma wishlist</p>
                </Link>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                            <MapPin size={24} />
                        </div>
                        <p className="text-[10px] font-black uppercase italic mt-2">
                            {stats.addressSet ? 'Adresse configurée ✅' : 'Adresse non définie ⚠️'}
                        </p>
                    </div>
                    <Link href="/account/addresses" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-orange-500 mt-4 hover:underline">
                        Gérer <ArrowUpRight size={12} />
                    </Link>
                </div>
            </div>

            {/* DERNIÈRE COMMANDE */}
            <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4">
                        <h2 className="text-xs font-black uppercase italic tracking-widest text-orange-500 flex items-center gap-2">
                            <Clock size={16} /> Dernière activité
                        </h2>
                        {lastOrder ? (
                            <div>
                                <p className="text-2xl font-black italic uppercase">Commande #{lastOrder.id.slice(0, 8)}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Statut : {lastOrder.status}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xl font-black italic text-slate-500 uppercase">Aucun achat pour le moment</p>
                                <p className="text-[9px] font-bold text-slate-600 uppercase">Vos produits apparaîtront ici dès votre première commande</p>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/orders"
                        className="bg-white text-black px-10 py-5 rounded-3xl font-black uppercase italic text-xs hover:bg-orange-500 hover:text-white transition-all flex items-center gap-3 shrink-0"
                    >
                        Historique complet <ChevronRight size={16} />
                    </Link>
                </div>
                {/* Decoration background */}
                <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12">
                    <ShoppingBag size={200} />
                </div>
            </div>
        </div>
    )
}