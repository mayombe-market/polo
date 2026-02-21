'use client'

import { formatOrderNumber } from '@/lib/formatOrderNumber'

interface OrderConfirmedStepProps {
    orderData: any
    type: 'payment_validated' | 'cash_confirmed' | 'rejected'
    onClose: () => void
}

export default function OrderConfirmedStep({ orderData, type, onClose }: OrderConfirmedStepProps) {
    if (type === 'rejected') {
        return (
            <div className="animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 flex items-center justify-center text-4xl mx-auto mb-5">
                    ❌
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">Paiement non validé</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                    L'ID de transaction ne correspond pas.<br />
                    Veuillez vérifier et réessayer ou nous contacter.
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl font-black uppercase italic text-sm border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Fermer
                </button>
            </div>
        )
    }

    const isCash = type === 'cash_confirmed'

    return (
        <div className="animate-fadeIn text-center">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl mx-auto mb-5 ${
                isCash
                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
                    : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 shadow-lg shadow-green-500/10'
            }`}>
                {isCash ? '📦' : '✅'}
            </div>

            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">
                {isCash ? 'Commande confirmée !' : 'Paiement validé !'}
            </h2>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">
                {isCash ? 'Enregistrée avec succès' : 'Transaction vérifiée avec succès'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-6">
                {isCash
                    ? 'Vous recevrez un appel de confirmation sous peu.'
                    : 'Votre commande est en cours de préparation.'}
            </p>

            {/* Récapitulatif */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-green-200/30 dark:border-green-500/10 text-left mb-5">
                <p className="text-green-500 font-black text-[9px] uppercase tracking-[0.2em] mb-3">📋 Récapitulatif</p>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">N° de commande</span>
                        <span className="font-black">{formatOrderNumber(orderData)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Mode de paiement</span>
                        <span>{isCash ? 'Cash à la livraison' : 'Mobile Money'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Montant</span>
                        <span className="text-orange-500 font-black">{(orderData.total_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    {orderData.city && (
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Retrait</span>
                            <span>{orderData.city}, {orderData.district}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Livraison estimée</span>
                        <span className="text-orange-500 font-black">24-48h</span>
                    </div>
                </div>
            </div>

            {isCash && (
                <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/10 rounded-xl p-3.5 flex items-center gap-3 mb-5">
                    <span>💡</span>
                    <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 text-left">
                        Préparez le montant exact. Le livreur vous appellera 30 min avant.
                    </p>
                </div>
            )}

            <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black uppercase italic text-sm bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
            >
                Continuer mes achats
            </button>
        </div>
    )
}
