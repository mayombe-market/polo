'use client'

import { buildOrderTimeline, type TimelineEvent } from '@/lib/vendorPaymentDecision'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const DOT: Record<TimelineEvent['kind'], string> = {
    created: 'bg-slate-400',
    vendor_confirmed: 'bg-green-500',
    vendor_disputed: 'bg-red-500',
    confirmed: 'bg-blue-500',
    rejected: 'bg-red-500',
    picked_up: 'bg-violet-500',
    delivered: 'bg-emerald-500',
}

const ICON: Record<TimelineEvent['kind'], string> = {
    created: '🕐',
    vendor_confirmed: '✅',
    vendor_disputed: '❌',
    confirmed: '📦',
    rejected: '🚫',
    picked_up: '🏍️',
    delivered: '🎉',
}

export default function OrderTimeline({ order, shopNames }: { order: any; shopNames: Record<string, string> }) {
    const events = buildOrderTimeline(order, shopNames)
    const vp = (order.vendor_payments || {}) as Record<string, { vendor_confirmed?: boolean; disputed?: boolean }>
    const waitingShops = order.status === 'pending'
        ? Object.entries(vp).filter(([, e]) => !e.vendor_confirmed && !e.disputed).map(([sid]) => shopNames[sid] || 'Vendeur')
        : []

    return (
        <div className="mb-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-5">
            <p className="text-[8px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Chronologie</p>
            <ol className="relative space-y-4">
                {events.map((e, i) => (
                    <li key={`${e.kind}-${i}`} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${DOT[e.kind]}`} />
                            {i < events.length - 1 && <span className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                        </div>
                        <div className="pb-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 break-words">
                                <span className="mr-1">{ICON[e.kind]}</span>{e.label}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatAdminDateTime(e.at)}</p>
                        </div>
                    </li>
                ))}
                {waitingShops.length > 0 && (
                    <li className="flex gap-3">
                        <span className="w-2.5 h-2.5 rounded-full mt-1.5 bg-amber-400 animate-pulse" />
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            ⏳ En attente de la réponse de {waitingShops.join(', ')}
                        </p>
                    </li>
                )}
            </ol>
        </div>
    )
}
