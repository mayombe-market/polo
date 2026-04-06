'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Truck, Smartphone } from 'lucide-react'

const STORAGE_KEY = 'mayombe_welcomed'

export default function WelcomePopup() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY)) return
        // Petit délai pour laisser la page se charger
        const t = setTimeout(() => setVisible(true), 600)
        return () => clearTimeout(t)
    }, [])

    const dismiss = () => {
        setVisible(false)
        localStorage.setItem(STORAGE_KEY, '1')
    }

    if (!visible) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={dismiss}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-slate-950 border border-white/[0.08] rounded-[28px] p-8 shadow-2xl animate-fadeIn">
                {/* Logo */}
                <div className="flex justify-center mb-5">
                    <img
                        src="/logo.png"
                        alt="Mayombe Market"
                        className="h-20 w-auto"
                    />
                </div>

                {/* Title */}
                <h2 className="text-center text-[#F0ECE2] text-xl font-extrabold tracking-tight mb-2">
                    La premiere marketplace du Congo
                </h2>
                <p className="text-center text-slate-400 text-sm leading-relaxed mb-7">
                    Achetez et vendez en toute confiance. Livraison a Brazzaville et Pointe-Noire.
                </p>

                {/* Trust points */}
                <div className="space-y-3.5 mb-8">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <Smartphone size={18} className="text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[#F0ECE2] text-sm font-semibold">Paiement Mobile Money & Airtel Money</p>
                            <p className="text-slate-500 text-xs">Payez simplement depuis votre telephone</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck size={18} className="text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[#F0ECE2] text-sm font-semibold">Vendeurs verifies</p>
                            <p className="text-slate-500 text-xs">Chaque boutique est validee par notre equipe</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <Truck size={18} className="text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[#F0ECE2] text-sm font-semibold">Livraison dans toute la ville</p>
                            <p className="text-slate-500 text-xs">Brazzaville et Pointe-Noire</p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={dismiss}
                    className="w-full py-4 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: 'linear-gradient(135deg, #E8A838, #D4782F)',
                        boxShadow: '0 8px 24px rgba(232,168,56,0.25)',
                    }}
                >
                    Explorer
                </button>
            </div>
        </div>
    )
}
