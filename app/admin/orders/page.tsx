'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import {
    ShieldCheck, Package, MapPin, Phone, Loader2,
    Filter, Wallet, DollarSign, Clock, Ban, Download, Truck
} from 'lucide-react'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { generateInvoice } from '@/lib/generateInvoice'
import { adminConfirmPayment, adminReleaseFunds, adminRejectOrder } from '@/app/actions/orders'
import { playNewOrderSound } from '@/lib/notificationSound'

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [activeFilter, setActiveFilter] = useState('all')
    const [adminInputs, setAdminInputs] = useState<Record<string, string>>({})

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // ===== NOTIFICATION SOUND + BROWSER PUSH =====
    const audioCtxRef = useRef<AudioContext | null>(null)

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [])

    const playNotificationSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
            const ctx = audioCtxRef.current
            const now = ctx.currentTime
            // Triple note pour l'admin (plus urgent)
            const notes = [880, 1100, 1320]
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sine'
                const start = now + i * 0.12
                osc.frequency.setValueAtTime(freq, start)
                gain.gain.setValueAtTime(0.35, start)
                gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12)
                osc.connect(gain).connect(ctx.destination)
                osc.start(start)
                osc.stop(start + 0.12)
            })
        } catch {}
    }, [])

    const sendNotification = useCallback((title: string, body: string) => {
        playNotificationSound()
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' })
        }
    }, [playNotificationSound])

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
                const order = payload.new as any
                setOrders(prev => [order, ...prev])
                const desc = `${order.customer_name} - ${order.total_amount?.toLocaleString('fr-FR')} FCFA`
                playNewOrderSound()
                toast.success('Nouvelle commande !', { description: desc, duration: 8000 })
                sendNotification('Nouvelle commande !', desc)
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    // VERROU 1 : Confirmer le paiement (pending → confirmed) — via Server Action
    const confirmPayment = async (orderId: string) => {
        setUpdating(orderId)
        try {
            const adminId = adminInputs[orderId] || undefined
            const result = await adminConfirmPayment(orderId, adminId)
            if (result.error) {
                toast.error(`Erreur: ${result.error}`)
                return
            }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'confirmed', tracking_number: result.tracking_number } : o))
            const order = orders.find(o => o.id === orderId)
            toast.success(`${formatOrderNumber(order)} — Paiement confirmé`, {
                description: `Numéro de suivi : ${result.tracking_number}`,
                duration: 8000
            })
        } catch (err: any) {
            toast.error('Erreur: ' + (err?.message || 'Impossible de confirmer'))
        } finally {
            setUpdating(null)
        }
    }

    // Rejeter une commande
    const rejectOrder = async (orderId: string) => {
        setUpdating(orderId)
        try {
            const result = await adminRejectOrder(orderId)
            if (result.error) {
                toast.error(`Erreur: ${result.error}`)
                return
            }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o))
            toast.success('Commande rejetée')
        } catch (err: any) {
            toast.error('Erreur: ' + (err?.message || 'Impossible de rejeter'))
        } finally {
            setUpdating(null)
        }
    }

    // VERROU 2 : Libérer les fonds (payout_status: pending → paid) — via Server Action
    const releaseFunds = async (orderId: string) => {
        setUpdating(orderId)
        try {
            const result = await adminReleaseFunds(orderId)
            if (result.error) {
                toast.error(`Erreur: ${result.error}`)
                return
            }
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
            case 'rejected': return { label: 'Rejetée', style: 'bg-red-100 text-red-700' }
            default: return { label: 'En attente', style: 'bg-yellow-100 text-yellow-700' }
        }
    }

    const getPaymentBadge = (method: string) => {
        switch (method) {
            case 'mobile_money': return { label: 'MTN MoMo', style: 'bg-yellow-100 text-yellow-700' }
            case 'airtel_money': return { label: 'Airtel Money', style: 'bg-red-100 text-red-700' }
            case 'cash': return { label: 'Cash', style: 'bg-green-100 text-green-700' }
            default: return { label: method || 'Autre', style: 'bg-slate-100 text-slate-600' }
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
                            const isSubscription = order.order_type === 'subscription'

                            return (
                                <div key={order.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 transition-all hover:shadow-md ${
                                    isSubscription
                                        ? 'border-2 border-blue-300 dark:border-blue-700'
                                        : 'border-2 border-amber-200 dark:border-amber-700'
                                }`}>
                                    {/* EN-TÊTE */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none">{formatOrderNumber(order)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString('fr-FR')} à {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {isSubscription && (
                                                <span className="px-4 py-1.5 text-[9px] font-black uppercase italic rounded-full tracking-widest bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    🔷 Abonnement {order.subscription_plan_id ? order.subscription_plan_id.charAt(0).toUpperCase() + order.subscription_plan_id.slice(1) : ''}
                                                </span>
                                            )}
                                            <span className={`px-4 py-1.5 text-[9px] font-black uppercase italic rounded-full tracking-widest ${statusInfo.style}`}>
                                                {statusInfo.label}
                                            </span>
                                            <span className={`px-3 py-1 text-[8px] font-black uppercase italic rounded-full ${payBadge.style}`}>
                                                {payBadge.label}
                                            </span>
                                            {order.tracking_number && (
                                                <span className="flex items-center gap-1.5 px-3 py-1 text-[8px] font-black font-mono uppercase rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                    <Truck size={10} /> {order.tracking_number}
                                                </span>
                                            )}
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
                                            {isSubscription ? (
                                                <div className="bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
                                                    <p className="text-[8px] font-black uppercase text-blue-500 mb-3 tracking-[0.2em]">Abonnement vendeur</p>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-slate-500">Plan</span>
                                                            <span className="font-black text-blue-600">{order.subscription_plan_id ? order.subscription_plan_id.charAt(0).toUpperCase() + order.subscription_plan_id.slice(1) : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold border-t border-blue-200 dark:border-blue-800 pt-2">
                                                            <span className="text-slate-600">Montant abonnement</span>
                                                            <span className="font-black text-blue-600">{(order.total_amount || 0).toLocaleString('fr-FR')} F</span>
                                                        </div>
                                                    </div>
                                                    {order.status === 'confirmed' && (
                                                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                                            <p className="text-[10px] font-black text-green-600">✓ Plan activé automatiquement</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-orange-50/50 dark:bg-orange-500/5 p-5 rounded-[2rem] border border-orange-100 dark:border-orange-900/20">
                                                    <p className="text-[8px] font-black uppercase text-orange-500 mb-3 tracking-[0.2em]">Répartition</p>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-slate-500">Total commande</span>
                                                            <span className="font-black">{(order.total_amount || 0).toLocaleString('fr-FR')} F</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-orange-500">Commission ({Math.round((order.commission_rate || 0.10) * 100)}%)</span>
                                                            <span className="font-black text-orange-500">{commission.toLocaleString('fr-FR')} F</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold border-t border-orange-200 dark:border-orange-800 pt-2">
                                                            <span className="text-slate-600">Part vendeur ({Math.round((1 - (order.commission_rate || 0.10)) * 100)}%)</span>
                                                            <span className="font-black">{vendorPayout.toLocaleString('fr-FR')} F</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* VÉRIFICATION TRANSACTION ID (Mobile Money / Airtel) */}
                                    {order.status === 'pending' && order.transaction_id && (
                                        <div className="mb-6 bg-amber-50/50 dark:bg-amber-500/5 p-5 rounded-[2rem] border border-amber-200 dark:border-amber-800/30">
                                            <p className="text-[8px] font-black uppercase text-amber-600 mb-3 tracking-[0.2em]">🔐 Vérification Transaction</p>

                                            <div className="mb-3">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">ID saisi par le client</p>
                                                <p className="text-base font-black font-mono tracking-wider text-amber-600">
                                                    {order.transaction_id.replace(/(\d{3})(?=\d)/g, '$1 ')}
                                                </p>
                                            </div>

                                            <div className="mb-3">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Entrez l'ID reçu par SMS</p>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={19}
                                                    value={adminInputs[order.id] || ''}
                                                    onChange={e => {
                                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 15)
                                                        setAdminInputs(prev => ({ ...prev, [order.id]: clean }))
                                                    }}
                                                    placeholder="ID du SMS (15 chiffres)"
                                                    className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider outline-none focus:border-amber-500/40 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                />
                                            </div>

                                            {/* Indicateur de correspondance */}
                                            {adminInputs[order.id]?.length === 15 && (
                                                <div className="mt-2">
                                                    {adminInputs[order.id] === order.transaction_id ? (
                                                        <p className="text-green-600 text-[10px] font-black uppercase">
                                                            ✓ Les ID correspondent — vous pouvez valider
                                                        </p>
                                                    ) : (
                                                        <p className="text-red-500 text-[10px] font-black uppercase">
                                                            ✗ Les ID ne correspondent PAS — vérifiez le numéro
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ACTIONS ADMIN */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        {/* VERROU 1 : Confirmer le paiement */}
                                        {order.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => confirmPayment(order.id)}
                                                    disabled={updating === order.id}
                                                    className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                                >
                                                    {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                    Confirmer le paiement
                                                </button>
                                                <button
                                                    onClick={() => rejectOrder(order.id)}
                                                    disabled={updating === order.id}
                                                    className="px-5 py-4 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-500 font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all disabled:opacity-50"
                                                >
                                                    <Ban size={14} /> Rejeter
                                                </button>
                                            </>
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

                                        {/* Reçu PDF */}
                                        {order.status !== 'pending' && (
                                            <button
                                                onClick={() => generateInvoice(order)}
                                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:text-orange-500 transition-all"
                                            >
                                                <Download size={14} /> Reçu PDF
                                            </button>
                                        )}

                                        {/* Contacter le client */}
                                        {order.phone && (
                                            <a
                                                href={`tel:${order.phone}`}
                                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 transition-transform active:scale-95"
                                            >
                                                <Phone size={14} /> Appeler
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
