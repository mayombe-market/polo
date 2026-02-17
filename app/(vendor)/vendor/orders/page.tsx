'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import OrdersListClient from '@/app/components/OrdersListClient'
import { Loader2 } from 'lucide-react'
import { getVendorOrders } from '@/app/actions/orders'

export default function VendorOrders() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [vendorId, setVendorId] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const result = await getVendorOrders()

                if (!result.vendorId) {
                    router.push('/')
                    return
                }

                setVendorId(result.vendorId)
                setOrders(result.orders)
            } catch (err) {
                console.error('Erreur:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()
    }, [router])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-green-600" size={40} />
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                        Gestion <span className="text-green-600">Commandes</span>
                    </h1>
                    <Link href="/vendor/dashboard" className="text-[10px] font-black uppercase italic text-slate-500 hover:text-green-600 transition">
                        ← Retour Dashboard
                    </Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {orders && orders.length > 0 && vendorId ? (
                    <OrdersListClient initialOrders={orders} currentVendorId={vendorId} />
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
                        <p className="text-4xl mb-4">📦</p>
                        <h3 className="text-lg font-black uppercase italic text-slate-900 dark:text-white mb-2">Aucune commande</h3>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Vos ventes apparaîtront ici</p>
                    </div>
                )}
            </div>
        </div>
    )
}
