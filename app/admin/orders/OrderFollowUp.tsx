'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Mail, Loader2, BellRing, KeyRound, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { buildOrderTimeline, type TimelineEvent } from '@/lib/vendorPaymentDecision'
import { formatAdminDateTime } from '@/lib/formatDateTime'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import {
    formatDelay, isAwaitingVendor, isFastResponder, minutesBetween, vendorAnsweredAt,
    type ResponsivenessSummary,
} from '@/lib/vendorResponsiveness'
import { adminRemindVendor, type OrdersContext } from '@/app/actions/adminOrderFollowUp'

/** Retard à partir duquel une commande sans réponse est signalée en rouge. */
const LATE_AFTER_MIN = 30

function normalizeCongo(raw?: string | null): { display: string; intl: string } | null {
    const digits = (raw || '').replace(/\D/g, '')
    const local = digits.startsWith('242') ? digits.slice(3) : digits
    if (local.length !== 9 || !local.startsWith('0')) return null
    return { display: `+242 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`, intl: `242${local}` }
}

export function ContactLinks({ phone, email, waText }: { phone?: string | null; email?: string | null; waText?: string }) {
    const p = normalizeCongo(phone)
    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {p ? (
                <>
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 mr-1">{p.display}</span>
                    <a href={`tel:+${p.intl}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Phone size={10} /> Appeler
                    </a>
                    <a href={`https://wa.me/${p.intl}${waText ? `?text=${encodeURIComponent(waText)}` : ''}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500 text-[9px] font-black uppercase text-white hover:bg-green-600">
                        <MessageCircle size={10} /> WhatsApp
                    </a>
                </>
            ) : phone ? (
                <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-[11px] font-black text-slate-700 dark:text-slate-200 underline">{phone}</a>
            ) : (
                <span className="text-[10px] text-slate-400">Pas de numéro</span>
            )}
            {email && (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 break-all">
                    <Mail size={10} /> {email}
                </a>
            )}
        </div>
    )
}

const DOT: Record<TimelineEvent['kind'], string> = {
    created: 'bg-slate-400', vendor_confirmed: 'bg-green-500', vendor_disputed: 'bg-red-500', cod_accepted: 'bg-green-500',
    reminder: 'bg-amber-400', confirmed: 'bg-blue-500', rejected: 'bg-red-500', picked_up: 'bg-violet-500',
    delivered: 'bg-emerald-500', client_confirmed: 'bg-emerald-600', rated: 'bg-yellow-400',
}
const ICON: Record<TimelineEvent['kind'], string> = {
    created: '🕐', vendor_confirmed: '✅', vendor_disputed: '❌', cod_accepted: '✅', reminder: '⏰', confirmed: '📦',
    rejected: '🚫', picked_up: '🏍️', delivered: '🎉', client_confirmed: '🤝', rated: '⭐',
}

export default function OrderFollowUp({
    order,
    ctx,
    responsiveness,
    canAct,
    onReminded,
}: {
    order: any
    ctx: OrdersContext | null
    responsiveness: Record<string, ResponsivenessSummary>
    canAct: boolean
    onReminded: (orderId: string, vendorId: string, at: string) => void
}) {
    const [sending, setSending] = useState<string | null>(null)
    const sellerIds = [...new Set(((order.items || []) as Array<{ seller_id?: string }>).map(i => i.seller_id).filter(Boolean))] as string[]
    const shopNames = Object.fromEntries(sellerIds.map(id => [id, ctx?.vendors[id]?.shopName || 'Vendeur']))
    const reminders = (ctx?.reminders[order.id] || []).map(r => ({ at: r.at, shop: shopNames[r.vendorId] }))
    const events = buildOrderTimeline(order, shopNames, { ratedAt: ctx?.ratedAt[order.id], reminders })
    const nowIso = new Date().toISOString()
    const orderLabel = formatOrderNumber(order)

    const remind = async (vendorId: string) => {
        setSending(vendorId)
        try {
            const res = await adminRemindVendor(order.id, vendorId)
            if ('error' in res) { toast.error(res.error); return }
            onReminded(order.id, vendorId, res.sentAt)
            toast.success(res.emailed ? 'Relance envoyée (email + notification)' : 'Relance envoyée (notification ; pas d’email enregistré)')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Échec de la relance')
        } finally {
            setSending(null)
        }
    }

    return (
        <div className="mb-6 space-y-4">
            {/* Vendeurs : réponse, réactivité, contact, relance */}
            {sellerIds.map(sid => {
                const v = ctx?.vendors[sid]
                const answeredAt = vendorAnsweredAt(order, sid)
                const awaiting = isAwaitingVendor(order, sid)
                const waitMin = minutesBetween(order.created_at, nowIso)
                const r = responsiveness[sid]
                return (
                    <div key={sid} className="rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Vendeur</p>
                                <p className="text-sm font-black dark:text-white">{shopNames[sid]}</p>
                                {v && v.name !== shopNames[sid] && <p className="text-[10px] text-slate-500">{v.name}</p>}
                            </div>
                            {answeredAt ? (
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">
                                    A répondu en {formatDelay(minutesBetween(order.created_at, answeredAt))}
                                </span>
                            ) : awaiting ? (
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${waitMin >= LATE_AFTER_MIN ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-700'}`}>
                                    Sans réponse depuis {formatDelay(waitMin)}
                                </span>
                            ) : null}
                        </div>

                        {r && r.answered > 0 && (
                            <p className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                {isFastResponder(r) && <Zap size={11} className="text-orange-500" />}
                                Répond en {formatDelay(r.medianMinutes ?? 0)} en général ({r.answered} commande{r.answered > 1 ? 's' : ''})
                                {isFastResponder(r) && <span className="text-orange-600 font-black"> · Répond rapidement</span>}
                            </p>
                        )}

                        <ContactLinks
                            phone={v?.whatsapp || v?.phone}
                            email={v?.email}
                            waText={`Bonjour ${v?.name || ''}, c'est Mayombe Market. La commande ${orderLabel} attend votre réponse.`}
                        />

                        {awaiting && (
                            <button
                                onClick={() => remind(sid)}
                                disabled={!canAct || sending === sid}
                                title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase hover:bg-orange-600 disabled:opacity-50"
                            >
                                {sending === sid ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
                                Relancer le vendeur (email + notification)
                            </button>
                        )}
                    </div>
                )
            })}

            {/* Code de livraison (paiement à la livraison) */}
            {order.payment_method === 'cash' && (
                <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3 flex items-center gap-3">
                    <KeyRound size={16} className="text-amber-600 flex-shrink-0" />
                    <div className="text-[11px]">
                        <span className="font-black uppercase text-amber-800 dark:text-amber-300 mr-2">Code de livraison</span>
                        {order.delivery_code ? (
                            <><span className="font-mono font-black tracking-[0.25em] text-amber-900 dark:text-amber-100">{order.delivery_code}</span><span className="text-slate-500"> · pas encore utilisé</span></>
                        ) : order.delivery_code_used ? (
                            <><span className="font-mono font-black tracking-[0.25em] text-amber-900 dark:text-amber-100">{order.delivery_code_used}</span><span className="text-slate-500"> · utilisé à la livraison</span></>
                        ) : (
                            <span className="text-slate-500">{order.status === 'delivered' ? 'utilisé (code non archivé)' : '—'}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Chronologie */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-5">
                <p className="text-[8px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Chronologie</p>
                <ol className="space-y-4">
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
                </ol>
            </div>
        </div>
    )
}
