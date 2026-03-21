'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Users, Loader2, CheckCircle, Clock, XCircle, Search, X,
    ShoppingBag, MapPin, Calendar, ExternalLink, Shield, FileDown
} from 'lucide-react'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { withTimeout } from '@/lib/supabase-utils'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const supabase = getSupabaseBrowserClient()


function getPlanBadge(plan: string) {
    const map: Record<string, { label: string; cls: string }> = {
        free: { label: 'Gratuit', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
        starter: { label: 'Starter', cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
        pro: { label: 'Pro', cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
        premium: { label: 'Premium', cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
    }
    const p = map[plan] || map.free
    return <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${p.cls}`}>{p.label}</span>
}

function getVerifBadge(status: string) {
    switch (status) {
        case 'verified': return <span className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"><CheckCircle size={10} /> Vérifié</span>
        case 'pending': return <span className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><Clock size={10} /> En attente</span>
        case 'rejected': return <span className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"><XCircle size={10} /> Refusé</span>
        default: return <span className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"><Shield size={10} /> Non vérifié</span>
    }
}

export default function AdminVendorsPage() {
    const [vendors, setVendors] = useState<any[]>([])
    const [productCounts, setProductCounts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const { data } = await withTimeout(supabase
                    .from('profiles')
                    .select('id, first_name, last_name, shop_name, store_name, email, phone, city, role, subscription_plan, verification_status, avatar_url, created_at')
                    .eq('role', 'vendor')
                    .order('created_at', { ascending: false }))

                setVendors(data || [])

                // Fetch product counts per vendor
                if (data && data.length > 0) {
                    const ids = data.map((v: { id: string }) => v.id)
                    const { data: products } = await withTimeout(supabase
                        .from('products')
                        .select('seller_id')
                        .in('seller_id', ids))

                    const counts: Record<string, number> = {}
                    ;(products || []).forEach((p: any) => {
                        counts[p.seller_id] = (counts[p.seller_id] || 0) + 1
                    })
                    setProductCounts(counts)
                }
            } catch (err) {
                console.error('Erreur chargement vendeurs:', err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }

        fetchVendors()
    }, [])

    // Stats
    const totalVendors = vendors.length
    const verifiedCount = vendors.filter(v => v.verification_status === 'verified').length
    const pendingCount = vendors.filter(v => v.verification_status === 'pending').length

    // Filtrage
    const filteredVendors = (() => {
        let base = vendors
        if (filter === 'verified') base = base.filter(v => v.verification_status === 'verified')
        else if (filter === 'unverified') base = base.filter(v => v.verification_status === 'unverified' || !v.verification_status)
        else if (filter === 'pending') base = base.filter(v => v.verification_status === 'pending')

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
        return base
    })()

    const handleExportCSV = () => {
        exportCSV(filteredVendors, [
            { header: 'Nom', accessor: (v: any) => v.last_name || '' },
            { header: 'Prénom', accessor: (v: any) => v.first_name || '' },
            { header: 'Boutique', accessor: (v: any) => v.shop_name || v.store_name || '' },
            { header: 'Email', accessor: (v: any) => v.email || '' },
            { header: 'Téléphone', accessor: (v: any) => v.phone || '' },
            { header: 'Ville', accessor: (v: any) => v.city || '' },
            { header: 'Plan', accessor: (v: any) => v.subscription_plan || 'free' },
            { header: 'Vérification', accessor: (v: any) => v.verification_status || 'unverified' },
            { header: 'Produits', accessor: (v: any) => productCounts[v.id] || 0 },
            { header: 'Date et heure inscription', accessor: (v: any) => formatAdminDateTime(v.created_at) },
        ], csvFilename('vendeurs'))
    }

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 font-bold">Erreur de chargement des vendeurs</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm">Réessayer</button>
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
                <div className="max-w-7xl mx-auto flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                            <span className="text-orange-500">Vendeurs</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {totalVendors} vendeurs inscrits — {verifiedCount} vérifiés
                        </p>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredVendors.length === 0}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500 text-white text-[10px] font-black uppercase italic hover:bg-green-600 transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                        <FileDown size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* STATS */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-blue-500 mb-2"><Users size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter">{totalVendors}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Total</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-green-200 dark:border-green-800/30">
                        <div className="text-green-500 mb-2"><CheckCircle size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-green-600">{verifiedCount}</p>
                        <p className="text-[9px] font-black uppercase text-green-500 tracking-widest mt-1">Vérifiés</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                        <div className="text-amber-500 mb-2"><Clock size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-amber-600">{pendingCount}</p>
                        <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-1">En attente</p>
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
                        { id: 'all', label: 'Tous' },
                        { id: 'verified', label: 'Vérifiés' },
                        { id: 'unverified', label: 'Non vérifiés' },
                        { id: 'pending', label: 'En attente' },
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
                        <Users size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Aucun vendeur trouvé</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredVendors.map((vendor) => (
                            <div key={vendor.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                                    {vendor.avatar_url ? (
                                        <Image src={vendor.avatar_url} alt="" width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                    ) : (
                                        <span className="text-lg">{(vendor.first_name?.[0] || '?')}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold dark:text-white truncate">
                                            {vendor.first_name} {vendor.last_name}
                                        </p>
                                        {getVerifBadge(vendor.verification_status)}
                                        {getPlanBadge(vendor.subscription_plan || 'free')}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-0.5">
                                            <ShoppingBag size={10} />
                                            {vendor.shop_name || vendor.store_name || 'Boutique'}
                                        </span>
                                        {vendor.city && (
                                            <span className="flex items-center gap-0.5">
                                                <MapPin size={10} />
                                                {vendor.city}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-0.5">
                                            <Calendar size={10} />
                                            {formatAdminDateTime(vendor.created_at)}
                                        </span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="text-right flex-shrink-0 hidden md:block">
                                    <p className="text-sm font-black dark:text-white">{productCounts[vendor.id] || 0}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Produits</p>
                                </div>

                                {/* Action */}
                                <Link
                                    href={`/seller/${vendor.id}`}
                                    className="flex-shrink-0 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-orange-100 hover:text-orange-500 dark:hover:bg-orange-900/20 transition-colors no-underline"
                                    title="Voir le profil"
                                >
                                    <ExternalLink size={16} />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
