'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { startAdminAlarm, stopAdminAlarm } from '@/lib/notificationSound'

type TriggerKind = 'order' | 'verification' | 'notification'

interface AlarmState {
    kind: TriggerKind
    label: string
    emoji: string
    count: number
    lastAt: Date
}

const KIND_META: Record<TriggerKind, { label: string; emoji: string }> = {
    order:        { label: 'NOUVELLE COMMANDE',        emoji: '🛒' },
    verification: { label: 'NOUVELLE VÉRIFICATION',   emoji: '🔒' },
    notification: { label: 'NOUVELLE NOTIFICATION',   emoji: '🔔' },
}

export default function AdminAlarmBanner() {
    const { profile } = useAuth()
    const isAdmin = profile?.role === 'admin'

    const [alarm, setAlarm]   = useState<AlarmState | null>(null)
    const [frame, setFrame]   = useState(false)   // toggle pour le flash
    const frameRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Flash visuel 2×/s pendant que l'alarme tourne
    useEffect(() => {
        if (alarm) {
            frameRef.current = setInterval(() => setFrame(f => !f), 350)
        } else {
            if (frameRef.current) clearInterval(frameRef.current)
            setFrame(false)
        }
        return () => { if (frameRef.current) clearInterval(frameRef.current) }
    }, [!!alarm])

    // Vibration mobile (si dispo)
    useEffect(() => {
        if (!alarm || !('vibrate' in navigator)) return
        const PATTERN = [250, 80, 250, 80, 250]
        navigator.vibrate(PATTERN)
        const iv = setInterval(() => navigator.vibrate(PATTERN), 2200)
        return () => { clearInterval(iv); navigator.vibrate(0) }
    }, [!!alarm])

    const trigger = useCallback((kind: TriggerKind) => {
        if (!isAdmin) return
        setAlarm(prev =>
            prev
                ? { ...prev, count: prev.count + 1, lastAt: new Date() }
                : { kind, ...KIND_META[kind], count: 1, lastAt: new Date() }
        )
        startAdminAlarm()
    }, [isAdmin])

    const stop = useCallback(() => {
        stopAdminAlarm()
        setAlarm(null)
    }, [])

    // Abonnements real-time
    useRealtime('order:insert',        () => trigger('order'))
    useRealtime('verification:insert', () => trigger('verification'))
    useRealtime('notification:insert', () => trigger('notification'))

    if (!isAdmin || !alarm) return null

    const bg = frame ? '#b91c1c' : '#dc2626'   // rouge foncé ↔ rouge vif

    return (
        <div
            role="alert"
            aria-live="assertive"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                background: bg,
                transition: 'background 0.15s',
                boxShadow: `0 4px 32px rgba(185,28,28,0.7)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 24px',
            }}
        >
            {/* Gauche : icône + texte */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Icône qui clignote */}
                <div
                    style={{
                        fontSize: 38,
                        animation: 'none',
                        opacity: frame ? 1 : 0.4,
                        transition: 'opacity 0.15s',
                        userSelect: 'none',
                    }}
                >
                    🚨
                </div>

                <div>
                    <div style={{
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: 18,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        lineHeight: 1.1,
                    }}>
                        {alarm.emoji} {alarm.label}
                    </div>

                    <div style={{
                        color: '#fca5a5',
                        fontSize: 12,
                        marginTop: 3,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                    }}>
                        {alarm.count === 1
                            ? `Reçue à ${alarm.lastAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : `${alarm.count} alertes — dernière à ${alarm.lastAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                        }
                    </div>
                </div>
            </div>

            {/* Droite : bouton STOP */}
            <button
                onClick={stop}
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 28px',
                    background: '#fff',
                    color: '#b91c1c',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: 16,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                    outline: 'none',
                    // Légère pulsation sur le bouton
                    transform: frame ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.15s, background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
                <span style={{ fontSize: 20 }}>⏹</span>
                ARRÊTER L'ALARME
            </button>
        </div>
    )
}
