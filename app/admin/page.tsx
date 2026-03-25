'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { withTimeout } from '@/lib/supabase-utils'
import { NETWORK_TIMEOUT_MS } from '@/lib/networkTimeouts'
import { useRealtime } from '@/hooks/useRealtime'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Package, DollarSign, Clock, ShieldCheck, Users, ShoppingBag, Truck,
    ArrowRight, Loader2, Wallet, TrendingUp, CheckCircle
} from 'lucide-react'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const supabase = getSupabaseBrowserClient()


function getStatusBadge(status: string) {
    const map: Record<string, { label: string; cls: string }> = {
        pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
        confirmed: { label: 'Confirmée', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
        shipped: { label: 'Expédiée', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
        picked_up: { label: 'Récupérée', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
        delivered: { label: 'Livrée', cls: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
        rejected: { label: 'Rejetée', cls: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    }
    const s = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
    return <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${s.cls}`}>{s.label}</span>
}

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [stats, setStats] = useState({
        ordersToday: 0,
        revenueToday: 0,
        pendingOrders: 0,
        pendingVerifications: 0,
        totalVendors: 0,
        verifiedVendors: 0,
        totalProducts: 0,
        totalLogisticians: 0,
        pendingPayouts: 0,
    })
    const [recentOrders, setRecentOrders] = useState<any[]>([])

    const fetchStats = useCallback(async () => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayISO = today.toISOString()

            const [
                ordersRes,
                ordersTodayRes,
                pendingOrdersRes,
                pendingVerifRes,
                vendorsRes,
                verifiedVendorsRes,
                productsRes,
                logisticiansRes,
                pendingPayoutsRes,
                recentRes,
            ] = await withTimeout(Promise.all([
                supabase.from('orders').select('total_amount').gte('created_at', todayISO).neq('status', 'rejected').neq('order_type', 'subscription'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayISO).neq('order_type', 'subscription'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('vendor_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor').eq('verification_status', 'verified'),
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'logistician'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').eq('payout_status', 'pending'),
                supabase.from('orders').select('*').neq('order_type', 'subscription').order('created_at', { ascending: false }).limit(5),
            ]), NETWORK_TIMEOUT_MS)

            const revenueToday = (ordersRes.data || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0)

            setStats({
                ordersToday: ordersTodayRes.count || 0,
                revenueToday,
                pendingOrders: pendingOrdersRes.count || 0,
                pendingVerifications: pendingVerifRes.count || 0,
                totalVendors: vendorsRes.count || 0,
                verifiedVendors: verifiedVendorsRes.count || 0,
                totalProducts: productsRes.count || 0,
                totalLogisticians: logisticiansRes.count || 0,
                pendingPayouts: pendingPayoutsRes.count || 0,
            })
            setRecentOrders(recentRes.data || [])
        } catch (err) {
            console.error('Erreur chargement dashboard:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchStats() }, [fetchStats])

    // Realtime via shared channel
    useRealtime('order:insert', fetchStats)
    useRealtime('order:update', fetchStats)
    useRealtime('verification:insert', fetchStats)
    useRealtime('verification:update', fetchStats)

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 font-bold">Erreur de chargement</p>
            <button onClick={() => { setError(false); setLoading(true); }} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm">Réessayer</button>
        </div>
    )

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                        Tableau de <span className="text-orange-500">Bord</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Vue d&apos;ensemble — Mayombe Market
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

                {/* ═══ KPIs PRINCIPAUX ═══ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400 mb-2"><Package size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter">{stats.ordersToday}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Commandes aujourd&apos;hui</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-green-500 mb-2"><DollarSign size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter">{stats.revenueToday.toLocaleString('fr-FR')} <span className="text-sm">F</span></p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">CA aujourd&apos;hui</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/5">
                        <div className="text-amber-500 mb-2"><Clock size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-amber-600">{stats.pendingOrders}</p>
                        <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-1">Commandes en attente</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/5">
                        <div className="text-amber-500 mb-2"><ShieldCheck size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-amber-600">{stats.pendingVerifications}</p>
                        <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-1">Vérifications en attente</p>
                    </div>
                </div>

                {/* ═══ KPIs SECONDAIRES ═══ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Vendeurs', val: stats.totalVendors, icon: <Users size={16} />, color: 'text-blue-500' },
                        { label: 'Vendeurs vérifiés', val: stats.verifiedVendors, icon: <CheckCircle size={16} />, color: 'text-green-500' },
                        { label: 'Produits en ligne', val: stats.totalProducts, icon: <ShoppingBag size={16} />, color: 'text-purple-500' },
                        { label: 'Livreurs actifs', val: stats.totalLogisticians, icon: <Truck size={16} />, color: 'text-indigo-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className={`${s.color} mb-1.5`}>{s.icon}</div>
                            <p className="text-xl font-black italic tracking-tighter">{s.val}</p>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* ═══ ACTIONS RAPIDES ═══ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.pendingOrders > 0 && (
                        <Link href="/admin/orders" className="group p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white no-underline hover:shadow-xl hover:shadow-orange-500/20 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-black italic">{stats.pendingOrders}</p>
                                    <p className="text-xs font-bold mt-1 opacity-90">Commandes en attente</p>
                                </div>
                                <ArrowRight size={20} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    )}
                    {stats.pendingVerifications > 0 && (
                        <Link href="/admin/verifications" className="group p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white no-underline hover:shadow-xl hover:shadow-blue-500/20 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-black italic">{stats.pendingVerifications}</p>
                                    <p className="text-xs font-bold mt-1 opacity-90">Vérifications à traiter</p>
                                </div>
                                <ArrowRight size={20} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    )}
                    {stats.pendingPayouts > 0 && (
                        <Link href="/admin/orders" className="group p-5 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white no-underline hover:shadow-xl hover:shadow-green-500/20 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-black italic">{stats.pendingPayouts}</p>
                                    <p className="text-xs font-bold mt-1 opacity-90">Fonds à libérer</p>
                                </div>
                                <ArrowRight size={20} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    )}
                    {stats.pendingOrders === 0 && stats.pendingVerifications === 0 && stats.pendingPayouts === 0 && (
                        <div className="col-span-full p-8 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-center">
                            <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-bold text-green-700 dark:text-green-400">Tout est à jour !</p>
                            <p className="text-xs text-green-500 mt-1">Aucune action en attente</p>
                        </div>
                    )}
                </div>

                {/* ═══ DERNIÈRES COMMANDES ═══ */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-sm font-black uppercase italic tracking-wider dark:text-white flex items-center gap-2">
                            <TrendingUp size={16} className="text-orange-500" />
                            Dernières commandes
                        </h2>
                        <Link href="/admin/orders" className="text-[10px] font-bold text-orange-500 hover:underline no-underline">
                            Voir tout →
                        </Link>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Aucune commande
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold dark:text-white truncate">
                                            {formatOrderNumber(order)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            {order.customer_name || 'Client'} — {order.customer_city || 'Ville'}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs font-black dark:text-white">
                                            {(order.total_amount || 0).toLocaleString('fr-FR')} F
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {formatAdminDateTime(order.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {getStatusBadge(order.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
