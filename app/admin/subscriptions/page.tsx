'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { withTimeout } from '@/lib/supabase-utils'
import { getDaysRemaining, getSubscriptionStatus } from '@/lib/subscription'
import {
    CreditCard, Loader2, Search, X, Phone, Mail,
    AlertTriangle, CheckCircle, Clock, XCircle, MapPin, FileDown,
} from 'lucide-react'
import { exportCSV, csvFilename } from '@/lib/exportCSV'

const supabase = getSupabaseBrowserClient()

const EXPIRING_SOON_DAYS = 7

type SubStatus = 'active' | 'expiring' | 'expired' | 'free' | 'grace'

function getSubStatus(vendor: any): SubStatus {
    const status = getSubscriptionStatus(vendor)
    if (status === 'free' || status === 'legacy') return 'free'
    if (status === 'expired') return 'expired'
    if (status === 'grace') return 'grace'
    const days = getDaysRemaining(vendor.subscription_end_date)
    if (days >= 0 && days <= EXPIRING_SOON_DAYS) return 'expiring'
    return 'active'
}

function StatusBadge({ vendor }: { vendor: any }) {
    const status = getSubStatus(vendor)
    const days = getDaysRemaining(vendor.subscription_end_date)

    if (status === 'free') return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Clock size={10} /> Gratuit
        </span>
    )
    if (status === 'expired') return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <XCircle size={10} /> Expiré
        </span>
    )
    if (status === 'grace') return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
            <AlertTriangle size={10} /> Grâce {days < 0 ? '' : `${days}j`}
        </span>
    )
    if (status === 'expiring') return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle size={10} /> Expire dans {days}j
        </span>
    )
    return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle size={10} /> Actif · {days}j
        </span>
    )
}

