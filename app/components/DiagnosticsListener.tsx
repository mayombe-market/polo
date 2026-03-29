'use client'

import { useEffect } from 'react'
import { diagError } from '@/lib/diagnostics'

/**
 * Remonte les erreurs non gérées dans la console avec le préfixe [Mayombe].
 * À garder léger : pas d’envoi réseau par défaut (voir F12 → Console).
 */
export default function DiagnosticsListener() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      diagError('window.onerror', event.message || 'Erreur script', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorName: event.error?.name,
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Promise rejetée'
      diagError('unhandledrejection', msg, {
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
