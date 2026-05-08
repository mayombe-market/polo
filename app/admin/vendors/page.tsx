'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Users, Loader2, CheckCircle, Clock, XCircle, Search, X,
    ShoppingBag, MapPin, Calendar, ExternalLink, Shield, FileDown, Settings2, Trash2, UserMinus
} from 'lucide-react'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { withTimeout } from '@/lib/supabase-utils'
import { formatAdminDateTime } from '@/lib/formatDateTime'
import { adminDeleteVendor, adminDemoteVendor } from '@/app/actions/admin'

const supabase = getSupabaseBrowserClient()


function getPlanBadge(plan: string) {
    const map: Record<string, { label: string; cls: string }> = {
        free:        { label: 'Gratuit',    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
        gratuit:     { label: 'Gratuit',    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
        starter:     { label: 'Starter',    cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
        pro:         { label: 'Pro',        cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
        premium:     { label: 'Premium',    cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
        immo_free:   { label: '🏠 Particulier', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
        immo_agent:  { label: '🏅 Agent',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
        immo_agence: { label: '🥇 Agence',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
    }
    const p = map[plan] || map.free
    return <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${p.cls}`}>{p.label}</span>
}

function VendorTypeBadge({ vendorType }: { vendorType?: string }) {
    if (vendorType === 'immobilier') return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30">
            🏠 Immo
        </span>
    )
    if (vendorType === 'hotel') return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30">
            🏨 Hôtel
        </span>
    )
    if (vendorType === 'patisserie') return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/30">
            🎂 Pâtisserie
        </span>
    )
    if (vendorType === 'restaurant') return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30">
            🍽️ Restaurant
        </span>
    )
    return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            🛍️ Marketplace
        </span>
    )
}

const PAGE_OPTIONS = [
    { key: 'marketplace', label: 'Marketplace', emoji: '🛍️', desc: 'Mode, High-Tech, Maison…' },
    { key: 'patisserie',  label: 'Pâtisserie',  emoji: '🎂', desc: 'Pâtisserie & Traiteur' },
    { key: 'restaurant',  label: 'Restaurant',  emoji: '🍽️', desc: 'Alimentation & Boissons' },
    { key: 'immobilier',  label: 'Immobilier',  emoji: '🏠', desc: 'Annonces immobilières' },
]

function VendorPagesModal({ vendor, onClose, onSaved }: {
    vendor: any
    onClose: () => void
    onSaved: (id: string, pages: string[]) => void
}) {
    const [selected, setSelected] = useState<string[]>(vendor.vendor_pages || ['marketplace'])
    const [saving, setSaving] = useState(false)

    const toggle = (key: string) => {
        setSelected(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        )
    }

    const save = async () => {
        if (selected.length === 0) return
        setSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update({ vendor_pages: selected })
            .eq('id', vendor.id)
        setSaving(false)
        if (!error) {
            onSaved(vendor.id, selected)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-sm font-black dark:text-white">Accès pages</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">{vendor.shop_name || vendor.store_name || `${vendor.first_name} ${vendor.last_name}`}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-2 mb-6">
                    {PAGE_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => toggle(opt.key)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                selected.includes(opt.key)
                                    ? 'border-[#163D2B] bg-[#163D2B]/5 dark:border-green-500 dark:bg-green-500/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <span className="text-xl">{opt.emoji}</span>
                            <div className="flex-1">
                                <p className={`text-xs font-bold ${selected.includes(opt.key) ? 'text-[#163D2B] dark:text-green-400' : 'dark:text-white'}`}>{opt.label}</p>
                                <p className="text-[10px] text-slate-400">{opt.desc}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selected.includes(opt.key)
                                    ? 'border-[#163D2B] bg-[#163D2B] dark:border-green-500 dark:bg-green-500'
                                    : 'border-slate-300 dark:border-slate-600'
                            }`}>
                                {selected.includes(opt.key) && <CheckCircle size={12} className="text-white" />}
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={save}
                    disabled={saving || selected.length === 0}
                    className="w-full py-3 rounded-xl bg-[#163D2B] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </div>
        </div>
    )
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
    const [editingVendor, setEditingVendor] = useState<any | null>(null)
    const [deletingVendor, setDeletingVendor] = useState<any | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [demotingVendor, setDemotingVendor] = useState<any | null>(null)
    const [demoteLoading, setDemoteLoading] = useState(false)
    const [demoteError, setDemoteError] = useState('')

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const { data } = await withTimeout(supabase
                    .from('profiles')
                    .select('id, first_name, last_name, shop_name, store_name, email, phone, city, role, subscription_plan, vendor_type, vendor_pages, verification_status, avatar_url, created_at')
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
    const immoCount        = vendors.filter(v => v.vendor_type === 'immobilier').length
    const hotelCount       = vendors.filter(v => v.vendor_type === 'hotel').length
    const patisserieCount  = vendors.filter(v => v.vendor_type === 'patisserie').length
    const restaurantCount  = vendors.filter(v => v.vendor_type === 'restaurant').length
    const marketplaceCount = vendors.filter(v => !['immobilier','hotel','patisserie','restaurant'].includes(v.vendor_type)).length

    // Filtrage
    const filteredVendors = (() => {
        let base = vendors
        if (filter === 'verified') base = base.filter(v => v.verification_status === 'verified')
        else if (filter === 'unverified') base = base.filter(v => v.verification_status === 'unverified' || !v.verification_status)
        else if (filter === 'pending') base = base.filter(v => v.verification_status === 'pending')
        else if (filter === 'immobilier')  base = base.filter(v => v.vendor_type === 'immobilier')
        else if (filter === 'hotel')       base = base.filter(v => v.vendor_type === 'hotel')
        else if (filter === 'patisserie')  base = base.filter(v => v.vendor_type === 'patisserie')
        else if (filter === 'restaurant')  base = base.filter(v => v.vendor_type === 'restaurant')
        else if (filter === 'marketplace') base = base.filter(v => !['immobilier','hotel','patisserie','restaurant'].includes(v.vendor_type))

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
            { header: 'Type', accessor: (v: any) => v.vendor_type || 'marketplace' },
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="mb-2 text-lg">🛍️</div>
                        <p className="text-2xl font-black italic tracking-tighter text-slate-700 dark:text-slate-200">{marketplaceCount}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Marketplace</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/30">
                        <div className="text-blue-500 mb-2 text-lg">🏠</div>
                        <p className="text-2xl font-black italic tracking-tighter text-blue-600">{immoCount}</p>
                        <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest mt-1">Immobilier</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-800/30">
                        <div className="mb-2 text-lg">🎂</div>
                        <p className="text-2xl font-black italic tracking-tighter text-rose-600">{patisserieCount}</p>
                        <p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mt-1">Pâtisserie</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-orange-200 dark:border-orange-800/30">
                        <div className="mb-2 text-lg">🍽️</div>
                        <p className="text-2xl font-black italic tracking-tighter text-orange-600">{restaurantCount}</p>
                        <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mt-1">Restaurant</p>
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
                        { id: 'all',         label: 'Tous' },
                        { id: 'pending',     label: `⏳ En attente (${pendingCount})` },
                        { id: 'verified',    label: '✅ Vérifiés' },
                        { id: 'unverified',  label: '⚠️ Non vérifiés' },
                        { id: 'marketplace', label: `🛍️ Marketplace (${marketplaceCount})` },
                        { id: 'immobilier',  label: `🏠 Immobilier (${immoCount})` },
                        { id: 'patisserie',  label: `🎂 Pâtisserie (${patisserieCount})` },
                        { id: 'restaurant',  label: `🍽️ Restaurant (${restaurantCount})` },
                        { id: 'hotel',       label: `🏨 Hôtellerie (${hotelCount})` },
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
                                        <img src={vendor.avatar_url} alt="" width={48} height={48} className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
                                        <VendorTypeBadge vendorType={vendor.vendor_type} />
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

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setEditingVendor(vendor)}
                                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-[#163D2B]/10 hover:text-[#163D2B] dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                                        title="Gérer les accès pages"
                                    >
                                        <Settings2 size={16} />
                                    </button>
                                    <Link
                                        href={`/seller/${vendor.id}`}
                                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-orange-100 hover:text-orange-500 dark:hover:bg-orange-900/20 transition-colors no-underline"
                                        title="Voir le profil"
                                    >
                                        <ExternalLink size={16} />
                                    </Link>
                                    <button
                                        onClick={() => { setDemotingVendor(vendor); setDemoteError('') }}
                                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors"
                                        title="Rétrograder en acheteur"
                                    >
                                        <UserMinus size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setDeletingVendor(vendor); setDeleteError('') }}
                                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                        title="Supprimer ce vendeur"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal accès pages */}
            {editingVendor && (
                <VendorPagesModal
                    vendor={editingVendor}
                    onClose={() => setEditingVendor(null)}
                    onSaved={(id, pages) => {
                        setVendors(prev => prev.map(v => v.id === id ? { ...v, vendor_pages: pages } : v))
                        setEditingVendor(null)
                    }}
                />
            )}

            {/* Modal confirmation rétrogradation vendeur → acheteur */}
            {demotingVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800/40 w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                <UserMinus size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-white">Rétrograder en acheteur ?</h3>
                                <p className="text-xs text-slate-500">Le compte est conservé</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 mb-4">
                            <p className="font-bold text-gray-800 dark:text-white text-sm">{demotingVendor.shop_name || demotingVendor.full_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">✉️ {demotingVendor.email}</p>
                            {demotingVendor.phone && (
                                <p className="text-xs text-slate-500 mt-0.5">📱 {demotingVendor.phone}</p>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                            Ce vendeur va <strong>perdre son accès boutique</strong> :
                        </p>
                        <ul className="text-xs text-slate-500 space-y-1 mb-2 ml-3">
                            <li>• Plus d'accès au dashboard vendeur</li>
                            <li>• Ses produits seront masqués</li>
                            <li>• Son abonnement et sa vérification sont effacés</li>
                        </ul>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-5">
                            ✅ Son compte, son email et son historique de commandes sont conservés.
                        </p>

                        {demoteError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{demoteError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDemotingVendor(null); setDemoteError('') }}
                                disabled={demoteLoading}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    setDemoteLoading(true)
                                    setDemoteError('')
                                    const res = await adminDemoteVendor(demotingVendor.id)
                                    setDemoteLoading(false)
                                    if ('error' in res) {
                                        setDemoteError(res.error)
                                    } else {
                                        setVendors(prev => prev.filter(v => v.id !== demotingVendor.id))
                                        setDemotingVendor(null)
                                    }
                                }}
                                disabled={demoteLoading}
                                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {demoteLoading ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                                {demoteLoading ? 'En cours…' : 'Rétrograder en acheteur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmation suppression vendeur */}
            {deletingVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-800/40 w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-white">Supprimer ce vendeur ?</h3>
                                <p className="text-xs text-slate-500">Action irréversible</p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl p-4 mb-4">
                            <p className="font-bold text-gray-800 dark:text-white text-sm">{deletingVendor.shop_name || deletingVendor.full_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">✉️ {deletingVendor.email}</p>
                            {deletingVendor.phone && (
                                <p className="text-xs text-slate-500 mt-0.5">📱 {deletingVendor.phone}</p>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                            Cela va <strong>supprimer définitivement</strong> :
                        </p>
                        <ul className="text-xs text-slate-500 space-y-1 mb-5 ml-3">
                            <li>• Le compte et le profil du vendeur</li>
                            <li>• Tous ses produits</li>
                            <li>• Son historique et ses données</li>
                        </ul>

                        {deleteError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{deleteError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeletingVendor(null); setDeleteError('') }}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    setDeleteLoading(true)
                                    setDeleteError('')
                                    const res = await adminDeleteVendor(deletingVendor.id)
                                    setDeleteLoading(false)
                                    if ('error' in res) {
                                        setDeleteError(res.error)
                                    } else {
                                        setVendors(prev => prev.filter(v => v.id !== deletingVendor.id))
                                        setDeletingVendor(null)
                                    }
                                }}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                {deleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
