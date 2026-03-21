'use client'

import {
    DELIVERY_FEE_INTER_URBAN,
    INTER_URBAN_DELIVERY_TIMELINE,
    INTER_URBAN_PRE_PAYMENT_ALERT,
} from '@/lib/checkoutSchema'

/** Étape 1 inter-ville : forfait + délai */
export function InterUrbanDeliveryInfoStep({
    onContinue,
    onBack,
}: {
    onContinue: () => void
    onBack: () => void
}) {
    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="text-4xl mb-3">🚚</div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Livraison inter-ville</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Forfait unique pour cette commande
                </p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 mb-4">
                <p className="font-black text-2xl text-amber-800 dark:text-amber-200 text-center italic">
                    {DELIVERY_FEE_INTER_URBAN.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-[10px] font-bold text-amber-900/80 dark:text-amber-200/90 text-center mt-2 uppercase tracking-wide">
                    Frais de livraison inter-ville
                </p>
            </div>

            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-6 px-1">
                {INTER_URBAN_DELIVERY_TIMELINE}
            </p>

            <button
                type="button"
                onClick={onContinue}
                className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
            >
                Continuer
            </button>

            <button
                type="button"
                onClick={onBack}
                className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
                ← Retour
            </button>
        </div>
    )
}

/** Étape 2 inter-ville : confirmation avant paiement */
export function InterUrbanPrePaymentStep({
    onConfirm,
    onBack,
}: {
    onConfirm: () => void
    onBack: () => void
}) {
    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="text-4xl mb-3">⚠️</div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-orange-600 dark:text-orange-400">
                    Ville différente
                </h2>
            </div>

            <div
                className="p-5 rounded-2xl border-2 border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/40 mb-6"
                role="alert"
            >
                <p className="text-[12px] font-bold text-orange-950 dark:text-orange-100 leading-relaxed text-center">
                    {INTER_URBAN_PRE_PAYMENT_ALERT}
                </p>
            </div>

            <button
                type="button"
                onClick={onConfirm}
                className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
            >
                Oui, continuer
            </button>

            <button
                type="button"
                onClick={onBack}
                className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
                ← Retour
            </button>
        </div>
    )
}
