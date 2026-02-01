'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'

interface ClientHomePageProps {
    ads: any[]
    topProducts: any[]
    categories: any[]
}

export default function ClientHomePage({ ads, topProducts, categories }: ClientHomePageProps) {
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Auto-défilement des publicités toutes les 5 secondes
    useEffect(() => {
        if (ads.length <= 1) return

        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % ads.length)
        }, 5000)

        return () => clearInterval(interval)
    }, [ads.length])

    // Scroll automatique vers la pub active
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const scrollWidth = container.scrollWidth / ads.length
            container.scrollTo({
                left: scrollWidth * currentAdIndex,
                behavior: 'smooth'
            })
        }
    }, [currentAdIndex, ads.length])

    return (
        <div className="space-y-16 pb-20 pt-10">

            {/* SECTION ADS (PUBLICITÉS) AVEC DÉFILEMENT AUTO */}
            <section className="max-w-7xl mx-auto px-4 pt-8">
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide pb-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {!ads || ads.length === 0 ? (
                        <div className="w-full h-40 bg-gray-100 dark:bg-slate-800 flex items-center justify-center rounded-3xl border-2 border-dashed">
                            <p className="text-gray-500 dark:text-gray-400">Aucune publicité trouvée dans la table "ads"</p>
                        </div>
                    ) : (
                        ads.map((ad, index) => (
                            <div
                                key={ad.id}
                                className="min-w-[100%] snap-center relative h-[250px] md:h-[400px] rounded-[2rem] overflow-hidden bg-slate-200 shadow-lg"
                            >
                                <img
                                    src={ad.img}
                                    alt={ad.title || "Publicité"}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.border = "4px solid red")}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                                    <div>
                                        <h2 className="text-white text-3xl font-bold mb-2">{ad.title}</h2>
                                        {/* Indicateurs de position */}
                                        <div className="flex gap-2 mt-4">
                                            {ads.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentAdIndex(idx)}
                                                    className={`h-2 rounded-full transition-all ${idx === currentAdIndex
                                                        ? 'w-8 bg-white'
                                                        : 'w-2 bg-white/50'
                                                        }`}
                                                    aria-label={`Aller à la publicité ${idx + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* SECTION : TOP 5 DE LA SEMAINE */}
            <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">🔥 Top 5 de la semaine</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {topProducts?.map((product) => (
                        <Link
                            href={`/sub-category/${product.sub_category_uuid}`}
                            key={product.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all block group"
                        >
                            <div className="relative overflow-hidden aspect-square">
                                <img
                                    src={product.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=500'}
                                    alt={product.name}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                            </div>

                            <div className="p-3">
                                <h3 className="font-semibold text-sm dark:text-gray-200 truncate group-hover:text-green-600 transition-colors">
                                    {product.name}
                                </h3>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-green-600 font-bold text-sm">{product.price} FCFA</p>
                                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Voir +</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* SECTION : NOS CATÉGORIES */}
            <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">📂 Nos Catégories</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {categories?.map((cat) => (
                        <Link
                            href={`/category/${cat.id}`}
                            key={cat.id}
                            className="relative group rounded-3xl overflow-hidden h-80 shadow-lg bg-slate-200 block cursor-pointer transition-transform hover:-translate-y-1"
                        >
                            <img
                                src={cat.img || 'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800'}
                                alt={cat.name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                            <div className="absolute bottom-0 p-6 w-full">
                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                                    {cat.name}
                                </h3>

                                <div className="flex flex-wrap gap-2">
                                    {cat.sub_category?.map((sub: any) => (
                                        <span
                                            key={sub.id}
                                            className="text-xs bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full border border-white/30"
                                        >
                                            {sub.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* GRAND PIED DE PAGE ACCUEIL */}
            <footer className="mt-20 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 -mx-4">
                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">

                        {/* COLONNE GAUCHE : L'ENTREPRISE */}
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Nous connaître</h3>
                                <ul className="space-y-3">
                                    <li><Link href="/about" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">À propos de nous</Link></li>
                                    <li><Link href="/commitments" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">Nos engagements</Link></li>
                                    <li><Link href="/careers" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">Recrutement</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Service Client</h3>
                                <ul className="space-y-3">
                                    <li><Link href="/delivery" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">Modes de livraison</Link></li>
                                    <li><Link href="/returns" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">Retours et échanges</Link></li>
                                    <li><Link href="/payments" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">Moyens de paiement</Link></li>
                                </ul>
                            </div>
                        </div>

                        {/* COLONNE DROITE : AIDE ET CONNEXION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Aide</h3>
                                <ul className="space-y-3">
                                    <li><Link href="/faq" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">FAQ</Link></li>
                                    <li><Link href="/contact" className="text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 font-bold transition-colors">Nous contacter</Link></li>
                                    <li><Link href="/report" className="text-sm text-red-500 hover:underline font-bold transition-colors">Signaler un problème</Link></li>
                                </ul>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center text-center">
                                <p className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase">Prêt à commander ?</p>
                                <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="bg-green-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all"
                                >
                                    Connectez-vous
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* BARRE DE COPYRIGHT SÉPARÉE */}
                    <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Conditions d'utilisation</Link>
                            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Politique de confidentialité</Link>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            © 2026 Mayombe Market - Tous droits réservés
                        </p>
                    </div>
                </div>
            </footer>

            {/* MODAL D'AUTHENTIFICATION */}
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    )
}