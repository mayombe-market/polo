'use client'

import { ShieldCheck, Truck, Smartphone, RotateCcw } from 'lucide-react'

const items = [
    { icon: Smartphone, text: 'Paiement Mobile Money' },
    { icon: ShieldCheck, text: 'Vendeurs verifies' },
    { icon: Truck, text: 'Livraison Brazza & PNR' },
    { icon: RotateCcw, text: 'Retour sous 24h' },
]

export default function TrustBar() {
    return (
        <div className="w-full bg-slate-950/80 border-b border-white/[0.05] overflow-hidden">
            <div className="trust-marquee flex whitespace-nowrap py-2 text-[11px] md:text-xs font-medium text-slate-400">
                {[0, 1].map((copy) => (
                    <div key={copy} className="trust-marquee-track flex shrink-0 items-center gap-8 px-4" aria-hidden={copy === 1}>
                        {items.map((item) => (
                            <span key={`${copy}-${item.text}`} className="flex items-center gap-1.5 shrink-0">
                                <item.icon size={13} className="text-orange-400" />
                                {item.text}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
