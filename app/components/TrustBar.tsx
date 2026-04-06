'use client'

import { ShieldCheck, Truck, Smartphone } from 'lucide-react'

export default function TrustBar() {
    return (
        <div className="w-full bg-slate-950/80 border-b border-white/[0.05]">
            <div className="flex items-center justify-center gap-6 md:gap-10 px-4 py-2 text-[11px] md:text-xs font-medium text-slate-400 overflow-x-auto whitespace-nowrap">
                <span className="flex items-center gap-1.5 shrink-0">
                    <Smartphone size={13} className="text-orange-400" />
                    Paiement Mobile Money
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5 shrink-0">
                    <ShieldCheck size={13} className="text-orange-400" />
                    Vendeurs verifies
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5 shrink-0">
                    <Truck size={13} className="text-orange-400" />
                    Livraison Brazza & PNR
                </span>
            </div>
        </div>
    )
}
