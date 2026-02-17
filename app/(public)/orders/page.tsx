'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Package } from 'lucide-react'
import Link from 'next/link'
import { OrderCard } from '@/app/components/OrderCard'
import { toast } from 'sonner'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

export default function MyOrdersPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setUserId(user.id)
                    const { data, error } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                    if (error) throw error
                    setOrders(data || [])
                }
            } catch (err) {
                console.error('Erreur chargement commandes:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()
    }, [supabase])

    // REAL-TIME : Écouter les mises à jour de statut
    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel('client-orders')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const updated = payload.new as any
                    setOrders((prev) =>
                        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                    )

                    const statusLabels: Record<string, string> = {
                        confirmed: 'Confirmée',
                        shipped: 'Expédiée',
                        delivered: 'Livrée',
                    }
                    const label = statusLabels[updated.status]
                    if (label) {
                        toast.success(formatOrderNumber(updated), {
                            description: `Statut mis à jour : ${label}`,
                            duration: 6000,
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    if (loading) return <div className="p-20 text-center font-black animate-pulse italic">CHARGEMENT...</div>

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">Mes <span className="text-orange-500">Achats</span></h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Historique et suivi en temps réel</p>
                </header>

                {orders.length > 0 ? (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-black uppercase italic text-slate-500">Vous n'avez pas encore commandé.</p>
                        <Link href="/" className="mt-6 inline-block bg-orange-500 text-white px-8 py-3 rounded-2xl font-black uppercase italic text-xs">Découvrir le marché</Link>
                    </div>
                )}
            </div>
        </div>
    )
}