function PlanBadge({ plan }: { plan: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        starter: { label: 'Starter', cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
        pro: { label: 'Pro', cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
        premium: { label: 'Premium', cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
    }
    const p = map[plan]
    if (!p) return null
    return <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${p.cls}`}>{p.label}</span>
}

export default function AdminSubscriptionsPage() {
    const [vendors, setVendors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        ;(async () => {
            try {
                const { data } = await withTimeout(
                    supabase
                        .from('profiles')
                        .select('id, first_name, last_name, shop_name, store_name, email, phone, city, subscription_plan, subscription_end_date, subscription_billing, subscription_start_date')
                        .eq('role', 'vendor')
                        .order('subscription_end_date', { ascending: true, nullsFirst: false })
                )
                setVendors(data || [])
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    // Counts
    const expiringCount = vendors.filter(v => getSubStatus(v) === 'expiring').length
    const expiredCount = vendors.filter(v => getSubStatus(v) === 'expired' || getSubStatus(v) === 'grace').length
    const activeCount = vendors.filter(v => getSubStatus(v) === 'active').length
    const freeCount = vendors.filter(v => getSubStatus(v) === 'free').length

    const filteredVendors = (() => {
        let base = vendors
        if (filter === 'active') base = base.filter(v => getSubStatus(v) === 'active')
        else if (filter === 'expiring') base = base.filter(v => getSubStatus(v) === 'expiring')
        else if (filter === 'expired') base = base.filter(v => getSubStatus(v) === 'expired' || getSubStatus(v) === 'grace')
        else if (filter === 'free') base = base.filter(v => getSubStatus(v) === 'free')

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            base = base.filter(v =>
                (v.first_name || '').toLowerCase().includes(q) ||
                (v.last_name || '').toLowerCase().includes(q) ||
                (v.shop_name || '').toLowerCase().includes(q) ||
                (v.store_name || '').toLowerCase().includes(q) ||
                (v.email || '').toLowerCase().includes(q) ||
                (v.phone || '').includes(q)
            )
        }

        // Trier : expirés/grâce → expire bientôt → actif → gratuit
        const order: Record<SubStatus, number> = { grace: 0, expired: 0, expiring: 1, active: 2, free: 3 }
        return [...base].sort((a, b) => {
            const sa = getSubStatus(a)
            const sb = getSubStatus(b)
            if (order[sa] !== order[sb]) return order[sa] - order[sb]
            // Même catégorie : trier par jours restants croissant
            return getDaysRemaining(a.subscription_end_date) - getDaysRemaining(b.subscription_end_date)
        })
    })()

    const handleExport = () => {
        exportCSV(filteredVendors, [
            { header: 'Prénom', accessor: (v: any) => v.first_name || '' },
            { header: 'Nom', accessor: (v: any) => v.last_name || '' },
            { header: 'Boutique', accessor: (v: any) => v.shop_name || v.store_name || '' },
            { header: 'Email', accessor: (v: any) => v.email || '' },
            { header: 'Téléphone', accessor: (v: any) => v.phone || '' },
            { header: 'Ville', accessor: (v: any) => v.city || '' },
            { header: 'Plan', accessor: (v: any) => v.subscription_plan || 'free' },
            { header: 'Facturation', accessor: (v: any) => v.subscription_billing || '' },
            { header: 'Expiration', accessor: (v: any) => v.subscription_end_date ? new Date(v.subscription_end_date).toLocaleDateString('fr-FR') : '' },
            { header: 'Jours restants', accessor: (v: any) => getDaysRemaining(v.subscription_end_date) },
            { header: 'Statut', accessor: (v: any) => getSubStatus(v) },
        ], csvFilename('abonnements-vendeurs'))
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
                <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                            <span className="text-orange-500">Abonnements</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Suivi des abonnements vendeurs
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={filteredVendors.length === 0}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500 text-white text-[10px] font-black uppercase italic hover:bg-green-600 transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                        <FileDown size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-green-200 dark:border-green-800/30">
                        <div className="text-green-500 mb-2"><CheckCircle size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-green-600">{activeCount}</p>
                        <p className="text-[9px] font-black uppercase text-green-500 tracking-widest mt-1">Actifs</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                        <div className="text-amber-500 mb-2"><AlertTriangle size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-amber-600">{expiringCount}</p>
                        <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-1">Expire ≤ 7j</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-800/30">
                        <div className="text-red-500 mb-2"><XCircle size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-red-600">{expiredCount}</p>
                        <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mt-1">Expirés</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400 mb-2"><Clock size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-slate-500">{freeCount}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Gratuit</p>
                    </div>
                </div>

                {/* RECHERCHE */}
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom, boutique, email, téléphone..."
                        className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder:text-slate-400 placeholder:font-normal"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* FILTRES */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                        { id: 'all', label: `Tous (${vendors.length})` },
                        { id: 'expiring', label: `⚠️ Expire bientôt (${expiringCount})` },
                        { id: 'expired', label: `Expirés (${expiredCount})` },
                        { id: 'active', label: `Actifs (${activeCount})` },
                        { id: 'free', label: `Gratuit (${freeCount})` },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border ${
                                filter === f.id
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* LISTE */}
                {filteredVendors.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Aucun vendeur trouvé</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredVendors.map((vendor) => {
                            const days = getDaysRemaining(vendor.subscription_end_date)
                            const subStatus = getSubStatus(vendor)
                            const endDate = vendor.subscription_end_date
                                ? new Date(vendor.subscription_end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                : null

                            const rowBorder =
                                subStatus === 'expired' || subStatus === 'grace'
                                    ? 'border-red-200 dark:border-red-800/30'
                                    : subStatus === 'expiring'
                                        ? 'border-amber-200 dark:border-amber-800/30'
                                        : 'border-slate-100 dark:border-slate-800'

                            return (
                                <div key={vendor.id} className={`bg-white dark:bg-slate-900 rounded-2xl border ${rowBorder} p-4 flex items-center gap-4 hover:shadow-sm transition-shadow`}>
                                    {/* Avatar */}
                                    <div className="w-11 h-11 rounded-xl flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                                        {(vendor.first_name?.[0] || '?').toUpperCase()}
                                    </div>

                                    {/* Info principale */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold dark:text-white truncate">
                                                {vendor.first_name} {vendor.last_name}
                                            </p>
                                            <PlanBadge plan={vendor.subscription_plan || 'free'} />
                                            <StatusBadge vendor={vendor} />
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                                            {vendor.shop_name || vendor.store_name || 'Boutique sans nom'}
                                            {vendor.city && <span className="ml-2 inline-flex items-center gap-0.5"><MapPin size={9} />{vendor.city}</span>}
                                        </p>

                                        {/* Contact */}
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            {vendor.phone && (
                                                <a
                                                    href={`tel:${vendor.phone}`}
                                                    className="flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 hover:underline"
                                                >
                                                    <Phone size={11} />
                                                    {vendor.phone}
                                                </a>
                                            )}
                                            {vendor.email && (
                                                <a
                                                    href={`mailto:${vendor.email}`}
                                                    className="flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 hover:underline truncate max-w-[180px]"
                                                >
                                                    <Mail size={11} />
                                                    {vendor.email}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="text-right flex-shrink-0 hidden sm:block">
                                        {endDate ? (
                                            <>
                                                <p className={`text-sm font-black ${
                                                    subStatus === 'expired' || subStatus === 'grace' ? 'text-red-500'
                                                    : subStatus === 'expiring' ? 'text-amber-500'
                                                    : 'text-slate-700 dark:text-slate-200'
                                                }`}>
                                                    {subStatus === 'expired' || subStatus === 'grace'
                                                        ? `Expiré il y a ${Math.abs(days)}j`
                                                        : `${days}j restants`}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Fin le {endDate}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 font-bold">Pas d&apos;abonnement</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
