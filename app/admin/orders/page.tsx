'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import {
    ShieldCheck, Package, MapPin, Phone, Check, Loader2,
    Filter, Wallet, DollarSign, Clock, Truck, Ban, MessageCircle
} from 'lucide-react'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [activeFilter, setActiveFilter] = useState('all')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) console.error('Erreur chargement:', error)
                setOrders(data || [])
            } catch (err) {
                console.error('Erreur:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()

        // Real-time : écouter nouvelles commandes et mises à jour
        const channel = supabase
            .channel('admin-orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                setOrders(prev => [payload.new as any, ...prev])
                toast.success('Nouvelle commande !', {
                    description: `${(payload.new as any).customer_name} - ${(payload.new as any).total_amount?.toLocaleString('fr-FR')} FCFA`,
                    duration: 8000,
                })
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    // VERROU 1 : Confirmer le paiement (pending → confirmed)
    const confirmPayment = async (orderId: string) => {
        setUpdating(orderId)
        try {
            const { data, error } = await supabase
                .from('orders')
                .update({ status: 'confirmed' })
                .eq('id', orderId)
                .select()

            if (error) {
                toast.error(`Erreur: ${error.message}`)
                return
            }
            if (!data || data.length === 0) {
                toast.error('Aucune ligne mise à jour — vérifiez les politiques RLS')
                return
            }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'confirmed' } : o))
            const order = orders.find(o => o.id === orderId)
            toast.success(`${formatOrderNumber(order)} — Paiement confirmé`)
        } catch (err: any) {
            toast.error('Erreur: ' + (err?.message || 'Impossible de confirmer'))
        } finally {
            setUpdating(null)
        }
    }

    // VERROU 2 : Libérer les fonds (payout_status: pending → paid)
    const releaseFunds = async (orderId: string) => {
        setUpdating(orderId)
        try {
            const { error } = await supabase
                .from('orders')
                .update({ payout_status: 'paid' })
                .eq('id', orderId)

            if (error) throw error
            setOrders(orders.map(o => o.id === orderId ? { ...o, payout_status: 'paid' } : o))
            toast.success('Fonds libérés — le vendeur a été payé')
        } catch (err) {
            console.error(err)
            toast.error('Erreur lors de la libération')
        } finally {
            setUpdating(null)
        }
    }

    // Vérifier si les fonds peuvent être libérés (48h après livraison)
    const canReleaseFunds = (order: any) => {
        if (order.status !== 'delivered' || order.payout_status !== 'pending') return false
        if (!order.delivered_at) return false
        const elapsed = Date.now() - new Date(order.delivered_at).getTime()
        return elapsed > 48 * 60 * 60 * 1000
    }

    const hoursUntilRelease = (order: any) => {
        if (!order.delivered_at) return 48
        const elapsed = Date.now() - new Date(order.delivered_at).getTime()
        const remaining = (48 * 60 * 60 * 1000 - elapsed) / (1000 * 60 * 60)
        return Math.max(0, Math.ceil(remaining))
    }

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'delivered': return { label: 'Livrée', style: 'bg-green-100 text-green-700' }
            case 'shipped': return { label: 'Expédiée', style: 'bg-purple-100 text-purple-700' }
            case 'confirmed': return { label: 'Confirmée', style: 'bg-blue-100 text-blue-700' }
            default: return { label: 'En attente', style: 'bg-yellow-100 text-yellow-700' }
        }
    }

    const getPaymentBadge = (method: string) => {
        switch (method) {
            case 'mobile_money': return { label: 'MoMo', style: 'bg-green-100 text-green-700' }
            case 'whatsapp': return { label: 'WhatsApp', style: 'bg-emerald-100 text-emerald-700' }
            default: return { label: 'Cash', style: 'bg-slate-100 text-slate-600' }
        }
    }

    // Statistiques
    const confirmedOrders = orders.filter(o => o.status !== 'pending')
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalCommissions = confirmedOrders.reduce((sum, o) => sum + (o.commission_amount || Math.round((o.total_amount || 0) * 0.10)), 0)
    const pendingPayouts = orders.filter(o => o.status === 'delivered' && o.payout_status === 'pending').length

    // Filtrage
    const filteredOrders = orders.filter(order => {
        if (activeFilter === 'all') return true
        return order.status === activeFilter
    })

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
                        Admin <span className="text-orange-500">Commandes</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Système Double Verrou — Confirmez les paiements et libérez les fonds
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Commandes', val: orders.length, icon: <Package size={18} />, color: 'text-slate-600' },
                        { label: 'CA Total', val: `${totalRevenue.toLocaleString('fr-FR')} F`, icon: <DollarSign size={18} />, color: 'text-green-600' },
                        { label: 'Commissions', val: `${totalCommissions.toLocaleString('fr-FR')} F`, icon: <Wallet size={18} />, color: 'text-orange-600' },
                        { label: 'Versements en attente', val: pendingPayouts, icon: <Clock size={18} />, color: 'text-amber-600' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                            <p className="text-2xl font-black italic tracking-tighter">{stat.val}</p>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* FILTRES */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'all', label: 'Toutes' },
                        { id: 'pending', label: 'En attente' },
                        { id: 'confirmed', label: 'Confirmées' },
                        { id: 'shipped', label: 'Expédiées' },
                        { id: 'delivered', label: 'Livrées' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border ${activeFilter === f.id
                                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                }`}
                        >
                            {f.label} ({orders.filter(o => f.id === 'all' ? true : o.status === f.id).length})
                        </button>
                    ))}
                </div>

                {/* LISTE DES COMMANDES */}
                <div className="space-y-4">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => {
                            const statusInfo = getStatusDetails(order.status)
                            const payBadge = getPaymentBadge(order.payment_method)
                            const commission = order.commission_amount || Math.round((order.total_amount || 0) * 0.10)
                            const vendorPayout = order.vendor_payout || Math.round((order.total_amount || 0) * 0.90)

                            return (
                                <div key={order.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 md:p-8 transition-all hover:shadow-md">
                                    {/* EN-TÊTE */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none">{formatOrderNumber(order)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`px-4 py-1.5 text-[9px] font-black uppercase italic rounded-full tracking-widest ${statusInfo.style}`}>
                                                {statusInfo.label}
                                            </span>
                                            <span className={`px-3 py-1 text-[8px] font-black uppercase italic rounded-full ${payBadge.style}`}>
                                                {payBadge.label}
                                            </span>
                                            {order.payout_status === 'paid' && (
                                                <span className="px-3 py-1 text-[8px] font-black uppercase italic rounded-full bg-green-100 text-green-700">
                                                    Fonds libérés
                                                </span>
                                            )}
                                            {order.status === 'delivered' && order.payout_status === 'pending' && (
                                                <span className="px-3 py-1 text-[8px] font-black uppercase italic rounded-full bg-amber-100 text-amber-700 animate-pulse">
                                                    Fonds bloqués
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* CONTENU */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                        {/* Articles */}
                                        <div className="space-y-3">
                                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Articles</p>
                                            {order.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                                                    <Image src={item.img || '/placeholder-image.jpg'} alt={item.name || ''} width={48} height={48} className="w-12 h-12 object-cover rounded-xl" />
                                                    <div className="flex-1">
                                                        <h3 className="text-xs font-black uppercase italic leading-tight">{item.name}</h3>
                                                        <p className="text-[10px] font-bold text-green-600 mt-1">{item.price?.toLocaleString('fr-FR')} F x {item.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Client + Finances */}
                                        <div className="space-y-4">
                                            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                                                <p className="text-[8px] font-black uppercase text-slate-400 mb-3 tracking-[0.2em]">Contact Client</p>
                                                <p className="font-black uppercase italic text-sm mb-1">{order.customer_name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    <MapPin size={12} className="text-orange-500" /> {order.city}, {order.district}
                                                </p>
                                                {order.phone && (
                                                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-2 mt-1">
                                                        <Phone size={12} className="text-orange-500" /> {order.phone}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Répartition financière */}
                                            <div className="bg-orange-50/50 dark:bg-orange-500/5 p-5 rounded-[2rem] border border-orange-100 dark:border-orange-900/20">
                                                <p className="text-[8px] font-black uppercase text-orange-500 mb-3 tracking-[0.2em]">Répartition</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-slate-500">Total commande</span>
                                                        <span className="font-black">{(order.total_amount || 0).toLocaleString('fr-FR')} F</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-orange-500">Commission (10%)</span>
                                                        <span className="font-black text-orange-500">{commission.toLocaleString('fr-FR')} F</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] font-bold border-t border-orange-200 dark:border-orange-800 pt-2">
                                                        <span className="text-slate-600">Part vendeur (90%)</span>
                                                        <span className="font-black">{vendorPayout.toLocaleString('fr-FR')} F</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ACTIONS ADMIN */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        {/* VERROU 1 : Confirmer le paiement */}
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => confirmPayment(order.id)}
                                                disabled={updating === order.id}
                                                className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                            >
                                                {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                Confirmer le paiement
                                            </button>
                                        )}

                                        {/* VERROU 2 : Libérer les fonds */}
                                        {order.status === 'delivered' && order.payout_status === 'pending' && (
                                            canReleaseFunds(order) ? (
                                                <button
                                                    onClick={() => releaseFunds(order.id)}
                                                    disabled={updating === order.id}
                                                    className="flex-1 bg-green-600 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                                                >
                                                    {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                                                    Libérer les fonds ({vendorPayout.toLocaleString('fr-FR')} F)
                                                </button>
                                            ) : (
                                                <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 px-6 py-4 rounded-2xl flex items-center justify-center gap-3">
                                                    <Clock size={14} className="text-amber-600" />
                                                    <span className="text-[10px] font-black uppercase italic text-amber-700 dark:text-amber-400">
                                                        Libérable dans {hoursUntilRelease(order)}h
                                                    </span>
                                                </div>
                                            )
                                        )}

                                        {/* Contacter le client */}
                                        {order.phone && (
                                            <a
                                                href={`https://wa.me/${order.phone}`}
                                                target="_blank"
                                                className="bg-green-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 transition-transform active:scale-95"
                                            >
                                                <MessageCircle size={14} /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                            <Filter className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-xs font-black uppercase italic text-slate-400">Aucune commande dans cette catégorie</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
