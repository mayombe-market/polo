'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, UserPlus, Truck, Phone, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    getAvailableLogisticians,
    promoteToLogistician,
    demoteLogistician,
    searchUserByEmail
} from '@/app/actions/deliveries'

export default function AdminLogisticians() {
    const [logisticians, setLogisticians] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [promoting, setPromoting] = useState<string | null>(null)

    useEffect(() => {
        fetchLogisticians()
    }, [])

    const fetchLogisticians = async () => {
        const { logisticians: data } = await getAvailableLogisticians()
        setLogisticians(data)
        setLoading(false)
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        const { users } = await searchUserByEmail(searchQuery.trim())
        // Exclure les logisticiens déjà existants
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-500" size={40} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <Link href="/admin/orders" className="text-xs text-slate-400 flex items-center gap-1 mb-4 hover:text-orange-500">
                        <ArrowLeft size={12} /> Retour aux commandes
                    </Link>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                        Gestion <span className="text-violet-500">Livreurs</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Ajoutez et gérez les logisticiens de la plateforme
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Bouton ajouter */}
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl font-black uppercase italic text-[10px] hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20"
                >
                    <UserPlus size={14} /> Ajouter un livreur
                </button>

                {/* Recherche d'utilisateur */}
                {showSearch && (
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-violet-200 dark:border-violet-800/30">
                        <div className="flex items-center gap-2 mb-4">
                            <p className="text-[8px] font-black uppercase text-violet-600 tracking-[0.2em]">Rechercher un utilisateur</p>
                            <button onClick={() => { setShowSearch(false); setSearchResults([]) }}
                                className="ml-auto text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Rechercher par nom..."
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-violet-500/40"
                            />
                            <button onClick={handleSearch} disabled={searching}
                                className="px-5 py-3 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 disabled:opacity-50">
                                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>

                        {/* Résultats */}
                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {searchResults.map((u: any) => (
                                    <div key={u.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                        <div>
                                            <p className="text-sm font-bold">{u.full_name || u.first_name || 'Sans nom'}</p>
                                            <p className="text-[10px] text-slate-400">Rôle actuel : {u.role} {u.phone ? `· ${u.phone}` : ''}</p>
                                        </div>
                                        <button
                                            onClick={() => handlePromote(u.id)}
                                            disabled={promoting === u.id}
                                            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 disabled:opacity-50"
                                        >
                                            {promoting === u.id ? <Loader2 size={12} className="animate-spin" /> : 'Promouvoir livreur'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchResults.length === 0 && searchQuery && !searching && (
                            <p className="text-xs text-slate-400 mt-3 text-center">Aucun résultat</p>
                        )}
                    </div>
                )}

                {/* Liste des logisticiens */}
                <div className="space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Logisticiens actifs ({logisticians.length})
                    </p>

                    {logisticians.length > 0 ? logisticians.map(l => (
                        <div key={l.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Truck size={20} className="text-violet-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black uppercase italic text-sm">{l.full_name || 'Livreur'}</p>
                                {l.phone && (
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Phone size={10} /> {l.phone}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => handleDemote(l.id)}
                                className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-[10px] font-bold hover:bg-red-50 dark:hover:bg-red-500/5 transition-all">
                                Retirer
                            </button>
                        </div>
                    )) : (
                        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                            <Truck className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-xs font-black uppercase italic text-slate-400">Aucun livreur enregistré</p>
                            <p className="text-[10px] text-slate-400 mt-1">Utilisez le bouton ci-dessus pour en ajouter</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
