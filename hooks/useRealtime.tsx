'use client'

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

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
    const channelRef = useRef<any>(null)

    const dispatch = useCallback((event: RealtimeEvent, payload: any) => {
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

    // Créer/détruire le canal quand user ou role change
    useEffect(() => {
        if (!user?.id || !profile?.role || !supabase) return

        const role = profile.role
        const userId = user.id
        const channelName = `rt-${role}-${userId}`

        // Créer le handler générique
        const handleEvent = (payload: any) => {
            const event = toRealtimeEvent(payload.table, payload.eventType)
            if (event) dispatch(event, payload)
        }

        // Configurer le canal selon le rôle
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

        channel.subscribe()
        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
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
    }, [context, event]) // eslint-disable-line react-hooks/exhaustive-deps
}
