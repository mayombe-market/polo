'use client'

import { useState, useEffect } from 'react'
import { Loader2, UserPlus, X, Search, UserCheck, UserX, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import {
    getComptables,
    promoteToComptable,
    demoteComptable,
    searchUsersForPromotion,
} from '@/app/actions/comptable'
import {
    getAvailableLogisticians,
    promoteToLogistician,
    demoteLogistician,
    searchUserByEmail,
} from '@/app/actions/deliveries'
import { formatAdminDateTime } from '@/lib/formatDateTime'

type Tab = 'comptable' | 'logistician'

export default function AdminEquipePage() {
    const [tab, setTab] = useState<Tab>('comptable')
    const [comptables, setComptables] = useState<any[]>([])
    const [logisticians, setLogisticians] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Recherche / promotion
    const [showSearch, setShowSearch] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [promoting, setPromoting] = useState<string | null>(null)
    const [demoting, setDemoting] = useState<string | null>(null)

    useEffect(() => { loadAll() }, [])

    const loadAll = async () => {
        setLoading(true)
        try {
            const [c, l] = await Promise.all([getComptables(), getAvailableLogisticians()])
            setComptables(c.data || [])
            setLogisticians(l.logisticians || [])
        } catch (e) {
            console.error('Erreur chargement équipe:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async () => {
        setSearching(true)
        if (tab === 'comptable') {
            const { users } = await searchUsersForPromotion(query)
            setResults(users)
        } else {
            const { users } = await searchUserByEmail(query)
            setResults(users.filter((u: any) => u.role !== 'logistician'))
        }
        setSearching(false)
    }

    const handlePromote = async (userId: string) => {
        setPromoting(userId)
        const res = tab === 'comptable'
            ? await promoteToComptable(userId)
            : await promoteToLogistician(userId)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(tab === 'comptable' ? 'Comptable ajoutée ✓' : 'Livreur ajouté ✓')
            setShowSearch(false)
            setQuery('')
            setResults([])
            loadAll()
        }
        setPromoting(null)
    }

    const handleDemote = async (userId: string, currentTab: Tab) => {
        setDemoting(userId)
        const res = currentTab === 'comptable'
            ? await demoteComptable(userId)
            : await demoteLogistician(userId)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Rôle retiré')
            if (currentTab === 'comptable') setComptables(prev => prev.filter(c => c.id !== userId))
            else setLogisticians(prev => prev.filter(l => l.id !== userId))
        }
        setDemoting(null)
    }

    const currentList = tab === 'comptable' ? comptables : logisticians

    const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
        { id: 'comptable',    label: 'Comptables',   icon: '💼', color: 'bg-green-500' },
        { id: 'logistician',  label: 'Logisticiens', icon: '🚚', color: 'bg-orange-500' },
    ]

    const ROLE_INFO: Record<Tab, { title: string; desc: string; accent: string; emptyMsg: string }> = {
        comptable: {
            title: 'Comptables',
            desc: 'Accès au module financier — payouts, abonnements, virements, export CSV',
            accent: 'green',
            emptyMsg: 'Aucune comptable enregistrée',
        },
        logistician: {
            title: 'Livreurs',
            desc: 'Accès aux commandes à livrer — gestion des statuts de livraison',
            accent: 'orange',
            emptyMsg: 'Aucun livreur enregistré',
        },
    }

    const info = ROLE_INFO[tab]

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-4xl mx-auto flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">
                            <span className="text-orange-500">Équipe</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {comptables.length} comptable{comptables.length > 1 ? 's' : ''} · {logisticians.length} livreur{logisticians.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowSearch(!showSearch)
                            if (!showSearch) {
                                setSearching(true)
                                const fn = tab === 'comptable'
                                    ? searchUsersForPromotion('')
                                    : searchUserByEmail('')
                                fn.then(({ users }: any) => {
                                    setResults(
                                        tab === 'comptable'
                                            ? users
                                            : users.filter((u: any) => u.role !== 'logistician')
                                    )
                                    setSearching(false)
                                })
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase italic transition-all"
                    >
                        <UserPlus size={14} /> Ajouter
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setTab(t.id); setShowSearch(false); setResults([]) }}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase italic transition-all ${
                                tab === t.id
                                    ? `${t.color} text-white shadow-lg`
                                    : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500'
                            }`}
                        >
                            {t.icon} {t.label} ({t.id === 'comptable' ? comptables.length : logisticians.length})
                        </button>
                    ))}
                </div>

                {/* Description du rôle */}
                <div className={`p-4 rounded-2xl bg-${info.accent}-50 dark:bg-${info.accent}-900/10 border border-${info.accent}-200 dark:border-${info.accent}-800/30`}>
                    <div className="flex items-center gap-2">
                        <UserCheck size={14} className={`text-${info.accent}-500`} />
                        <p className={`text-xs font-bold text-${info.accent}-700 dark:text-${info.accent}-400`}>{info.title}</p>
                    </div>
                    <p className={`text-[11px] text-${info.accent}-600/70 dark:text-${info.accent}-400/60 mt-1`}>{info.desc}</p>
                </div>

                {/* Panneau de recherche */}
                {showSearch && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-orange-200 dark:border-orange-800/30">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">
                                Rechercher un utilisateur à promouvoir
                            </p>
                            <button onClick={() => { setShowSearch(false); setResults([]) }} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Nom, email, téléphone..."
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                            <button onClick={handleSearch} disabled={searching}
                                className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs disabled:opacity-50">
                                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>

                        {results.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {results.map((u: any) => (
                                    <div key={u.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold dark:text-white">
                                                {u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Sans nom'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {u.email || u.phone || '—'} · Rôle actuel : <span className="font-bold">{u.role}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handlePromote(u.id)}
                                            disabled={promoting === u.id}
                                            className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold disabled:opacity-50"
                                        >
                                            {promoting === u.id
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : tab === 'comptable' ? '💼 Nommer comptable' : '🚚 Nommer livreur'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : !searching ? (
                            <p className="text-xs text-slate-400 mt-3 text-center">Aucun utilisateur trouvé</p>
                        ) : null}
                    </div>
                )}

                {/* Liste */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-orange-500" />
                    </div>
                ) : currentList.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Calculator size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                        <p className="text-sm font-bold text-slate-400">{info.emptyMsg}</p>
                        <p className="text-xs text-slate-300 mt-1">Cliquez sur « Ajouter » pour en nommer un(e)</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {currentList.map((member: any) => {
                            const name = member.full_name
                                || [member.first_name, member.last_name].filter(Boolean).join(' ')
                                || 'Sans nom'
                            return (
                                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-black text-lg">
                                        {member.avatar_url
                                            ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                            : name[0]?.toUpperCase() || '?'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {member.email || member.phone || '—'}
                                            {member.created_at && (
                                                <> · depuis {formatAdminDateTime(member.created_at)}</>
                                            )}
                                        </p>
                                    </div>

                                    {/* Badge rôle */}
                                    <span className={`hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                        tab === 'comptable'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>
                                        {tab === 'comptable' ? '💼 Comptable' : '🚚 Livreur'}
                                    </span>

                                    {/* Retirer */}
                                    <button
                                        onClick={() => handleDemote(member.id, tab)}
                                        disabled={demoting === member.id}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/50 text-red-500 text-[10px] font-bold hover:bg-red-50 dark:hover:bg-red-500/5 transition-all disabled:opacity-50"
                                    >
                                        {demoting === member.id
                                            ? <Loader2 size={12} className="animate-spin" />
                                            : <><UserX size={12} /> Retirer</>}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Info accès */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">ℹ Connexion et accès</p>
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                        <li>La personne se connecte normalement via <strong>/login</strong> avec son email et mot de passe</li>
                        <li>Le site la redirige automatiquement vers son espace selon son rôle</li>
                        {tab === 'comptable' && (
                            <>
                                <li>La comptable accède à <strong>/comptable</strong> — payouts, abonnements, virements, exports</li>
                                <li>Les admins ont également accès à <strong>/comptable</strong> comme superviseurs</li>
                            </>
                        )}
                        {tab === 'logistician' && (
                            <li>Le livreur accède à son tableau de bord de livraisons</li>
                        )}
                        <li>Retirer le rôle remet l&apos;utilisateur en compte normal (user)</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
