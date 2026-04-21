'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { LayoutDashboard, Package, ShoppingBag, Truck, ShieldCheck, Users, Megaphone, CreditCard, Zap, Hotel, Star, UsersRound } from 'lucide-react'
import { useRealtime } from '@/hooks/useRealtime'

const supabase = getSupabaseBrowserClient()


const links = [
    { href: '/admin',               label: 'Dashboard',    icon: LayoutDashboard, badgeKey: null },
    { href: '/admin/activity',      label: 'Activité',     icon: Zap,             badgeKey: 'activity' as const },
    { href: '/admin/orders',        label: 'Commandes',    icon: Package,         badgeKey: 'orders' as const },
    { href: '/admin/products',      label: 'Produits',     icon: ShoppingBag,     badgeKey: null },
    { href: '/admin/verifications', label: 'Vérifications',icon: ShieldCheck,     badgeKey: 'verifications' as const },
    { href: '/admin/vendors',       label: 'Vendeurs',     icon: Users,           badgeKey: null },
    { href: '/admin/hotels',        label: 'Hôtels',       icon: Hotel,           badgeKey: 'hotels' as const },
    { href: '/admin/reviews',       label: 'Avis',         icon: Star,            badgeKey: null },
    { href: '/admin/subscriptions', label: 'Abonnements',  icon: CreditCard,      badgeKey: 'subscriptions' as const },
    { href: '/admin/equipe',        label: 'Équipe',       icon: UsersRound,      badgeKey: null },
    { href: '/admin/ads',           label: 'Pubs',         icon: Megaphone,       badgeKey: 'ad_campaigns' as const },
]

export default function AdminNav() {
    const pathname = usePathname()
    const [badges, setBadges] = useState<{ orders: number; verifications: number; ad_campaigns: number; subscriptions: number; hotels: number; activity: number }>({
        orders: 0,
        verifications: 0,
        ad_campaigns: 0,
        subscriptions: 0,
        hotels: 0,
        activity: 0,
    })

    const fetchCounts = useCallback(async () => {
        const soonCutoff = new Date()
        soonCutoff.setDate(soonCutoff.getDate() + 7)

        const [ordersRes, verificationsRes, adCampRes, subRes, hotelRes] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('vendor_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('vendor_ad_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
            supabase.from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'vendor')
                .not('subscription_plan', 'is', null)
                .not('subscription_plan', 'in', '("gratuit","free")')
                .lte('subscription_end_date', soonCutoff.toISOString()),
            // Hôtels Chambre/Auberge (gratuit, peuvent nécessiter attention)
            supabase.from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'vendor')
                .eq('vendor_type', 'hotel')
                .eq('subscription_plan', 'hotel_free'),
        ])
        setBadges({
            orders: ordersRes.count || 0,
            verifications: verificationsRes.count || 0,
            ad_campaigns: adCampRes.count || 0,
            subscriptions: subRes.count || 0,
            hotels: hotelRes.count || 0,
            activity: 0,
        })
    }, [])

    useEffect(() => { fetchCounts() }, [fetchCounts])

    // Realtime via shared channel
    useRealtime('order:insert', fetchCounts)
    useRealtime('order:update', fetchCounts)
    useRealtime('verification:insert', fetchCounts)
    useRealtime('verification:update', fetchCounts)

    return (
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {links.map(({ href, label, icon: Icon, badgeKey }) => {
                    const active = pathname === href
                    const count =
                        badgeKey === 'orders'        ? badges.orders
                        : badgeKey === 'verifications' ? badges.verifications
                        : badgeKey === 'ad_campaigns'  ? badges.ad_campaigns
                        : badgeKey === 'subscriptions' ? badges.subscriptions
                        : badgeKey === 'hotels'         ? badges.hotels
                        : 0

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`relative flex items-center gap-2 px-5 py-3.5 text-[10px] font-black uppercase italic tracking-wider whitespace-nowrap border-b-2 transition-all ${
                                active
                                    ? 'border-orange-500 text-orange-500'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                            {count > 0 && (
                                <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[9px] font-black not-italic tracking-normal">
                                    {count > 99 ? '99+' : count}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
