'use client'

const METHODS = [
    {
        id: 'mobile_money',
        name: 'Mobile Money',
        sub: 'MTN Mobile Money',
        icon: '📱',
        borderHover: 'hover:border-yellow-400 dark:hover:border-yellow-400/60',
        bgHover: 'hover:bg-yellow-50 dark:hover:bg-yellow-400/5',
    },
    {
        id: 'airtel_money',
        name: 'Airtel Money',
        sub: 'Airtel Money Transfer',
        icon: '📲',
        borderHover: 'hover:border-red-500 dark:hover:border-red-500/60',
        bgHover: 'hover:bg-red-50 dark:hover:bg-red-500/5',
    },
    {
        id: 'cash',
        name: 'Payer en Cash',
        sub: 'Paiement à la livraison',
        icon: '💵',
        borderHover: 'hover:border-green-500 dark:hover:border-green-500/60',
        bgHover: 'hover:bg-green-50 dark:hover:bg-green-500/5',
    },
]

interface PaymentMethodStepProps {
    onSelect: (method: string) => void
    onBack: () => void
}

export default function PaymentMethodStep({ onSelect, onBack }: PaymentMethodStepProps) {
    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Mode de paiement</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Choisissez comment régler
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {METHODS.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onSelect(m.id)}
                        className={`w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] ${m.borderHover} ${m.bgHover}`}
                    >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                            {m.icon}
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-black uppercase italic text-xs">{m.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{m.sub}</p>
                        </div>
                        <span className="text-slate-300 dark:text-slate-600 text-xl">›</span>
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
