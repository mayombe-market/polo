'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, X } from 'lucide-react'

type OrderEvent = {
    name: string
    city: string
    product: string
    img: string | null
    at: string
}

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'à l\'instant'
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
    return `il y a ${Math.floor(diff / 86400)} j`
}

export default function RecentOrdersWidget() {
    const [events, setEvents] = useState<OrderEvent[]>([])
    const [current, setCurrent] = useState<OrderEvent | null>(null)
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    const idxRef = useRef(0)

    useEffect(() => {
        fetch('/api/recent-orders')
            .then(r => r.json())
            .then((data: OrderEvent[]) => setEvents(data || []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (events.length === 0 || dismissed) return

        let showTimer: ReturnType<typeof setTimeout>
        let hideTimer: ReturnType<typeof setTimeout>

        function showNext() {
            const evt = events[idxRef.current % events.length]
            idxRef.current++
            setCurrent(evt)
            setVisible(true)

            // Visible pendant 5 secondes
            hideTimer = setTimeout(() => {
                setVisible(false)
                // Prochain dans 12 secondes
                showTimer = setTimeout(showNext, 12000)
            }, 5000)
        }

        // Première apparition après 4 secondes
        showTimer = setTimeout(showNext, 4000)

        return () => {
            clearTimeout(showTimer)
            clearTimeout(hideTimer)
        }
    }, [events, dismissed])

    if (!current || dismissed) return null

    return (
        <div
            className={`fixed bottom-6 left-4 z-50 transition-all duration-500 ${
                visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-3 flex items-center gap-3 w-[270px]">

                {/* Image ou icône */}
                {current.img ? (
                    <img
                        src={current.img}
                        alt={current.product}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart size={20} className="text-orange-500" />
                    </div>
                )}

                {/* Texte */}
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold dark:text-white leading-snug">
                        <span className="text-orange-500">{current.name}</span>
                        {current.city ? <span className="text-slate-500 font-normal"> · {current.city}</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        vient d&apos;acheter
                    </p>
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {current.product}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(current.at)}</p>
                </div>

                {/* Fermer */}
                <button
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors self-start mt-0.5"
                    aria-label="Fermer"
                >
                    <X size={13} />
                </button>
            </div>
        </div>
    )
}
