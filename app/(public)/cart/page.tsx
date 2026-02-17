'use client'

import { useCart } from '@/hooks/userCart'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react'

export default function CartPage() {
    const { cart, total, itemCount, updateQuantity, removeFromCart, loading } = useCart()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            {/* Titre panier */}
            <div className="max-w-5xl mx-auto px-4 pt-8 pb-2 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors font-bold text-sm">
                    <ArrowLeft size={18} />
                    Retour au marché
                </Link>
                <h1 className="text-xl font-black uppercase italic tracking-tighter dark:text-white">Mon Panier ({itemCount})</h1>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-10">
                {cart.length === 0 ? (
                    /* PANIER VIDE */
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-20 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <ShoppingBag size={40} />
                        </div>
                        <h2 className="text-2xl font-black mb-4 uppercase dark:text-white">Votre panier est vide</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto italic">Il semble que vous n'ayez pas encore déniché de perles rares.</p>
                        <Link href="/" className="inline-block bg-black text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">
                            Commencer mes achats
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LISTE DES ARTICLES (Col 1 & 2) */}
                        <div className="lg:col-span-2 space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                                    {/* Image */}
                                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                        <Image src={item.img || '/placeholder-image.jpg'} alt={item.name} fill sizes="96px" className="object-cover" />
                                    </div>

                                    {/* Infos */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-lg truncate uppercase tracking-tighter dark:text-white">{item.name}</h3>

                                        {/* --- AFFICHAGE DES VARIANTES (Taille / Couleur) --- */}
                                        {(item.selectedSize || item.selectedColor) && (
                                            <div className="flex flex-wrap gap-2 mt-1 mb-2">
                                                {item.selectedSize && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-md">
                                                        Taille: {item.selectedSize}
                                                    </span>
                                                )}
                                                {item.selectedColor && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-md">
                                                        Couleur: {item.selectedColor}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-orange-500 font-black text-xl mb-3">{item.price.toLocaleString('fr-FR')} FCFA</p>

                                        {/* Contrôles Quantité */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-xl px-2 py-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-2 hover:text-orange-600 transition-colors dark:text-slate-300"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-8 text-center font-black text-sm dark:text-white">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-2 hover:text-orange-600 transition-colors dark:text-slate-300"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RÉSUMÉ COMMANDE (Col 3) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 sticky top-10">
                                <h3 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-6">Résumé de la commande</h3>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold">
                                        <span>Articles ({itemCount})</span>
                                        <span>{total.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold">
                                        <span>Livraison</span>
                                        <span className="text-green-600 uppercase text-xs">Gratuit</span>
                                    </div>
                                    <div className="border-t dark:border-slate-700 pt-4 flex justify-between items-end">
                                        <span className="font-black uppercase italic text-sm dark:text-slate-300">Total</span>
                                        <span className="font-black text-3xl text-black dark:text-white leading-none">{total.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                </div>

                                <button className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg shadow-orange-200 dark:shadow-none hover:bg-black transition-all">
                                    Passer la commande
                                </button>

                                <p className="text-[10px] text-center text-slate-400 mt-6 font-bold uppercase tracking-widest">
                                    Paiement sécurisé via Mobile Money
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}