'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import StarRating from '@/app/components/StarRating'
import { RATING_CATEGORIES, type RatingCategoryId } from '@/lib/ratingCategories'
import { submitRatingFromLabel } from '@/app/actions/orderLabels'

const TAG_ON: Record<string, string> = {
    amber: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300',
    violet: 'bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300',
}

export default function RateOrderForm({ token, shopName }: { token: string; shopName: string }) {
    const [notes, setNotes] = useState<Record<RatingCategoryId, number>>({ vendor: 0, delivery: 0, platform: 0 })
    const [tags, setTags] = useState<Record<RatingCategoryId, string[]>>({ vendor: [], delivery: [], platform: [] })
    const [comment, setComment] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const toggle = (id: RatingCategoryId, tag: string) =>
        setTags(prev => ({ ...prev, [id]: prev[id].includes(tag) ? prev[id].filter(t => t !== tag) : [...prev[id], tag] }))

    const send = async () => {
        setSending(true)
        setError(null)
        const res = await submitRatingFromLabel(token, {
            vendorRating: notes.vendor || undefined,
            deliveryRating: notes.delivery || undefined,
            platformRating: notes.platform || undefined,
            vendorTags: tags.vendor,
            deliveryTags: tags.delivery,
            platformTags: tags.platform,
            comment,
        })
        setSending(false)
        if ('error' in res) setError(res.error)
        else setDone(true)
    }

    if (done) {
        return (
            <div className="py-4">
                <p className="text-5xl mb-3">🙏</p>
                <p className="text-lg font-black text-slate-900 dark:text-white mb-1">Merci pour votre avis !</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Il aide {shopName} et les autres clients de Mayombe Market.</p>
                <Link href="/marketplace" className="inline-block px-6 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black">Continuer mes achats</Link>
            </div>
        )
    }

    const hasNote = notes.vendor || notes.delivery || notes.platform

    return (
        <div className="text-left space-y-4">
            {RATING_CATEGORIES.map(cat => (
                <div key={cat.id} className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{cat.icon} {cat.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{cat.question}</p>
                    <div className="flex items-center gap-3">
                        <StarRating rating={notes[cat.id]} editable size={30} onChange={n => setNotes(prev => ({ ...prev, [cat.id]: n }))} />
                        {notes[cat.id] > 0 && <span className="text-xs font-bold text-slate-500">{cat.labels[notes[cat.id] - 1]}</span>}
                    </div>
                    {notes[cat.id] > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {cat.tags.map(tag => (
                                <button key={tag} type="button" onClick={() => toggle(cat.id, tag)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${tags[cat.id].includes(tag) ? TAG_ON[cat.color] : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Un mot sur votre achat ? (facultatif)"
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            {error && <p className="text-sm font-bold text-red-500 text-center">{error}</p>}
            <button type="button" onClick={send} disabled={!hasNote || sending}
                className="w-full min-h-[52px] rounded-2xl bg-orange-500 text-white text-sm font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer">
                {sending ? <Loader2 size={16} className="animate-spin" /> : null} Envoyer mon avis
            </button>
            <p className="text-[11px] text-slate-400 text-center">En envoyant votre avis, vous confirmez avoir reçu votre commande.</p>
        </div>
    )
}
