'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false)
    const [showReconnected, setShowReconnected] = useState(false)

    useEffect(() => {
        // Check initial state
        setIsOffline(!navigator.onLine)

        const handleOffline = () => {
            setIsOffline(true)
            setShowReconnected(false)
        }

        const handleOnline = () => {
            setIsOffline(false)
            setShowReconnected(true)
            // Hide "reconnected" message after 3 seconds
            setTimeout(() => setShowReconnected(false), 3000)
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    if (!isOffline && !showReconnected) return null

    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
                isOffline
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white'
            }`}
        >
            {isOffline ? (
                <>
                    <WifiOff size={16} />
                    <span>Vous êtes hors-ligne</span>
                </>
            ) : (
                <>
                    <Wifi size={16} />
                    <span>Connexion rétablie</span>
                </>
            )}
        </div>
    )
}
