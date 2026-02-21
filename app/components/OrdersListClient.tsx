'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Phone, Check, Loader2, Filter, Package, MapPin, Wallet, Truck, Download } from 'lucide-react'
import { toast } from 'sonner'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { generateInvoice } from '@/lib/generateInvoice'
import { updateOrderStatus as serverUpdateStatus } from '@/app/actions/orders'

export default function OrdersListClient({ initialOrders, currentVendorId }: { initialOrders: any[], currentVendorId: string }) {
    const [orders, setOrders] = useState(initialOrders)
    const [updating, setUpdating] = useState<string | null>(null)

    // État pour le filtre actif
    const [activeFilter, setActiveFilter] = useState('all')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // REAL-TIME : Écouter les nouvelles commandes et mises à jour
    useEffect(() => {
        const channel = supabase
            .channel('vendor-orders')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                (payload) => {
                    const newOrder = payload.new as any
                    const vendorItems = newOrder.items?.filter(
                        (i: any) => i.seller_id === currentVendorId
                    ) || []

                    if (vendorItems.length > 0 && newOrder.status !== 'pending') {
                        setOrders((prev) => [newOrder, ...prev])
                        toast.success('Nouvelle commande !', {
                            description: `${newOrder.customer_name} - ${newOrder.total_amount?.toLocaleString('fr-FR')} FCFA`,
                            duration: 8000,
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                },
                (payload) => {
                    const updated = payload.new as any
                    const vendorItems = updated.items?.filter(
                        (i: any) => i.seller_id === currentVendorId
                    ) || []

                    if (vendorItems.length > 0) {
                        setOrders((prev) => {
                            const exists = prev.find(o => o.id === updated.id)
                            if (exists) {
                                return prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)
                            } else if (updated.status !== 'pending') {
                                toast.success('Nouvelle commande confirmée !', {
                                    description: `${updated.customer_name} - ${updated.total_amount?.toLocaleString('fr-FR')} FCFA`,
                                    duration: 8000,
                                })
                                return [updated, ...prev]
                            }
                            return prev
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentVendorId, supabase])

    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdating(orderId)
        try {
            const result = await serverUpdateStatus(orderId, newStatus)
            if (result.error) throw new Error(result.error)

            const updateData: any = { status: newStatus }
            if (newStatus === 'delivered') {
                updateData.delivered_at = new Date().toISOString()
            }
            setOrders(orders.map(o => o.id === orderId ? { ...o, ...updateData } : o))
        } catch (err: any) {
            console.error('Erreur mise à jour:', err)
            alert(err.message || 'Impossible de mettre à jour le statut.')
        } finally {
            setUpdating(null)
        }
    }

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'delivered': return { label: 'Livrée', style: 'bg-green-100 text-green-700' }
            case 'shipped': return { label: 'Expédiée', style: 'bg-purple-100 text-purple-700' }
            case 'confirmed': return { label: 'Confirmée', style: 'bg-blue-100 text-blue-700' }
            default: return { label: 'En attente', style: 'bg-yellow-100 text-yellow-700' }
        }
    }

    const getPaymentBadge = (method: string, status: string) => {
        switch (method) {
            case 'mobile_money':
                return {
                    label: status === 'pending' ? 'MoMo - En attente' : 'MoMo',
                    style: status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        : 'bg-green-100 text-green-700'
                }
            case 'airtel_money':
                return {
                    label: status === 'pending' ? 'Airtel - En attente' : 'Airtel',
                    style: status === 'pending'
                        ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                        : 'bg-red-100 text-red-700'
                }
            case 'cash':
                return { label: 'Cash livraison', style: 'bg-green-100 text-green-700' }
            default:
                return { label: method || 'Autre', style: 'bg-slate-100 text-slate-600' }
        }
    }

    // LOGIQUE DE FILTRAGE
    const filteredOrders = orders.filter(order => {
        if (activeFilter === 'all') return true
        return order.status === activeFilter
    })

    return (
        <div className="space-y-6">
            {/* BARRE DE FILTRES */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'confirmed', label: 'Confirmées' },
                    { id: 'shipped', label: 'Expédiées' },
                    { id: 'delivered', label: 'Livrées' }
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border ${activeFilter === f.id
                            ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20 scale-105'
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* LISTE FILTRÉE */}
            <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                        const statusInfo = getStatusDetails(order.status)
                        const payBadge = getPaymentBadge(order.payment_method, order.status)
                        const vendorItems = order.items?.filter((i: any) => i.seller_id === currentVendorId) || []

                        return (
                            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border dark:border-slate-700 p-6 md:p-8 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                                            <Package size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400 leading-none">{formatOrderNumber(order)}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
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
                                    </div>
                                </div>

                                {/* ALERTE MOMO EN ATTENTE */}
                                {order.payment_method === 'mobile_money' && order.status === 'pending' && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-6 flex items-start gap-3">
                                        <Wallet className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                                                Paiement MoMo en attente
                                            </p>
                                            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500 mt-1">
                                                Attendez la confirmation du paiement Mobile Money avant de confirmer cette commande.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                    <div className="space-y-3">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Articles à préparer</p>
                                        {vendorItems.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                                                <Image src={item.img || '/placeholder-image.jpg'} alt={item.name || ''} width={48} height={48} className="w-12 h-12 object-cover rounded-xl" />
                                                <div className="flex-1">
                                                    <h3 className="text-xs font-black uppercase italic dark:text-white leading-tight">{item.name}</h3>
                                                    <p className="text-[10px] font-bold text-green-600 mt-1">{item.price?.toLocaleString('fr-FR')} F x {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col justify-center bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-[8px] font-black uppercase text-slate-400 mb-3 tracking-[0.2em]">Contact Client</p>
                                        <p className="font-black uppercase italic text-sm dark:text-white mb-1">{order.customer_name}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <MapPin size={12} className="text-orange-500" /> {order.city}, {order.district}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-6 border-t dark:border-slate-700">
                                    <div className="text-center sm:text-left w-full sm:w-auto">
                                        <p className="text-[8px] font-black uppercase text-slate-400 leading-none">Votre part (90%)</p>
                                        <p className="font-black italic text-2xl tracking-tighter text-slate-900 dark:text-white">
                                            {(order.vendor_payout || Math.round((order.total_amount || 0) * 0.9))?.toLocaleString('fr-FR')} <small className="text-[10px] tracking-normal">FCFA</small>
                                        </p>
                                        {order.payout_status === 'paid' && (
                                            <span className="text-[8px] font-black uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Versé</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                                        {order.status !== 'delivered' && (
                                            <button
                                                onClick={() => {
                                                    const nextStatus = order.status === 'confirmed' ? 'shipped' : order.status === 'shipped' ? 'delivered' : 'confirmed'
                                                    updateStatus(order.id, nextStatus)
                                                }}
                                                disabled={updating === order.id}
                                                className="flex-1 sm:flex-none bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-green-600 hover:text-white transition-all shadow-xl"
                                            >
                                                {updating === order.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                                {order.status === 'confirmed' ? 'Expédier' : order.status === 'shipped' ? 'Marquer livrée' : 'Confirmer'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => generateInvoice(order)}
                                            className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3.5 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:text-orange-500 transition-all"
                                        >
                                            <Download size={14} /> Reçu PDF
                                        </button>
                                        {order.phone && (
                                            <a href={`tel:${order.phone}`} className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3.5 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 transition-transform active:scale-95">
                                                <Phone size={14} /> Appeler
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                        <Filter className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-xs font-black uppercase italic text-slate-400">Aucune commande dans cette catégorie</p>
                    </div>
                )}
            </div>
        </div>
    )
}
