'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { createBrowserClient } from '@supabase/ssr' // Ajout pour les abonnés
import { Users, Copy, Check } from 'lucide-react'

const AddProductForm = dynamic(() => import('./AddProductForm').then(mod => mod.default || mod), {
    loading: () => <div className="p-10 text-center font-bold italic text-green-600">Chargement du formulaire Mayombe...</div>,
    ssr: false
})

export default function DashboardClient({ products, user, productCount }: any) {
    const [showAddForm, setShowAddForm] = useState(false)
    // --- NOUVEAUX ÉTATS ---
    const [followerCount, setFollowerCount] = useState(0)
    const [copied, setCopied] = useState(false)
    const [totalRevenue, setTotalRevenue] = useState(0)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (!user?.id) return
        // Récupération des abonnés
        const fetchFollowers = async () => {
            try {
                const { count } = await supabase
                    .from('seller_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('seller_id', user.id)
                setFollowerCount(count || 0)
            } catch (err) {
                console.error("Erreur abonnés:", err)
            }
        }
        // Récupération des revenus réels (commandes livrées avec payout versé)
        const fetchRevenue = async () => {
            try {
                const { data: allOrders } = await supabase
                    .from('orders')
                    .select('vendor_payout, total_amount, items, payout_status')
                    .eq('payout_status', 'paid')
                const vendorOrders = (allOrders || []).filter(order =>
                    order.items?.some((item: any) => item.seller_id === user.id)
                )
                const revenue = vendorOrders.reduce((acc: number, o: any) =>
                    acc + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0
                )
                setTotalRevenue(revenue)
            } catch (err) {
                console.error("Erreur revenus:", err)
            }
        }
        fetchFollowers()
        fetchRevenue()
    }, [user?.id])

    const copyLink = () => {
        const url = `${window.location.origin}/seller/${user?.id}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* --- BANNIÈRE DE PARTAGE (Nouveau) --- */}
                <div className="mb-8 bg-green-600 rounded-[2.5rem] p-6 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-green-600/20">
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-black uppercase italic leading-tight">Attirez plus de clients</h2>
                        <p className="text-green-100 text-xs font-bold mt-2">Partagez votre lien de boutique sur vos statuts WhatsApp.</p>
                    </div>
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-3 bg-white text-green-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Lien copié !' : 'Copier mon lien boutique'}
                    </button>
                </div>

                {/* --- NAVIGATION RAPIDE --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Link href="/vendor/dashboard" className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-[2rem] shadow-lg border-2 border-green-600">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-3xl">🏠</span>
                            <div className="bg-green-600 text-[8px] px-2 py-1 rounded-full font-black uppercase">Actif</div>
                        </div>
                        <h3 className="font-black text-lg uppercase italic">Tableau de bord</h3>
                        <p className="text-[10px] uppercase font-bold opacity-60">Gérer mes stocks</p>
                    </Link>
                    {/* ... tes autres liens Profile et Orders inchangés ... */}
                    <Link href="/vendor/profile" className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border dark:border-slate-700 hover:border-green-500 transition-all">
                        <div className="text-3xl mb-2">👤</div>
                        <h3 className="font-black text-lg dark:text-white uppercase italic">Mon Profil</h3>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Ville et WhatsApp</p>
                    </Link>
                    <Link href="/vendor/orders" className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border dark:border-slate-700 hover:border-green-500 transition-all">
                        <div className="text-3xl mb-2">📦</div>
                        <h3 className="font-black text-lg dark:text-white uppercase italic">Commandes</h3>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Historique</p>
                    </Link>
                </div>

                {/* --- GRILLE DE STATISTIQUES (Mise à jour avec Abonnés) --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Abonnés', val: followerCount, color: 'text-orange-500', icon: <Users size={12} /> },
                        { label: 'Produits', val: productCount || 0, color: 'text-slate-900 dark:text-white' },
                        { label: 'Vues', val: products?.reduce((acc: any, p: any) => acc + (p.views_count || 0), 0), color: 'text-blue-500' },
                        { label: 'Revenus', val: `${totalRevenue.toLocaleString('fr-FR')} F`, color: 'text-green-600' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                            <p className="text-[9px] uppercase font-black text-slate-400 mb-1 flex items-center gap-1">
                                {stat.icon} {stat.label}
                            </p>
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                        </div>
                    ))}
                </div>

                {/* --- CATALOGUE --- */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border dark:border-slate-700 p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                        <h2 className="text-xl font-black dark:text-white uppercase italic tracking-tighter">Votre Catalogue</h2>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full sm:w-auto bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-green-700 transition shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                            + Nouveau Produit
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {products && products.length > 0 ? (
                            products.map((p: any) => (
                                <div key={p.id} className="group bg-slate-50 dark:bg-slate-900 p-4 rounded-[2.5rem] border-2 border-transparent hover:border-green-600 transition-all">
                                    <div className="relative aspect-[4/5] mb-4 overflow-hidden rounded-[1.8rem] bg-white">
                                        <Image
                                            src={p.img || p.image_url || '/placeholder-image.jpg'}
                                            alt={p.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            className="object-cover group-hover:scale-110 transition duration-700"
                                        />
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">
                                            <p className="text-[10px] font-black text-slate-900">👁️ {p.views_count || 0}</p>
                                        </div>
                                    </div>
                                    <h4 className="font-black uppercase text-xs dark:text-white truncate mb-2 px-2 italic tracking-tight">{p.name}</h4>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-green-600 font-black text-lg tracking-tighter">
                                            {p.price?.toLocaleString('fr-FR')} <small className="text-[8px]">FCFA</small>
                                        </span>
                                        <div className="flex gap-2">
                                            <button className="p-2 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 text-slate-400 hover:text-red-500">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem]">
                                <p className="text-slate-400 font-black uppercase text-xs italic">Aucun produit en vitrine.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODAL D'AJOUT (Inchangé mais fonctionnel) --- */}
            {showAddForm && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
                    <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-2xl font-light hover:bg-red-500 hover:text-white transition-all z-50"
                        >
                            ×
                        </button>
                        <div className="p-6 md:p-12">
                            <div className="mb-8">
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Nouveau Produit</h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Mise en ligne immédiate</p>
                            </div>
                            <AddProductForm sellerId={user?.id} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}