'use client'

import { useEffect } from 'react'

/**
 * Recharge automatiquement la page quand l'utilisateur revient en ligne
 * après avoir été hors connexion.
 * Évite que la page reste figée/périmée après une coupure réseau.
 */
export default function OnlineRefresh() {
    useEffect(() => {
        let wasOffline = false

        const handleOffline = () => {
            wasOffline = true
        }

        const handleOnline = () => {
            if (wasOffline) {
                wasOffline = false
                window.location.reload()
            }
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    return null
}
