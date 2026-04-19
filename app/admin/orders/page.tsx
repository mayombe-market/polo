'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import { safeGetUser, withTimeout } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import {
    ShieldCheck, Package, MapPin, Phone, Loader2,
    Filter, Wallet, DollarSign, Clock, Ban, Download, Truck, Search, X, FileDown, Trash2,
    AlertTriangle, RefreshCw, Banknote
} from 'lucide-react'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { formatAdminDateTime } from '@/lib/formatDateTime'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { generateInvoice } from '@/lib/generateInvoice'
import {
    adminConfirmPayment,
    adminReleaseFunds,
    adminRejectOrder,
    adminCancelSubscription,
    adminDeleteOrder,
    adminSetBuyerPaymentNotice,
} from '@/app/actions/orders'
import { assignLogistician, getAvailableLogisticians } from '@/app/actions/deliveries'
import { playNewOrderSound } from '@/lib/notificationSound'
import { useRealtime } from '@/hooks/useRealtime'
import { getAdminScopeFromProfileCity, type AdminZoneScope } from '@/lib/adminZone'
import { normalizeToServiceCityCode, type ServiceCityCode } from '@/lib/deliveryLocation'

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [activeFilter, setActiveFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [adminInputs, setAdminInputs] = useState<Record<string, string>>({})
    const [logisticians, setLogisticians] = useState<any[]>([])
    const [assigningOrder, setAssigningOrder] = useState<string | null>(null)
    const [dateFilter, setDateFilter] = useState('all')
    const [cityFilter, setCityFilter] = useState('all')
    /** `all` = super-admin (ville profil absente ou non reconnue). */
    const [adminScope, setAdminScope] = useState<AdminZoneScope>('all')
    /** Ville du vendeur par user_id (abonnements) ou seller_id (commandes produit). */
    const [vendorCityMap, setVendorCityMap] = useState<Record<string, string | null>>({})

    const supabase = getSupabaseBrowserClient()

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
                const { user } = await safeGetUser(supabase)
                if (!user) return

                const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('city')
                    .eq('id', user.id)
                    .maybeSingle()
                setAdminScope(getAdminScopeFromProfileCity(adminProfile?.city))

                const { data, error } = await withTimeout(supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(500))

                if (error) console.error('Erreur chargement:', error)

                setOrders(data || [])
            } catch (err) {
                console.error('Erreur:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()

        // Charger les logisticiens disponibles
        getAvailableLogisticians().then(({ logisticians: logs }) => setLogisticians(logs))

    }, [supabase])

    useEffect(() => {
        // Collecter tous les seller_id dont on a besoin de connaître la ville
        const allSellerIds = new Set<string>()

        for (const o of orders) {
            if (o.order_type === 'subscription' && o.user_id) {
                allSellerIds.add(o.user_id)
            } else {
                const items: any[] = Array.isArray(o.items) ? o.items : []
                for (const item of items) {
                    if (item.seller_id) allSellerIds.add(item.seller_id)
                }
            }
        }

        const ids = [...allSellerIds]
        if (ids.length === 0) {
            setVendorCityMap({})
            return
        }
        let cancelled = false
        ;(async () => {
            const { data } = await supabase.from('profiles').select('id, city').in('id', ids)
            if (cancelled) return
            const map: Record<string, string | null> = {}
            for (const row of data || []) {
                map[row.id] = row.city ?? null
            }
            setVendorCityMap(map)
        })()
        return () => {
            cancelled = true
        }
    }, [orders, supabase])

    /** Résout la zone d'une commande à partir de la ville du vendeur. */
    const resolveOrderZone = useCallback(
        (order: any): ServiceCityCode | null => {
            if (order.order_type === 'subscription' && order.user_id) {
                return normalizeToServiceCityCode(vendorCityMap[order.user_id])
            }
            const items: any[] = Array.isArray(order.items) ? order.items : []
            const zones = [...new Set(
                items
                    .map((i: any) => i.seller_id)
                    .filter(Boolean)
                    .map((sid: string) => normalizeToServiceCityCode(vendorCityMap[sid]))
            )]
            return zones.length === 1 ? zones[0] : null
        },
        [vendorCityMap]
    )

    const canActOnOrder = useCallback(
        (order: any): boolean => {
            if (adminScope === 'all') return true
            const z = resolveOrderZone(order)
            if (!z) return false
            return z === adminScope
        },
        [adminScope, resolveOrderZone]
    )

    const orderZoneStyle = useCallback(
        (order: any) => {
            const z = resolveOrderZone(order)
            if (z === 'brazzaville') {
                return 'border-2 border-blue-400 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
            }
            if (z === 'pointe-noire') {
                return 'border-2 border-orange-400 dark:border-orange-600 bg-orange-50/70 dark:bg-orange-950/30'
            }
            return 'border-2 border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/50'
        },
        [resolveOrderZone]
    )

    // Realtime : toutes les commandes (vision globale)
    useRealtime('order:insert', (payload) => {
        const order = payload.new as any
        setOrders(prev => [order, ...prev])
        const when = formatAdminDateTime(order.created_at)
        if (order.order_type === 'subscription') {
            toast.info('Nouvel abonnement vendeur', {
                description: `${order.customer_name} — ${order.total_amount?.toLocaleString('fr-FR')} FCFA · ${when}`,
                duration: 5000
            })
        } else {
            const productNames = order.items?.map((i: any) => i.name).join(', ') || 'Produit'
            const deliveryLabel = order.delivery_mode === 'express' ? '⚡ EXPRESS 3-6H' : '📦 Standard'
            const desc = `${order.customer_name} · ${productNames} · ${deliveryLabel} · ${order.total_amount?.toLocaleString('fr-FR')} FCFA · ${when}`
            playNewOrderSound()
            toast.success('Nouvelle commande !', { description: desc, duration: 10000 })
            sendNotification(`Nouvelle commande — ${deliveryLabel}`, `${productNames} · ${order.customer_name} · ${when}`)
        }
    })

    useRealtime('order:update', (payload) => {
        setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
    })

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

    /** Carte in-app acheteur (sans e-mail / SMS) — commande reste en attente. */
    const sendBuyerNotice = async (orderId: string, noticeType: string) => {
        setUpdating(orderId)
        try {
            const result = await adminSetBuyerPaymentNotice(orderId, noticeType)
            if (result.error) {
                toast.error(result.error)
                return
            }
            const now = new Date().toISOString()
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                              ...o,
                              buyer_payment_notice_type: noticeType,
                              buyer_payment_notice_at: now,
                              buyer_payment_notice_dismissed_at: null,
                          }
                        : o,
                ),
            )
            toast.success('Message affiché chez l’acheteur (espace client)', {
                description: 'Sans e-mail ni SMS — carte à la connexion.',
            })
        } catch (err: any) {
            toast.error(err?.message || 'Erreur')
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

    // Assigner un logisticien à une commande
    const handleAssignLogistician = async (orderId: string, logisticianId: string) => {
        setAssigningOrder(orderId)
        try {
            const result = await assignLogistician(orderId, logisticianId)
            if (result.error) {
                toast.error(result.error)
            } else {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, logistician_id: logisticianId } : o))
                toast.success(`Livreur assigné : ${result.logisticianName}`)
            }
        } catch {
            toast.error('Erreur lors de l\'assignation')
        } finally {
            setAssigningOrder(null)
        }
    }

    // Annuler un abonnement vendeur
    const deleteOrderFromDb = async (orderId: string, label: string) => {
        if (!confirm(
            `Supprimer définitivement la commande ${label} ?\n\n` +
            'La ligne sera retirée de la base de données (irréversible). Les notes liées seront aussi supprimées.'
        )) return
        setUpdating(orderId)
        try {
            const result = await adminDeleteOrder(orderId)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setOrders(prev => prev.filter(o => o.id !== orderId))
            toast.success('Commande supprimée de la base')
        } catch (err: any) {
            toast.error('Erreur : ' + (err?.message || 'Impossible de supprimer'))
        } finally {
            setUpdating(null)
        }
    }

    const cancelSubscription = async (orderId: string) => {
        if (!confirm('Annuler cet abonnement ? Le vendeur repassera en plan gratuit.')) return
        setUpdating(orderId)
        try {
            const result = await adminCancelSubscription(orderId)
            if (result.error) {
                toast.error(`Erreur: ${result.error}`)
                return
            }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o))
            toast.success('Abonnement annulé — vendeur repassé en plan gratuit')
        } catch (err: any) {
            toast.error('Erreur: ' + (err?.message || 'Impossible d\'annuler'))
        } finally {
            setUpdating(null)
        }
    }

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'delivered': return { label: 'Livrée', style: 'bg-green-100 text-green-700' }
            case 'picked_up': return { label: 'Récupérée', style: 'bg-violet-100 text-violet-700' }
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

    // Séparer commandes produit et abonnements
    const productOrders = orders.filter(o => o.order_type !== 'subscription')
    const subscriptionOrders = orders.filter(o => o.order_type === 'subscription')

    // Statistiques (commandes produit uniquement)
    const confirmedOrders = productOrders.filter(o => o.status !== 'pending')
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalCommissions = confirmedOrders.reduce((sum, o) => sum + (o.commission_amount || Math.round((o.total_amount || 0) * 0.10)), 0)
    const pendingPayouts = productOrders.filter(o => o.status === 'delivered' && o.payout_status === 'pending').length

    // Filtrage + recherche
    const filteredOrders = (() => {
        let base: any[]
        if (activeFilter === 'subscriptions') base = subscriptionOrders
        else if (activeFilter === 'all') base = productOrders
        else base = productOrders.filter(order => order.status === activeFilter)

        // City filter — basé sur la ville du vendeur (pas du client)
        if (cityFilter !== 'all') {
            base = base.filter(order => resolveOrderZone(order) === cityFilter)
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date()
            const cutoff = new Date()
            if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0)
            else if (dateFilter === '7days') cutoff.setDate(now.getDate() - 7)
            else if (dateFilter === '30days') cutoff.setDate(now.getDate() - 30)
            base = base.filter(order => new Date(order.created_at) >= cutoff)
        }

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            base = base.filter(order =>
                (order.customer_name || '').toLowerCase().includes(q) ||
                (order.customer_phone || '').includes(q) ||
                (order.id || '').toLowerCase().includes(q) ||
                (order.tracking_number || '').toLowerCase().includes(q) ||
                formatOrderNumber(order).toLowerCase().includes(q)
            )
        }
        return base
    })()

    const handleExportCSV = () => {
        exportCSV(filteredOrders, [
            { header: 'N° Commande', accessor: (o: any) => formatOrderNumber(o) },
            { header: 'Client', accessor: (o: any) => o.customer_name || '' },
            { header: 'Téléphone', accessor: (o: any) => o.phone || '' },
            { header: 'Ville', accessor: (o: any) => o.city || '' },
            { header: 'Quartier', accessor: (o: any) => o.district || '' },
            { header: 'Montant (FCFA)', accessor: (o: any) => o.total_amount || 0 },
            { header: 'Frais livraison', accessor: (o: any) => o.delivery_fee || 0 },
            { header: 'Mode livraison', accessor: (o: any) => o.delivery_mode === 'express' ? 'Express' : 'Standard' },
            { header: 'Statut', accessor: (o: any) => getStatusDetails(o.status).label },
            { header: 'Paiement', accessor: (o: any) => getPaymentBadge(o.payment_method).label },
            { header: 'Tracking', accessor: (o: any) => o.tracking_number || '' },
            { header: 'Date et heure', accessor: (o: any) => formatAdminDateTime(o.created_at) },
        ], csvFilename('commandes'))
    }

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
                    <p className="text-[9px] font-black uppercase text-slate-500 mt-3 tracking-widest">
                        {adminScope === 'all'
                            ? 'Super-admin — actions sur toutes les zones'
                            : `Zone admin : ${adminScope === 'brazzaville' ? 'Brazzaville' : 'Pointe-Noire'} — lecture seule hors zone`}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Commandes', val: productOrders.length, icon: <Package size={18} />, color: 'text-slate-600' },
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

                {/* RECHERCHE + EXPORT */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher par nom, téléphone, numéro de commande..."
                            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder:text-slate-400 placeholder:font-normal"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredOrders.length === 0}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500 text-white text-[10px] font-black uppercase italic hover:bg-green-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <FileDown size={14} /> CSV
                    </button>
                </div>

                {/* FILTRE VILLE + DATE */}
                <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                    {/* Ville */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ville :</span>
                        <select
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
                        >
                            <option value="all">Toutes les villes</option>
                            <option value="Brazzaville">Brazzaville</option>
                            <option value="Pointe-Noire">Pointe-Noire</option>
                        </select>
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                    {/* Date */}
                    <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-1">Période :</span>
                    {[
                        { id: 'all', label: 'Tout' },
                        { id: 'today', label: "Aujourd'hui" },
                        { id: '7days', label: '7 jours' },
                        { id: '30days', label: '30 jours' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setDateFilter(f.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border ${
                                dateFilter === f.id
                                    ? 'bg-slate-800 dark:bg-white border-slate-800 dark:border-white text-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    </div>
                </div>

                {/* FILTRES */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'all', label: 'Toutes' },
                        { id: 'pending', label: 'En attente' },
                        { id: 'confirmed', label: 'Confirmées' },
                        { id: 'shipped', label: 'Expédiées' },
                        { id: 'picked_up', label: 'Récupérées' },
                        { id: 'delivered', label: 'Livrées' },
                        { id: 'subscriptions', label: '🔷 Abonnements' },
                    ].map((f) => {
                        const count = f.id === 'all'
                            ? productOrders.length
                            : f.id === 'subscriptions'
                            ? subscriptionOrders.length
                            : productOrders.filter(o => o.status === f.id).length
                        return (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border ${activeFilter === f.id
                                ? f.id === 'subscriptions'
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                                    : 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                }`}
                        >
                            {f.label} ({count})
                        </button>
                        )
                    })}
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
                            const canAct = canActOnOrder(order)

                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-[2.5rem] p-6 md:p-8 transition-all hover:shadow-md ${orderZoneStyle(order)}`}
                                >
                                    {/* EN-TÊTE */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none">{formatOrderNumber(order)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">{formatAdminDateTime(order.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {!canAct && (
                                                <span
                                                    className="px-3 py-1 text-[8px] font-black uppercase rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                                    title="Actions réservées à l’admin de cette ville"
                                                >
                                                    Lecture seule
                                                </span>
                                            )}
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
                                            {!isSubscription && (order.delivery_mode === 'express' ? (
                                                <span className="px-3 py-1 text-[9px] font-black uppercase italic rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse tracking-widest">
                                                    ⚡ EXPRESS 3-6H · {(order.delivery_fee || 2000).toLocaleString('fr-FR')} F
                                                </span>
                                            ) : order.delivery_mode ? (
                                                <span className="px-3 py-1 text-[9px] font-black uppercase italic rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 tracking-widest">
                                                    📦 Standard 6-48H · {(order.delivery_fee || 1000).toLocaleString('fr-FR')} F
                                                </span>
                                            ) : null)}
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
                                                    <CloudinaryImage src={item.img || '/placeholder-image.svg'} alt={item.name || ''} width={48} height={48} className="w-12 h-12 object-cover rounded-xl" />
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-xs font-black uppercase italic leading-tight">{item.name}</h3>
                                                        {(item.selectedSize || item.selectedColor) && (
                                                            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                                                                {[item.selectedSize && `Taille : ${item.selectedSize}`, item.selectedColor && `Couleur : ${item.selectedColor}`]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] font-bold text-green-600 mt-1">{item.price?.toLocaleString('fr-FR')} F × {item.quantity}</p>
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
                                                        {order.delivery_fee > 0 && (
                                                            <div className="flex justify-between text-[10px] font-bold">
                                                                <span className="text-slate-500">↳ dont livraison {order.delivery_mode === 'express' ? '⚡' : '📦'}</span>
                                                                <span className="font-black text-slate-400">{(order.delivery_fee || 0).toLocaleString('fr-FR')} F</span>
                                                            </div>
                                                        )}
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
                                                    maxLength={13}
                                                    value={adminInputs[order.id] || ''}
                                                    onChange={e => {
                                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10)
                                                        setAdminInputs(prev => ({ ...prev, [order.id]: clean }))
                                                    }}
                                                    placeholder="ID du SMS (10 chiffres)"
                                                    disabled={!canAct}
                                                    title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                    className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider outline-none focus:border-amber-500/40 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600 disabled:opacity-40"
                                                />
                                            </div>

                                            {/* Indicateur de correspondance */}
                                            {adminInputs[order.id]?.length === 10 && (
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

                                    {/* ASSIGNATION LOGISTICIEN */}
                                    {(order.status === 'confirmed' || order.status === 'shipped' || order.status === 'picked_up') && !isSubscription && (
                                        <div className="mb-6 bg-violet-50/50 dark:bg-violet-500/5 p-5 rounded-[2rem] border border-violet-200 dark:border-violet-800/30">
                                            <p className="text-[8px] font-black uppercase text-violet-600 mb-3 tracking-[0.2em]">🏍️ Livreur assigné</p>
                                            {order.logistician_id ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                                        <Truck size={14} className="text-violet-600" />
                                                    </div>
                                                    <span className="text-sm font-black text-violet-700 dark:text-violet-400">
                                                        {logisticians.find(l => l.id === order.logistician_id)?.full_name || 'Livreur assigné'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div>
                                                    {logisticians.length > 0 ? (
                                                        <select
                                                            onChange={(e) => {
                                                                if (e.target.value) handleAssignLogistician(order.id, e.target.value)
                                                            }}
                                                            disabled={assigningOrder === order.id || !canAct}
                                                            title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                            className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-violet-500/40 transition-colors disabled:opacity-40"
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>Choisir un livreur...</option>
                                                            {logisticians.map(l => (
                                                                <option key={l.id} value={l.id}>{l.full_name} — {l.phone}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400">Aucun livreur disponible. Ajoutez-en dans Admin → Logisticiens.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ACTIONS ADMIN */}
                                    <div className="flex flex-col gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        {/* VERROU 1 : Confirmer / rejeter */}
                                        {order.status === 'pending' && (
                                            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                                                <button
                                                    onClick={() => confirmPayment(order.id)}
                                                    disabled={updating === order.id || !canAct}
                                                    title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                    className="flex-1 min-w-[140px] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                                >
                                                    {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                    Confirmer le paiement
                                                </button>
                                                <button
                                                    onClick={() => rejectOrder(order.id)}
                                                    disabled={updating === order.id || !canAct}
                                                    title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                    className="px-5 py-4 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-500 font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all disabled:opacity-50 shrink-0"
                                                >
                                                    <Ban size={14} /> Rejeter
                                                </button>
                                            </div>
                                        )}

                                        {/* Messages acheteur in-app (pas d’e-mail / SMS) */}
                                        {order.status === 'pending' && (
                                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4">
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">
                                                    Message client — carte sur l&apos;espace acheteur
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => sendBuyerNotice(order.id, 'invalid_code')}
                                                        disabled={updating === order.id || !canAct}
                                                        title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 text-[9px] font-black uppercase hover:bg-amber-200/80 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors"
                                                    >
                                                        <AlertTriangle size={12} /> Code invalide
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => sendBuyerNotice(order.id, 'partial_payment')}
                                                        disabled={updating === order.id || !canAct}
                                                        title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/25 text-orange-900 dark:text-orange-100 text-[9px] font-black uppercase hover:bg-orange-200/70 dark:hover:bg-orange-900/40 disabled:opacity-50 transition-colors"
                                                    >
                                                        <Banknote size={12} /> Paiement incomplet
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => sendBuyerNotice(order.id, 'no_payment')}
                                                        disabled={updating === order.id || !canAct}
                                                        title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-[9px] font-black uppercase hover:bg-red-200/60 dark:hover:bg-red-950/60 disabled:opacity-50 transition-colors"
                                                    >
                                                        <Ban size={12} /> Aucun paiement
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => sendBuyerNotice(order.id, 'resend_code')}
                                                        disabled={updating === order.id || !canAct}
                                                        title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 text-[9px] font-black uppercase hover:bg-violet-200/70 dark:hover:bg-violet-900/45 disabled:opacity-50 transition-colors"
                                                    >
                                                        <RefreshCw size={12} /> Renvoi du code
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row flex-wrap gap-3">

                                        {/* VERROU 2 : Libérer les fonds */}
                                        {order.status === 'delivered' && order.payout_status === 'pending' && (
                                            canReleaseFunds(order) ? (
                                                <button
                                                    onClick={() => releaseFunds(order.id)}
                                                    disabled={updating === order.id || !canAct}
                                                    title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
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

                                        {/* Annuler abonnement */}
                                        {isSubscription && order.status === 'confirmed' && (
                                            <button
                                                onClick={() => cancelSubscription(order.id)}
                                                disabled={updating === order.id || !canAct}
                                                title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                className="px-5 py-4 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-500 font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all disabled:opacity-50"
                                            >
                                                {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                                                Annuler l'abonnement
                                            </button>
                                        )}

                                        {/* Reçu PDF */}
                                        {order.status !== 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => generateInvoice(order)}
                                                disabled={!canAct}
                                                title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:text-orange-500 transition-all disabled:opacity-40 disabled:pointer-events-none"
                                            >
                                                <Download size={14} /> Reçu PDF
                                            </button>
                                        )}

                                        {/* Contacter le client */}
                                        {order.phone && (
                                            canAct ? (
                                                <a
                                                    href={`tel:${order.phone}`}
                                                    className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 transition-transform active:scale-95"
                                                >
                                                    <Phone size={14} /> Appeler
                                                </a>
                                            ) : (
                                                <span
                                                    title="Actions réservées à l’admin de cette ville"
                                                    className="bg-slate-100 dark:bg-slate-800 text-slate-400 px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 cursor-not-allowed opacity-50"
                                                >
                                                    <Phone size={14} /> Appeler
                                                </span>
                                            )
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => deleteOrderFromDb(order.id, formatOrderNumber(order))}
                                            disabled={updating === order.id || !canAct}
                                            title={!canAct ? 'Actions réservées à l’admin de cette ville' : undefined}
                                            className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-900 px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all disabled:opacity-50"
                                        >
                                            {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            Supprimer de la BDD
                                        </button>
                                    </div>
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
