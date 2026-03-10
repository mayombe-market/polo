'use client'

import { DELIVERY_FEES } from '@/lib/checkoutSchema'

interface DeliveryModeStepProps {
    onSelect: (mode: 'standard' | 'express') => void
    onBack: () => void
}

const MODES = [
    {
        id: 'express' as const,
        name: 'Express',
        sub: '3H — 6H · Livreur dédié',
        icon: '⚡',
        price: DELIVERY_FEES.express,
        badge: 'RAPIDE',
        borderHover: 'hover:border-orange-500 dark:hover:border-orange-500/60',
        bgHover: 'hover:bg-orange-50 dark:hover:bg-orange-500/5',
        badgeClass: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600',
        priceClass: 'text-orange-500',
        perks: [
            { icon: '🏍️', text: 'Livreur dédié à votre commande' },
            { icon: '📞', text: 'Le livreur vous appelle avant d\'arriver' },
            { icon: '📍', text: 'Suivi en temps réel par SMS' },
        ],
    },
    {
        id: 'standard' as const,
        name: 'Standard',
        sub: '6H — 48H · Livraison groupée',
        icon: '📦',
        price: DELIVERY_FEES.standard,
        badge: 'ÉCONOMIQUE',
        borderHover: 'hover:border-green-500 dark:hover:border-green-500/60',
        bgHover: 'hover:bg-green-50 dark:hover:bg-green-500/5',
        badgeClass: 'bg-green-100 dark:bg-green-500/10 text-green-600',
        priceClass: 'text-green-500',
        perks: [
            { icon: '📦', text: 'Livraison groupée éco-responsable' },
            { icon: '📱', text: 'Notification SMS à la livraison' },
            { icon: '🕐', text: 'Créneau communiqué par SMS' },
        ],
    },
]

export default function DeliveryModeStep({ onSelect, onBack }: DeliveryModeStepProps) {
    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="text-4xl mb-3">🚚</div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Mode de livraison</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Choisissez votre vitesse de livraison
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {MODES.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onSelect(m.id)}
                        className={`w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-200 active:scale-[0.98] ${m.borderHover} ${m.bgHover}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                                {m.icon}
                            </div>
                            <div className="text-left flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-black uppercase italic text-xs">{m.name}</p>
                                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${m.badgeClass}`}>
                                        {m.badge}
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{m.sub}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className={`font-black italic text-sm ${m.priceClass}`}>
                                    {m.price.toLocaleString('fr-FR')} F
                                </p>
                            </div>
                        </div>

                        {/* Perks */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-1.5">
                            {m.perks.map((perk, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs">{perk.icon}</span>
                                    <span className="text-[10px] font-bold text-slate-400 text-left">{perk.text}</span>
                                </div>
                            ))}
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={onBack}
                className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
                ← Retour
            </button>
        </div>
    )
}
