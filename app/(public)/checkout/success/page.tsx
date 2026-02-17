'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCart } from '@/hooks/userCart'
import { CheckCircle, ShoppingBag, Package, Smartphone } from 'lucide-react'

function SuccessContent() {
    const { clearCart } = useCart()
    const searchParams = useSearchParams()
    const method = searchParams.get('method')
    const totalParam = searchParams.get('total')

    useEffect(() => {
        clearCart()
    }, [clearCart])

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                        <CheckCircle size={48} />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Commande envoyée !</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
                        Votre commande a été enregistrée. Le vendeur vous contactera sur WhatsApp.
                    </p>
                </div>

                {/* INSTRUCTIONS SELON LA MÉTHODE DE PAIEMENT */}
                {method === 'mobile_money' ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border border-green-200 dark:border-green-800 text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <Smartphone size={20} className="text-green-600" />
                            <p className="font-black uppercase text-xs text-green-700 dark:text-green-400">Paiement Mobile Money</p>
                        </div>
                        <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">
                            Envoyez <strong>{totalParam ? Number(totalParam).toLocaleString('fr-FR') : '...'} FCFA</strong> au
                            <strong> 06 938 71 69</strong> via MTN MoMo ou Airtel Money.
                        </p>
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
                            Votre commande sera confirmée dès réception du paiement.
                        </p>
                    </div>
                ) : (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-3xl border border-orange-200 dark:border-orange-800 text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <Package size={20} className="text-orange-600" />
                            <p className="font-black uppercase text-xs text-orange-700 dark:text-orange-400">Cash à la livraison</p>
                        </div>
                        <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
                            Préparez <strong>{totalParam ? Number(totalParam).toLocaleString('fr-FR') : '...'} FCFA</strong> en espèces pour le livreur.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 pt-4">
                    <Link
                        href="/orders"
                        className="bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black uppercase italic text-sm flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all"
                    >
                        <Package size={18} /> Suivre ma commande
                    </Link>

                    <Link
                        href="/"
                        className="py-4 rounded-2xl font-black uppercase italic text-sm text-slate-400 hover:text-green-600 transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingBag size={18} /> Continuer mes achats
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center animate-pulse font-black italic">CHARGEMENT...</div>}>
            <SuccessContent />
        </Suspense>
    )
}
