'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Phone, Loader2, Package, MapPin, Clock, CheckCircle2, LogOut } from 'lucide-react'
import { playDeliverySound } from '@/lib/notificationSound'
import { getLogisticianDeliveries, markPickedUp, markDelivered } from '@/app/actions/deliveries'
import { useRouter } from 'next/navigation'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    shipped: { label: 'À récupérer', emoji: '📋', color: '#E8A838', bg: 'bg-amber-500/10' },
    picked_up: { label: 'En livraison', emoji: '🏍️', color: '#3B82F6', bg: 'bg-blue-500/10' },
    delivered: { label: 'Livré', emoji: '✅', color: '#22C55E', bg: 'bg-green-500/10' },
}

export default function LogisticianDashboardClient({ user, profile }: { user: any; profile: any }) {
    const router = useRouter()
    const [deliveries, setDeliveries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'active' | 'completed'>('active')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<string | null>(null)
    const [updating, setUpdating] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch deliveries
    useEffect(() => {
        const fetch = async () => {
            const { deliveries: data } = await getLogisticianDeliveries()
            setDeliveries(data)
            setLoading(false)
        }
        fetch()

        // Realtime : écouter les commandes assignées au logisticien
        const channel = supabase
            .channel('logistician-deliveries')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `logistician_id=eq.${user.id}`
            }, (payload) => {
                const updated = payload.new as any
                setDeliveries(prev => {
                    const exists = prev.find(d => d.id === updated.id)
                    if (exists) {
                        return prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
                    }
                    // Nouvelle assignation
                    playDeliverySound()
                    toast.success('Nouvelle course assignée !', { duration: 5000 })
                    return [updated, ...prev]
                })
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'orders',
                filter: `logistician_id=eq.${user.id}`
            }, (payload) => {
                const newOrder = payload.new as any
                playDeliverySound()
                toast.success('Nouvelle course !', { duration: 5000 })
                setDeliveries(prev => [newOrder, ...prev])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [user.id])

    const active = deliveries.filter(d => d.status === 'shipped' || d.status === 'picked_up')
    const completed = deliveries.filter(d => d.status === 'delivered')
    const filtered = tab === 'active' ? active : completed

    const todayDelivered = completed.filter(d => {
        if (!d.delivered_at) return false
        const today = new Date().toDateString()
        return new Date(d.delivered_at).toDateString() === today
    })
    const todayEarnings = todayDelivered.reduce((sum, d) => sum + 500 + (d.delivery_fee || 0), 0)

    // Handle status change
    const handleAction = async (id: string) => {
        setUpdating(true)
        const delivery = deliveries.find(d => d.id === id)
        if (!delivery) { setUpdating(false); return }

        let result
        if (delivery.status === 'shipped') {
            result = await markPickedUp(id)
        } else if (delivery.status === 'picked_up') {
            result = await markDelivered(id)
        }

        if (result?.error) {
            toast.error(result.error)
        } else {
            const newStatus = delivery.status === 'shipped' ? 'picked_up' : 'delivered'
            setDeliveries(prev => prev.map(d => {
                if (d.id === id) {
                    return {
                        ...d,
                        status: newStatus,
                        ...(newStatus === 'picked_up' ? { picked_up_at: new Date().toISOString() } : {}),
                        ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
                    }
                }
                return d
            }))
            toast.success(
                delivery.status === 'shipped'
                    ? 'Colis récupéré ! En route vers le client 🏍️'
                    : 'Livraison confirmée ! ✅'
            )
        }

        setConfirmAction(null)
        setSelectedId(null)
        setUpdating(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#08080E] flex items-center justify-center">
                <Loader2 className="animate-spin text-green-500" size={40} />
            </div>
        )
    }

    // ═══════════ VUE DÉTAIL ═══════════
    if (selectedId) {
        const d = deliveries.find(del => del.id === selectedId)
        if (!d) { setSelectedId(null); return null }
        const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.shipped

        return (
            <div className="min-h-screen bg-[#08080E] p-4 max-w-lg mx-auto">
                {/* Modal confirmation */}
                {confirmAction && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">
                        <div className="max-w-sm w-full p-7 bg-[#12121C] rounded-3xl border border-white/5 text-center">
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl"
                                style={{ background: `${st.color}12` }}>
                                {d.status === 'shipped' ? '📦' : '✅'}
                            </div>
                            <h3 className="text-[#F0ECE2] text-lg font-extrabold mb-1">
                                {d.status === 'shipped' ? 'Confirmer la récupération ?' : 'Confirmer la livraison ?'}
                            </h3>
                            <p className="text-gray-500 text-sm mb-1">
                                {d.status === 'shipped'
                                    ? `Vous avez bien récupéré "${d.items?.[0]?.name}" chez ${d.seller_name || 'le vendeur'} ?`
                                    : `Vous avez bien livré "${d.items?.[0]?.name}" à ${d.customer_name} ?`}
                            </p>
                            <p className="text-gray-600 text-xs mb-5">
                                {d.status === 'shipped'
                                    ? 'Le client sera notifié que son colis est en route.'
                                    : 'Le client sera invité à confirmer la réception.'}
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmAction(null)}
                                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-500 font-semibold text-sm">
                                    Annuler
                                </button>
                                <button onClick={() => handleAction(d.id)} disabled={updating}
                                    className={`flex-1 py-3.5 rounded-xl border-none text-white font-bold text-sm ${
                                        d.status === 'shipped'
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
                                            : 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30'
                                    }`}>
                                    {updating ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirmer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Retour */}
                <button onClick={() => setSelectedId(null)}
                    className="text-gray-500 text-sm mb-4 bg-transparent border-none cursor-pointer">
                    ← Retour à mes courses
                </button>

                {/* Badge statut */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 border ${st.bg}`}
                    style={{ borderColor: `${st.color}22` }}>
                    <span className="text-sm">{st.emoji}</span>
                    <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
                    {d.delivery_fee > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500/15 text-amber-500 ml-1">
                            ⚡ EXPRESS
                        </span>
                    )}
                </div>

                {/* Info produit */}
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-3">
                    {d.items?.[0]?.img ? (
                        <Image src={d.items[0].img} alt="" width={60} height={60}
                            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center text-2xl flex-shrink-0">
                            <Package size={24} className="text-gray-600" />
                        </div>
                    )}
                    <div>
                        <p className="text-[#F0ECE2] text-base font-bold">{d.items?.[0]?.name || 'Produit'}</p>
                        <p className="text-gray-500 text-xs">{d.tracking_number} · x{d.items?.[0]?.quantity || 1}</p>
                        <p className="text-amber-500 text-base font-extrabold">{fmt(d.total_amount)} F</p>
                    </div>
                </div>

                {/* Étape 1 : Récupérer chez le vendeur */}
                <div className={`p-4 rounded-2xl mb-2.5 border ${
                    d.status === 'shipped' ? 'bg-amber-500/[0.04] border-amber-500/10' : 'bg-green-500/[0.03] border-green-500/10'
                }`}>
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold ${
                            d.status !== 'shipped' ? 'bg-green-500' : 'bg-amber-500'
                        }`}>
                            {d.status !== 'shipped' ? '✓' : '1'}
                        </span>
                        <span className="text-[#F0ECE2] text-sm font-bold">📍 Récupérer chez le vendeur</span>
                    </div>
                    <p className="text-[#F0ECE2] text-sm font-semibold">{d.seller_name || 'Vendeur'}</p>
                    <p className="text-gray-500 text-xs">{d.district || 'Quartier'}</p>
                    <p className="text-gray-600 text-xs mb-2.5">{d.landmark || ''}</p>
                    {d.seller_phone && (
                        <a href={`tel:${d.seller_phone}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/15 text-green-400 text-xs font-semibold no-underline">
                            <Phone size={12} /> Appeler : {d.seller_phone}
                        </a>
                    )}
                </div>

                {/* Étape 2 : Livrer au client */}
                <div className={`p-4 rounded-2xl mb-5 border ${
                    d.status === 'picked_up' ? 'bg-blue-500/[0.04] border-blue-500/10' :
                    d.status === 'delivered' ? 'bg-green-500/[0.03] border-green-500/10' :
                    'bg-white/[0.02] border-white/[0.04] opacity-50'
                }`}>
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold ${
                            d.status === 'delivered' ? 'bg-green-500' : d.status === 'picked_up' ? 'bg-blue-500' : 'bg-white/5'
                        }`}>
                            {d.status === 'delivered' ? '✓' : '2'}
                        </span>
                        <span className="text-[#F0ECE2] text-sm font-bold">🏠 Livrer au client</span>
                    </div>
                    <p className="text-[#F0ECE2] text-sm font-semibold">{d.customer_name}</p>
                    <p className="text-gray-500 text-xs">{d.city}, {d.district}</p>
                    <p className="text-gray-600 text-xs mb-2.5">{d.landmark || ''}</p>
                    {d.phone && (
                        <a href={`tel:${d.phone}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs font-semibold no-underline">
                            <Phone size={12} /> Appeler : {d.phone}
                        </a>
                    )}
                </div>

                {/* Bouton d'action */}
                {d.status === 'shipped' && (
                    <button onClick={() => setConfirmAction(d.id)}
                        className="w-full py-4.5 rounded-2xl border-none bg-gradient-to-br from-blue-500 to-blue-600 text-white text-base font-bold cursor-pointer shadow-lg shadow-blue-500/30">
                        📦 Récupéré chez le vendeur
                    </button>
                )}
                {d.status === 'picked_up' && (
                    <button onClick={() => setConfirmAction(d.id)}
                        className="w-full py-4.5 rounded-2xl border-none bg-gradient-to-br from-green-500 to-green-600 text-white text-base font-bold cursor-pointer shadow-lg shadow-green-500/30">
                        ✅ Livré au client
                    </button>
                )}
                {d.status === 'delivered' && (
                    <div className="p-3.5 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                        <p className="text-green-400 text-sm font-bold">✅ Livraison terminée</p>
                        <p className="text-gray-500 text-xs">
                            Livré à {d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'} · En attente de confirmation client
                        </p>
                    </div>
                )}
            </div>
        )
    }

    // ═══════════ VUE LISTE ═══════════
    return (
        <div className="min-h-screen bg-[#08080E] p-4 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-[#F0ECE2] text-xl font-extrabold">
                        Mes livraisons 🏍️
                    </h1>
                    <p className="text-gray-600 text-xs">
                        Bonjour, {profile?.first_name || 'Livreur'} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <button onClick={handleLogout}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 cursor-pointer">
                    <LogOut size={16} />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="p-3.5 rounded-2xl text-center bg-blue-500/[0.04] border border-blue-500/10">
                    <div className="text-blue-400 text-2xl font-extrabold">{active.length}</div>
                    <div className="text-gray-600 text-[10px]">En cours</div>
                </div>
                <div className="p-3.5 rounded-2xl text-center bg-green-500/[0.04] border border-green-500/10">
                    <div className="text-green-400 text-2xl font-extrabold">{todayDelivered.length}</div>
                    <div className="text-gray-600 text-[10px]">Livrées</div>
                </div>
                <div className="p-3.5 rounded-2xl text-center bg-amber-500/[0.04] border border-amber-500/10">
                    <div className="text-amber-500 text-2xl font-extrabold">{fmt(todayEarnings)}</div>
                    <div className="text-gray-600 text-[10px]">Gains du jour</div>
                </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-2 mb-4">
                {([
                    { id: 'active' as const, label: 'En cours', count: active.length, color: 'blue' },
                    { id: 'completed' as const, label: 'Terminées', count: completed.length, color: 'green' },
                ]).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 border transition-all ${
                            tab === t.id
                                ? t.color === 'blue'
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-transparent border-white/5 text-gray-600'
                        }`}>
                        {t.label}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                            tab === t.id
                                ? t.color === 'blue' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'
                                : 'bg-white/5 text-gray-600'
                        }`}>{t.count}</span>
                    </button>
                ))}
            </div>

            {/* Liste des courses */}
            <div className="flex flex-col gap-2.5">
                {filtered.length > 0 ? filtered.map(d => {
                    const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.shipped
                    return (
                        <button key={d.id} onClick={() => setSelectedId(d.id)}
                            className="w-full text-left p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] cursor-pointer transition-all hover:bg-white/[0.04]">
                            <div className="flex items-center gap-3 mb-2.5">
                                {d.items?.[0]?.img ? (
                                    <Image src={d.items[0].img} alt="" width={48} height={48}
                                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center flex-shrink-0">
                                        <Package size={20} className="text-gray-600" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[#F0ECE2] text-sm font-semibold truncate">{d.items?.[0]?.name || 'Produit'}</p>
                                    <p className="text-gray-500 text-[11px] truncate">{d.seller_name || 'Vendeur'} → {d.customer_name}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${st.bg}`}
                                        style={{ color: st.color }}>
                                        {st.emoji} {st.label}
                                    </span>
                                    {d.delivery_fee > 0 && (
                                        <div className="mt-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500/10 text-amber-500 inline-block">
                                            ⚡ EXPRESS
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2.5 border-t border-white/[0.04] text-gray-600 text-[11px]">
                                <span className="flex items-center gap-1"><MapPin size={10} /> {d.district || d.city}</span>
                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(d.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="ml-auto text-amber-500 font-bold">{fmt(d.total_amount)} F</span>
                            </div>
                        </button>
                    )
                }) : (
                    <div className="py-16 text-center">
                        <Package className="mx-auto text-gray-700 mb-3" size={40} />
                        <p className="text-gray-600 text-sm font-bold">
                            {tab === 'active' ? 'Aucune course en cours' : 'Aucune livraison terminée'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
