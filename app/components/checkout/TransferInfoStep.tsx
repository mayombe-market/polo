'use client'

// Numéro unique de la plateforme (admin Mayombe Market)
const PAYMENT_CONFIG: Record<string, { name: string; number: string; icon: string; colorClass: string; btnClass: string }> = {
    mobile_money: {
        name: 'MTN Mobile Money',
        number: '06 938 71 69',
        icon: '📱',
        colorClass: 'text-yellow-500 border-yellow-400/20',
        btnClass: 'bg-yellow-400 text-black hover:bg-yellow-300',
    },
    airtel_money: {
        name: 'Airtel Money',
        number: '05 XXX XX XX', // ← REMPLACER PAR LE VRAI NUMÉRO AIRTEL
        icon: '📲',
        colorClass: 'text-red-500 border-red-500/20',
        btnClass: 'bg-red-500 text-white hover:bg-red-400',
    },
}

interface TransferInfoStepProps {
    method: string
    total: number
    onConfirm: () => void
    onBack: () => void
}

export default function TransferInfoStep({ method, total, onConfirm, onBack }: TransferInfoStepProps) {
    const config = PAYMENT_CONFIG[method]
    if (!config) return null

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="text-5xl mb-3">{config.icon}</div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter">{config.name}</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Envoyez le montant exact au numéro ci-dessous
                </p>
            </div>

            {/* Numéro */}
            <div className={`bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center mb-4 border ${config.colorClass}`}>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
                    Numéro de transfert
                </p>
                <p className={`text-3xl font-black font-mono tracking-wider ${config.colorClass.split(' ')[0]}`}>
                    {config.number}
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
                    Vous aurez besoin du code de transaction (ID) de <strong>15 chiffres</strong> reçu par SMS.
                </p>
            </div>

            <button
                onClick={onConfirm}
                className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm shadow-lg transition-all active:scale-[0.98] ${config.btnClass}`}
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
