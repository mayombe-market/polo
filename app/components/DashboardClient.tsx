'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Remplace ton ancien bloc 'const AddProductForm = dynamic...' par ceci :
const AddProductForm = dynamic(() => import('./AddProductForm').then(mod => mod.default || mod), {
    loading: () => <div className="p-10 text-center font-bold italic text-green-600">Chargement du formulaire Mayombe...</div>,
    ssr: false
})

function DashboardClient({ products, profile, user, productCount }: any) {
    const [showAddForm, setShowAddForm] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* --- HEADER --- */}
            <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Dashboard Vendeur</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Bienvenue, <span className="text-green-600">{profile?.first_name || user?.email}</span>
                        </p>
                    </div>
                    <Link href="/" className="text-sm font-bold text-slate-600 hover:text-green-600 transition-colors">
                        ← Retour au marché
                    </Link>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* --- NAVIGATION RAPIDE --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Link href="/vendor/dashboard" className="bg-green-600 text-white p-6 rounded-[2rem] shadow-lg hover:scale-[1.02] transition transform">
                        <div className="text-3xl mb-2">🏠</div>
                        <h3 className="font-bold text-lg uppercase">Tableau de bord</h3>
                        <p className="text-sm opacity-80">Gérer mes produits</p>
                    </Link>
                    <Link href="/vendor/profile" className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border dark:border-slate-700 hover:scale-[1.02] transition transform">
                        <div className="text-3xl mb-2">👤</div>
                        <h3 className="font-bold text-lg dark:text-white uppercase">Mon Profil</h3>
                        <p className="text-sm text-slate-500">Ville et WhatsApp</p>
                    </Link>
                    <Link href="/vendor/orders" className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border dark:border-slate-700 hover:scale-[1.02] transition transform">
                        <div className="text-3xl mb-2">📦</div>
                        <h3 className="font-bold text-lg dark:text-white uppercase">Commandes</h3>
                        <p className="text-sm text-slate-500">Historique WhatsApp</p>
                    </Link>
                </div>

                {/* --- GRILLE DE STATISTIQUES --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Mes Produits', val: productCount || 0, color: 'text-slate-900' },
                        { label: 'Ventes', val: 0, color: 'text-green-600' },
                        { label: 'Revenus', val: '0 FCFA', color: 'text-blue-600' },
                        { label: 'Vues Total', val: products?.reduce((acc: any, p: any) => acc + (p.views_count || 0), 0), color: 'text-orange-500' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 text-center">
                            <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black dark:text-white ${stat.color}`}>{stat.val}</p>
                        </div>
                    ))}
                </div>

                {/* --- SECTION PRODUITS --- */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border dark:border-slate-700 p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                        <h2 className="text-xl font-black dark:text-white uppercase">Catalogue Produits</h2>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full sm:w-auto bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-green-700 transition shadow-xl"
                        >
                            + Ajouter un produit
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {products && products.length > 0 ? (
                            products.map((p: any) => (
                                <div key={p.id} className="group bg-slate-50 dark:bg-slate-900 p-4 rounded-[2rem] border-2 border-transparent hover:border-green-500 transition-all">
                                    <div className="relative aspect-square mb-4 overflow-hidden rounded-[1.5rem] bg-white">
                                        <img
                                            src={p.image_url || p.img}
                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                            alt={p.name}
                                        />
                                    </div>
                                    <h4 className="font-bold dark:text-white truncate mb-1">{p.name}</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-600 font-black text-lg">{p.price?.toLocaleString()} <small className="text-[10px]">FCFA</small></span>
                                        <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-full border dark:border-slate-700 shadow-sm">
                                            👁️ {p.views_count || 0}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-slate-400 font-medium italic">Aucun produit publié pour le moment.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODAL D'AJOUT (ANIMÉ) --- */}
            {showAddForm && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-2xl font-light hover:bg-red-500 hover:text-white transition-all z-50"
                        >
                            ×
                        </button>
                        <div className="p-4 sm:p-8">
                            <AddProductForm sellerId={user?.id} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DashboardClient