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
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        if (ads.length <= 1) return
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % ads.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [ads.length])

    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const scrollWidth = container.scrollWidth / (ads.length || 1)
            container.scrollTo({ left: scrollWidth * currentAdIndex, behavior: 'smooth' })
        }
    }, [currentAdIndex, ads.length])

    return (
        <div className="space-y-16 pb-20 pt-10">
            {/* SECTION ADS */}
            <section className="max-w-7xl mx-auto px-4 pt-8">
                <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide pb-4" style={{ scrollbarWidth: 'none' }}>
                    {ads?.map((ad) => (
                        <div key={ad.id} className="min-w-[100%] snap-center relative h-[250px] md:h-[400px] rounded-[2rem] overflow-hidden bg-slate-200 shadow-lg">
                            <img src={ad.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end p-8">
                                <h2 className="text-white text-3xl font-bold">{ad.title}</h2>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION : TOP 5 */}
            <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">🔥 Top 5 de la semaine</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {topProducts?.map((product) => (
                        <Link
                            href={`/product/${product.id}`} // <--- ICI : On pointe vers la fiche produit
                            key={product.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all block group"
                        >
                            <div className="relative overflow-hidden aspect-square">
                                <img src={product.img || product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="p-3">
                                <h3 className="font-semibold text-sm dark:text-gray-200 truncate">{product.name}</h3>
                                <p className="text-green-600 font-bold text-sm">
                                    {isMounted ? product.price?.toLocaleString() : product.price} FCFA
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* SECTION : NOS CATÉGORIES (CORRIGÉE) */}
            <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">📂 Nos Catégories</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {categories?.map((cat) => (
                        <div
                            key={cat.id}
                            className="relative group rounded-3xl overflow-hidden h-80 shadow-lg bg-slate-200 block"
                        >
                            {/* Image de fond cliquable vers la catégorie globale */}
                            <Link href={`/category/${encodeURIComponent(cat.name)}`} className="absolute inset-0 z-0">
                                <img
                                    src={cat.img || 'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800'}
                                    alt={cat.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            </Link>

                            {/* Contenu textuel et sous-catégories au-dessus (z-10) */}
                            <div className="absolute bottom-0 p-6 w-full z-10 pointer-events-none">
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {cat.name}
                                </h3>

                                <div className="flex flex-wrap gap-2 pointer-events-auto">
                                    {/* Lien vers la catégorie parente en premier (Voir tout) */}
                                    <Link
                                        href={`/category/${encodeURIComponent(cat.name)}`}
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-bold hover:bg-green-700 transition-colors"
                                    >
                                        Tout voir
                                    </Link>

                                    {/* Liste des sous-catégories cliquables */}
                                    {cat.sub_category?.map((sub: any) => (
                                        <Link
                                            key={sub.id}
                                            href={`/category/${encodeURIComponent(cat.name)}?sub=${encodeURIComponent(sub.name)}`}
                                            className="text-xs bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full border border-white/30 hover:bg-white hover:text-black transition-all"
                                        >
                                            {sub.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FOOTER ET MODAL RESTE INCHANGÉ... */}
            <footer className="mt-20 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 -mx-4 p-10">
                <div className="max-w-7xl mx-auto text-center">
                    <button onClick={() => setShowAuthModal(true)} className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold">Connectez-vous</button>
                    <p className="mt-6 text-slate-400 text-xs uppercase tracking-widest">© 2026 Mayombe Market</p>
                </div>
            </footer>
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    )
}