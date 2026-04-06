'use client'

import { getAdminPaymentNumber } from '@/lib/adminPaymentConfig'
import { profileCityToCheckoutDisplay, normalizeToServiceCityCode } from '@/lib/deliveryLocation'

const PAYMENT_META: Record<
    string,
    { name: string; icon: string; colorClass: string; btnClass: string; paymentKey: 'mobile_money' | 'airtel_money' }
> = {
    mobile_money: {
        name: 'MTN Mobile Money',
        icon: '📱',
        colorClass: 'text-yellow-500 border-yellow-400/20',
        btnClass: 'bg-yellow-400 text-black hover:bg-yellow-300',
        paymentKey: 'mobile_money',
    },
    airtel_money: {
        name: 'Airtel Money',
        icon: '📲',
        colorClass: 'text-red-500 border-red-500/20',
        btnClass: 'bg-red-500 text-white hover:bg-red-400',
        paymentKey: 'airtel_money',
    },
}

interface TransferInfoStepProps {
    method: string
    total: number
    onConfirm: () => void
    onBack: () => void
    /** Ville du vendeur (`profiles.city`) — détermine quel numéro admin afficher. */
    sellerCity?: string | null
    /** Ex. panier avec vendeurs dans plusieurs villes : numéro fallback + message. */
    ambiguousSellerCities?: boolean
}

export default function TransferInfoStep({
    method,
    total,
    onConfirm,
    onBack,
    sellerCity,
    ambiguousSellerCities = false,
}: TransferInfoStepProps) {
    const meta = PAYMENT_META[method]
    if (!meta) return null

    const displayNumber = getAdminPaymentNumber(sellerCity, meta.paymentKey)
    const cityLabel =
        !ambiguousSellerCities && normalizeToServiceCityCode(sellerCity)
            ? profileCityToCheckoutDisplay(sellerCity)
            : null

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="text-5xl mb-3">{meta.icon}</div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter">{meta.name}</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Envoyez le montant exact au numéro ci-dessous
                </p>
                {cityLabel && !ambiguousSellerCities && (
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                        Compte plateforme — zone <span className="text-orange-500">{cityLabel}</span> (ville du vendeur)
                    </p>
                )}
            </div>

            {ambiguousSellerCities && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 mb-4">
                    <p className="text-[9px] font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
                        Votre panier contient des vendeurs dans des villes différentes. Le numéro affiché correspond au
                        compte <strong>Brazzaville</strong> par défaut ; en cas de doute, contactez le support après
                        paiement en indiquant votre ID de transaction.
                    </p>
                </div>
            )}

            {/* Numéro */}
            <div className={`bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center mb-4 border ${meta.colorClass}`}>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
                    Numéro de transfert
                </p>
                <p className={`text-3xl font-black font-mono tracking-wider ${meta.colorClass.split(' ')[0]}`}>
                    {displayNumber}
                </p>
            </div>

            {/* Montant */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-center mb-5 border border-slate-200 dark:border-slate-700">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Montant à envoyer</p>
                <p className="text-2xl font-black italic text-orange-500">{total.toLocaleString('fr-FR')} FCFA</p>
            </div>

            {/* Avertissement */}
            <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/15 rounded-xl p-4 mb-5 flex gap-3">
                <span className="text-base flex-shrink-0">⚠️</span>
                <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 leading-relaxed">
                    Effectuez le transfert <strong>avant</strong> de cliquer sur le bouton ci-dessous.
                    Vous aurez besoin du code de transaction (ID) de <strong>10 chiffres</strong> reçu par SMS.
                </p>
            </div>

            <button
                onClick={onConfirm}
                className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm shadow-lg transition-all active:scale-[0.98] ${meta.btnClass}`}
            >
                J'ai effectué le transfert ✓
            </button>

            <button
                onClick={onBack}
                className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
                ← Retour
            </button>
        </div>
    )
}
