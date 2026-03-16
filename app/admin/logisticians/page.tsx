'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Search, UserPlus, Truck, Phone, X, Package, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    getAvailableLogisticians,
    promoteToLogistician,
    demoteLogistician,
    searchUserByEmail
} from '@/app/actions/deliveries'
import { withTimeout } from '@/lib/supabase-utils'

const supabase = getSupabaseBrowserClient()


export default function AdminLogisticians() {
    const [logisticians, setLogisticians] = useState<any[]>([])
    const [deliveryCounts, setDeliveryCounts] = useState<Record<string, number>>({})
    const [activeDeliveries, setActiveDeliveries] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [promoting, setPromoting] = useState<string | null>(null)

    useEffect(() => {
        fetchLogisticians()
    }, [])

    const fetchLogisticians = async () => {
        try {
            const { logisticians: data } = await withTimeout(getAvailableLogisticians())
            setLogisticians(data)

            // Fetch delivery counts per logistician
            if (data.length > 0) {
                const ids = data.map((l: any) => l.id)

                // Total delivered per logistician
                const { data: deliveries } = await withTimeout(supabase
                    .from('orders')
                    .select('logistician_id')
                    .in('logistician_id', ids)
                    .eq('status', 'delivered'))

                const counts: Record<string, number> = {}
                ;(deliveries || []).forEach((d: any) => {
                    counts[d.logistician_id] = (counts[d.logistician_id] || 0) + 1
                })
                setDeliveryCounts(counts)

                // Active deliveries (shipped or picked_up)
                const { count } = await withTimeout(supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .in('logistician_id', ids)
                    .in('status', ['shipped', 'picked_up']))

                setActiveDeliveries(count || 0)
            }
        } catch (err) {
            console.error('Erreur chargement logisticiens:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async () => {
        setSearching(true)
        const { users } = await searchUserByEmail(searchQuery.trim())
        setSearchResults(users.filter((u: any) => u.role !== 'logistician'))
        setSearching(false)
    }

    const handlePromote = async (userId: string) => {
        setPromoting(userId)
        const result = await promoteToLogistician(userId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Livreur ajouté avec succès !')
            setShowSearch(false)
            setSearchQuery('')
            setSearchResults([])
            await fetchLogisticians()
        }
        setPromoting(null)
    }

    const handleDemote = async (userId: string) => {
        const result = await demoteLogistician(userId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Livreur retiré')
            setLogisticians(prev => prev.filter(l => l.id !== userId))
        }
    }

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 font-bold">Erreur de chargement</p>
            <button onClick={() => { setError(false); setLoading(true); fetchLogisticians() }} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm">Réessayer</button>
        </div>
    )

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-7xl mx-auto flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                            <span className="text-orange-500">Logisticiens</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {logisticians.length} livreurs actifs
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowSearch(!showSearch)
                            if (!showSearch) {
                                setSearching(true)
                                searchUserByEmail('').then(({ users }) => {
                                    setSearchResults(users.filter((u: any) => u.role !== 'logistician'))
                                    setSearching(false)
                                })
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase italic hover:bg-orange-600 transition-all whitespace-nowrap"
                    >
                        <UserPlus size={14} /> Ajouter
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* STATS */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-blue-500 mb-2"><Truck size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter">{logisticians.length}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Livreurs actifs</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                        <div className="text-amber-500 mb-2"><Package size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-amber-600">{activeDeliveries}</p>
                        <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-1">Livraisons en cours</p>
                    </div>
                </div>

                {/* Recherche d'utilisateur */}
                {showSearch && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-orange-200 dark:border-orange-800/30">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Rechercher un utilisateur</p>
                            <button onClick={() => { setShowSearch(false); setSearchResults([]) }}
                                className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Filtrer par nom ou téléphone..."
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                            <button onClick={handleSearch} disabled={searching}
                                className="px-5 py-3 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 disabled:opacity-50">
                                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {searchResults.map((u: any) => (
                                    <div key={u.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold dark:text-white">{u.full_name || u.first_name || 'Sans nom'}</p>
                                            <p className="text-[10px] text-slate-400">Rôle : {u.role} {u.phone ? `· ${u.phone}` : ''}</p>
                                        </div>
                                        <button
                                            onClick={() => handlePromote(u.id)}
                                            disabled={promoting === u.id}
                                            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-bold hover:bg-orange-600 disabled:opacity-50"
                                        >
                                            {promoting === u.id ? <Loader2 size={12} className="animate-spin" /> : 'Promouvoir'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchResults.length === 0 && !searching && (
                            <p className="text-xs text-slate-400 mt-3 text-center">Aucun utilisateur trouvé</p>
                        )}
                    </div>
                )}

                {/* Liste des logisticiens */}
                {logisticians.length > 0 ? (
                    <div className="space-y-3">
                        {logisticians.map(l => (
                            <div key={l.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-sm transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                    <Truck size={20} className="text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold dark:text-white truncate">{l.full_name || l.first_name || 'Livreur'}</p>
                                    {l.phone && (
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Phone size={10} /> {l.phone}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0 hidden md:block">
                                    <p className="text-sm font-black dark:text-white flex items-center gap-1 justify-end">
                                        <CheckCircle size={12} className="text-green-500" /> {deliveryCounts[l.id] || 0}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Livraisons</p>
                                </div>
                                <button onClick={() => handleDemote(l.id)}
                                    className="flex-shrink-0 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-[10px] font-bold hover:bg-red-50 dark:hover:bg-red-500/5 transition-all">
                                    Retirer
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-400">
                        <Truck size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Aucun livreur enregistré</p>
                        <p className="text-xs text-slate-400 mt-1">Utilisez le bouton ci-dessus pour en ajouter</p>
                    </div>
                )}
            </div>
        </div>
    )
}
