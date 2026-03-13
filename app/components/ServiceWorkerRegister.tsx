'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function ServiceWorkerRegister() {
    const [showUpdate, setShowUpdate] = useState(false)
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
                // Check for waiting worker (update already downloaded)
                if (reg.waiting) {
                    setWaitingWorker(reg.waiting)
                    setShowUpdate(true)
                }

                // Listen for new updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing
                    if (!newWorker) return

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version ready — show update banner
                            setWaitingWorker(newWorker)
                            setShowUpdate(true)
                        }
                    })
                })
            })
            .catch((err) => {
                console.error('SW registration failed:', err)
            })

        // Handle controller change (after skipWaiting)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload()
        })
    }, [])

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' })
        }
    }

    if (!showUpdate) return null

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm">
            <RefreshCw size={16} className="shrink-0" />
            <span>Nouvelle version disponible</span>
            <button
                onClick={handleUpdate}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors border-none cursor-pointer"
            >
                Actualiser
            </button>
        </div>
    )
}
