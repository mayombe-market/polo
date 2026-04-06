'use client'

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, ReactNode, type DependencyList } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { playNotificationAlertSound, unlockNotificationAudio } from '@/lib/notificationSound'

// ═══ Types d'événements real-time ═══
export type RealtimeEvent =
    | 'order:insert'
    | 'order:update'
    | 'negotiation:insert'
    | 'negotiation:update'
    | 'message:insert'
    | 'notification:insert'
    | 'verification:insert'
    | 'verification:update'

type RealtimeCallback = (payload: any) => void
type SubscriberMap = Map<RealtimeEvent, Set<RealtimeCallback>>

interface RealtimeContextType {
    subscribe: (event: RealtimeEvent, cb: RealtimeCallback) => () => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

// ═══ Mapping table+eventType → RealtimeEvent ═══
function toRealtimeEvent(table: string, eventType: string): RealtimeEvent | null {
    const key = `${table}:${eventType}` as const
    const map: Record<string, RealtimeEvent> = {
        'orders:INSERT': 'order:insert',
        'orders:UPDATE': 'order:update',
        'negotiations:INSERT': 'negotiation:insert',
        'negotiations:UPDATE': 'negotiation:update',
        'messages:INSERT': 'message:insert',
        'notifications:INSERT': 'notification:insert',
        'vendor_verifications:INSERT': 'verification:insert',
        'vendor_verifications:UPDATE': 'verification:update',
    }
    return map[key] || null
}

// ═══ Provider ═══
export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { user, profile, supabase } = useAuth()
    const subscribersRef = useRef<SubscriberMap>(new Map())

    const dispatch = useCallback((event: RealtimeEvent, payload: any) => {
        if (event === 'notification:insert') {
            playNotificationAlertSound()
        }
        const subs = subscribersRef.current.get(event)
        if (subs) {
            subs.forEach(cb => {
                try { cb(payload) } catch (e) { console.error('Realtime callback error:', e) }
            })
        }
    }, [])

    const subscribe = useCallback((event: RealtimeEvent, cb: RealtimeCallback) => {
        if (!subscribersRef.current.has(event)) {
            subscribersRef.current.set(event, new Set())
        }
        subscribersRef.current.get(event)!.add(cb)

        // Return unsubscribe function
        return () => {
            subscribersRef.current.get(event)?.delete(cb)
        }
    }, [])

    // Premier clic / touch sur la page : débloque l’AudioContext pour les sonneries (Chrome, Safari).
    useEffect(() => {
        if (!user?.id) return
        const unlock = () => {
            unlockNotificationAudio()
            window.removeEventListener('pointerdown', unlock)
        }
        window.addEventListener('pointerdown', unlock, { passive: true })
        return () => window.removeEventListener('pointerdown', unlock)
    }, [user?.id])

    useEffect(() => {
        if (!user?.id || !profile?.role || !supabase) return

        const role = profile.role
        const userId = user.id
        const channelName = `rt-${role}-${userId}`

        const handleEvent = (payload: any) => {
            const event = toRealtimeEvent(payload.table, payload.eventType)
            if (event) dispatch(event, payload)
        }

        const throttledWarn = (() => {
            let last = 0
            return (msg: string) => {
                const n = Date.now()
                if (n - last < 120_000) return
                last = n
                console.warn('[Realtime]', msg)
            }
        })()

        let cancelled = false
        let reconnectTimer: ReturnType<typeof setTimeout> | undefined
        let reconnectPending = false
        let attempt = 0
        let activeChannel: ReturnType<typeof supabase.channel> | null = null

        function buildChannel() {
            let channel = supabase.channel(channelName)

            if (role === 'vendor') {
                channel = channel
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, handleEvent)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'negotiations', filter: `seller_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'negotiations', filter: `seller_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleEvent)
            } else if (role === 'buyer' || role === 'client') {
                channel = channel
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'negotiations', filter: `buyer_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'negotiations', filter: `buyer_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleEvent)
            } else if (role === 'admin') {
                channel = channel
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, handleEvent)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendor_verifications' }, handleEvent)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendor_verifications' }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleEvent)
            } else if (role === 'logistician') {
                channel = channel
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `logistician_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `logistician_id=eq.${userId}` }, handleEvent)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleEvent)
            }

            return channel
        }

        function clearReconnectTimer() {
            if (reconnectTimer !== undefined) {
                clearTimeout(reconnectTimer)
                reconnectTimer = undefined
            }
        }

        function scheduleReconnect(reason: string) {
            if (cancelled || reconnectPending) return
            reconnectPending = true
            if (activeChannel) {
                try {
                    supabase.removeChannel(activeChannel)
                } catch {
                    /* noop */
                }
                activeChannel = null
            }
            const delay = Math.min(30_000, Math.round(1_500 * Math.pow(2, attempt)))
            attempt = Math.min(attempt + 1, 12)
            throttledWarn(`${reason} — reconnexion dans ~${Math.round(delay / 1000)}s`)
            reconnectTimer = setTimeout(() => {
                reconnectTimer = undefined
                reconnectPending = false
                connect()
            }, delay)
        }

        function connect() {
            if (cancelled) return
            const channel = buildChannel()
            activeChannel = channel

            channel.subscribe((status: string, err?: Error) => {
                if (cancelled) return
                if (status === 'SUBSCRIBED') {
                    attempt = 0
                    return
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    scheduleReconnect(err?.message ?? status)
                    return
                }
                if (status === 'CLOSED' && !reconnectPending) {
                    scheduleReconnect('Canal fermé')
                }
            })
        }

        connect()

        return () => {
            cancelled = true
            clearReconnectTimer()
            reconnectPending = false
            if (activeChannel) {
                supabase.removeChannel(activeChannel)
                activeChannel = null
            }
        }
    }, [user?.id, profile?.role, supabase, dispatch])

    const value = useMemo(() => ({ subscribe }), [subscribe])

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    )
}

// ═══ Hook pour s'abonner à un événement ═══
export function useRealtime(
    event: RealtimeEvent,
    callback: RealtimeCallback,
    deps?: DependencyList,
) {
    const context = useContext(RealtimeContext)
    const callbackRef = useRef(callback)

    // Garder le callback à jour sans re-subscribe
    callbackRef.current = callback

    useEffect(() => {
        if (!context) return

        const handler: RealtimeCallback = (payload) => callbackRef.current(payload)
        const unsubscribe = context.subscribe(event, handler)
        return unsubscribe
        // deps permet de ré-enregistrer le handler quand user / tab etc. changent
    }, [context, event, ...(deps ?? [])]) // eslint-disable-line react-hooks/exhaustive-deps
}
