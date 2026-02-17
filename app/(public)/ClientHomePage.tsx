'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AuthModal from '@/app/components/AuthModal'
import ProductCard from '@/app/components/ProductCard'
import { Truck, Store, ArrowRight, Star } from 'lucide-react'

interface ClientHomePageProps {
    ads: any[]
    topProducts: any[]
    categories: any[]
    newProducts: any[]
    popularProducts: any[]
    topSellers: any[]
}

export default function ClientHomePage({ ads, topProducts, categories, newProducts, popularProducts, topSellers }: ClientHomePageProps) {
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
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
            {/* ===================== SECTION ADS ===================== */}
            <section className="max-w-7xl mx-auto px-4 pt-8">
                <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide pb-4" style={{ scrollbarWidth: 'none' }}>
                    {ads?.map((ad) => (
                        <div key={ad.id} className="min-w-[100%] snap-center relative h-[250px] md:h-[400px] rounded-[2rem] overflow-hidden bg-slate-200 shadow-lg">
                            <Image src={ad.img || '/placeholder-image.jpg'} alt="" fill sizes="100vw" className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end p-8">
                                <h2 className="text-white text-3xl font-bold">{ad.title}</h2>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===================== SECTION : TOP 5 ===================== */}
            <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">🔥 Top 5 de la semaine</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {topProducts?.map((product) => (
                        <Link
                            href={`/product/${product.id}`}
                            key={product.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all block group"
                        >
                            <div className="relative overflow-hidden aspect-square">
                                <Image src={product.img || product.image_url || '/placeholder-image.jpg'} alt={product.name} fill sizes="(max-width: 768px) 50vw, 20vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="p-3">
                                <h3 className="font-semibold text-sm dark:text-gray-200 truncate">{product.name}</h3>
                                <p className="text-green-600 font-bold text-sm">
                                    {product.price?.toLocaleString('fr-FR')} FCFA
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ===================== BANNIÈRE PROMO ===================== */}
            <section className="max-w-7xl mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2rem] p-8 md:p-10 flex items-center gap-6 text-white shadow-xl shadow-orange-500/10">
                        <div className="bg-white/20 p-4 rounded-2xl flex-shrink-0">
                            <Truck size={32} />
                        </div>
                        <div>
                            <h3 className="font-black uppercase italic text-lg md:text-xl tracking-tighter">Livraison rapide</h3>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">Brazzaville & Pointe-Noire</p>
                        </div>
                    </div>

                    <Link href="/vendor/dashboard" className="bg-gradient-to-br from-green-600 to-green-700 rounded-[2rem] p-8 md:p-10 flex items-center gap-6 text-white shadow-xl shadow-green-600/10 group">
                        <div className="bg-white/20 p-4 rounded-2xl flex-shrink-0">
                            <Store size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black uppercase italic text-lg md:text-xl tracking-tighter">Vendez sur Mayombe</h3>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">Ouvrez votre boutique gratuitement</p>
                        </div>
                        <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                    </Link>
                </div>
            </section>

            {/* ===================== NOUVEAUTÉS ===================== */}
            {newProducts.length > 0 && (
                <section className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Nouveautés</h2>
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-1">Les derniers produits ajoutés</p>
                        </div>
                        <Link href="/search" className="bg-slate-100 dark:bg-slate-800 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase italic text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2">
                            Voir tout <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {newProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            {/* ===================== PRODUITS POPULAIRES ===================== */}
            {popularProducts.length > 0 && (
                <section className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Les plus populaires</h2>
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-1">Les produits les plus consultés</p>
                        </div>
                        <Link href="/search" className="bg-slate-100 dark:bg-slate-800 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase italic text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2">
                            Voir tout <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {popularProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            {/* ===================== VENDEURS VEDETTES ===================== */}
            {topSellers.length > 0 && (
                <section className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Vendeurs vedettes</h2>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-2">Les boutiques les plus actives</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {topSellers.map((seller) => (
                            <Link
                                key={seller.id}
                                href={`/seller/${seller.id}`}
                                className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 hover:border-green-500/30 hover:shadow-lg transition-all text-center group block"
                            >
                                <div className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-green-100 dark:bg-green-500/10">
                                    {seller.avatar_url ? (
                                        <Image src={seller.avatar_url} alt={seller.full_name || ''} fill sizes="80px" className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-green-600 font-black text-2xl italic">
                                            {seller.full_name?.[0]?.toUpperCase() || 'V'}
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-black uppercase italic text-sm tracking-tighter dark:text-white group-hover:text-green-600 transition-colors">
                                    {seller.full_name || 'Vendeur'}
                                </h3>
                                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1 flex items-center justify-center gap-1">
                                    <Star size={10} className="text-orange-500" /> {seller.product_count} produit{seller.product_count > 1 ? 's' : ''}
                                </p>
                                <div className="mt-4 bg-green-50 dark:bg-green-500/10 text-green-600 text-[9px] font-black uppercase italic py-2 px-4 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all">
                                    Voir la boutique
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ===================== NOS CATÉGORIES ===================== */}
            <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">📂 Nos Catégories</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {categories?.map((cat) => (
                        <div
                            key={cat.id}
                            className="relative group rounded-3xl overflow-hidden h-80 shadow-lg bg-slate-200 block"
                        >
                            <Link href={`/category/${encodeURIComponent(cat.name)}`} className="absolute inset-0 z-0">
                                <Image
                                    src={cat.img || 'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800'}
                                    alt={cat.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            </Link>

                            <div className="absolute bottom-0 p-6 w-full z-10 pointer-events-none">
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {cat.name}
                                </h3>

                                <div className="flex flex-wrap gap-2 pointer-events-auto">
                                    <Link
                                        href={`/category/${encodeURIComponent(cat.name)}`}
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-bold hover:bg-green-700 transition-colors"
                                    >
                                        Tout voir
                                    </Link>

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

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    )
}
