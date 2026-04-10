'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminAdjustLoyalty } from '@/app/actions/loyalty'

type Props = {
    userId: string
}

export default function AdminAdjustForm({ userId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [sign, setSign] = useState<'+' | '−'>('+')
    const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

    function submit(e: React.FormEvent) {
        e.preventDefault()
        setFeedback(null)
        const num = Number(amount)
        if (!num || num <= 0) {
            setFeedback({ kind: 'err', msg: 'Montant invalide' })
            return
        }
        if (!reason.trim()) {
            setFeedback({ kind: 'err', msg: 'Raison obligatoire' })
            return
        }
        const signed = sign === '+' ? num : -num

        startTransition(async () => {
            const res = await adminAdjustLoyalty(userId, signed, reason.trim())
            if (res.ok) {
                setFeedback({ kind: 'ok', msg: 'Ajustement enregistré' })
                setAmount('')
                setReason('')
                router.refresh()
            } else {
                setFeedback({ kind: 'err', msg: res.error })
            }
        })
    }

    return (
        <form
            onSubmit={submit}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 space-y-3"
        >
            <div className="flex gap-2">
                <select
                    value={sign}
                    onChange={(e) => setSign(e.target.value as '+' | '−')}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold"
                    disabled={isPending}
                >
                    <option value="+">+ Ajouter</option>
                    <option value="−">− Retirer</option>
                </select>
                <input
                    type="number"
                    min={1}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Montant en FCFA"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    disabled={isPending}
                />
            </div>

            <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Raison de l'ajustement (obligatoire, conservée dans l'historique)"
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                disabled={isPending}
            />

            <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
                {isPending ? 'Enregistrement…' : 'Appliquer l\'ajustement'}
            </button>

            {feedback && (
                <p
                    className={`text-xs ${
                        feedback.kind === 'ok'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                    }`}
                >
                    {feedback.msg}
                </p>
            )}
        </form>
    )
}
