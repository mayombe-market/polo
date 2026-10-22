'use client'

import { KeyRound } from 'lucide-react'

const HIDDEN_STATUSES = ['delivered', 'rejected', 'cancelled']

/** Code de livraison (paiement à la livraison) à donner au vendeur ou au livreur à la réception. */
export default function DeliveryCodeBadge({ order }: { order: { payment_method?: string | null; status?: string | null; delivery_code?: string | null } }) {
    if (order.payment_method !== 'cash' || !order.delivery_code || HIDDEN_STATUSES.includes(order.status || '')) return null
    return (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-600/60 bg-amber-50 dark:bg-amber-900/15 p-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                <KeyRound size={18} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Code de livraison</p>
                <p className="font-mono text-2xl font-black tracking-[0.3em] text-amber-900 dark:text-amber-100 select-all">{order.delivery_code}</p>
                <p className="text-[11px] leading-snug text-amber-800/90 dark:text-amber-200/80 mt-0.5">
                    Donnez ce code au vendeur au moment où vous recevez votre colis et payez en espèces.
                </p>
            </div>
        </div>
    )
}
