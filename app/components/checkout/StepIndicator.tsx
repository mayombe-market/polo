'use client'

const STEPS = [
    { key: 'location', label: 'Retrait', icon: '📍' },
    { key: 'payment', label: 'Paiement', icon: '💳' },
    { key: 'confirm', label: 'Confirmation', icon: '✓' },
]

export default function StepIndicator({ activeStep }: { activeStep: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-6">
            {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                                i <= activeStep
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                            } ${i === activeStep ? 'scale-110' : ''}`}
                        >
                            {i < activeStep ? '✓' : s.icon}
                        </div>
                        <span
                            className={`text-[9px] uppercase tracking-widest font-black transition-colors ${
                                i <= activeStep ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            {s.label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div
                            className={`w-10 h-0.5 mx-2 mb-5 transition-colors duration-300 ${
                                i < activeStep ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
