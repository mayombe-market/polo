import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function VendorOrders() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name) { return cookieStore.get(name)?.value } } }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    // Récupérer les commandes (à adapter selon votre structure de base de données)
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            *,
            product:products(name, price, img),
            customer:profiles(first_name, last_name, phone)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* HEADER */}
            <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Mes Commandes
                    </h1>
                    <Link
                        href="/vendor/dashboard"
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 transition"
                    >
                        ← Retour au dashboard
                    </Link>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* FILTRES */}
                <div className="flex gap-3 mb-6">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm">
                        Toutes
                    </button>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                        En attente
                    </button>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                        Confirmées
                    </button>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                        Livrées
                    </button>
                </div>

                {/* LISTE DES COMMANDES */}
                <div className="space-y-4">
                    {orders && orders.length > 0 ? (
                        orders.map((order: any) => (
                            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Commande #{order.id.slice(0, 8)}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            {new Date(order.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-bold rounded-full">
                                        {order.status || 'En attente'}
                                    </span>
                                </div>

                                <div className="flex gap-4">
                                    {order.product && (
                                        <>
                                            <img
                                                src={order.product.img}
                                                alt={order.product.name}
                                                className="w-20 h-20 object-cover rounded-xl"
                                            />
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                                                    {order.product.name}
                                                </h3>
                                                <p className="text-green-600 font-bold mb-2">
                                                    {order.product.price} FCFA
                                                </p>
                                                {order.customer && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        Client: {order.customer.first_name} {order.customer.last_name}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-4 pt-4 border-t dark:border-slate-700">
                                    <button className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition">
                                        ✅ Confirmer
                                    </button>
                                    <button className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition">
                                        💬 Contacter
                                    </button>
                                    <button className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                                        Détails
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 p-12 text-center">
                            <div className="text-6xl mb-4">📦</div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Aucune commande pour le moment
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                Les commandes de vos produits apparaîtront ici
                            </p>
                            <Link
                                href="/vendor/dashboard"
                                className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition"
                            >
                                Retour au dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}