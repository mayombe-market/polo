'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { LayoutDashboard, Package, ShoppingBag, Truck, ShieldCheck, Users, Megaphone } from 'lucide-react'
import { useRealtime } from '@/hooks/useRealtime'

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, badgeKey: null },
    { href: '/admin/orders', label: 'Commandes', icon: Package, badgeKey: 'orders' as const },
    { href: '/admin/products', label: 'Produits', icon: ShoppingBag, badgeKey: null },
    { href: '/admin/verifications', label: 'Vérifications', icon: ShieldCheck, badgeKey: 'verifications' as const },
    { href: '/admin/vendors', label: 'Vendeurs', icon: Users, badgeKey: null },
    { href: '/admin/logisticians', label: 'Logisticiens', icon: Truck, badgeKey: null },
    { href: '/admin/ads', label: 'Pubs', icon: Megaphone, badgeKey: null },
]

export default function AdminNav() {
    const pathname = usePathname()
    const [badges, setBadges] = useState<{ orders: number; verifications: number }>({ orders: 0, verifications: 0 })

    const fetchCounts = useCallback(async () => {
        const [ordersRes, verificationsRes] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('vendor_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ])
        setBadges({
            orders: ordersRes.count || 0,
            verifications: verificationsRes.count || 0,
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
                    const count = badgeKey ? badges[badgeKey] : 0

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
