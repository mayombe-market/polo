'use server'

import { createServerClient } from '@supabase/ssr'

function svc() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
    )
}

export type BehaviorEventType =
    | 'add_to_cart'
    | 'checkout_started'
    | 'checkout_step_completed'
    | 'checkout_abandoned'
    | 'payment_method_selected'
    | 'payment_declaration_submitted'
    | 'order_created'
    | 'order_creation_failed'
    | 'vendor_signup_started'
    | 'vendor_signup_completed'
    | 'vendor_verification_submitted'
    | 'whatsapp_contact_clicked'
    | 'form_error'

export interface BehaviorEventParams {
    session_id: string
    event_type: BehaviorEventType
    user_id?: string | null
    user_type?: 'connected' | 'guest' | 'anonymous'
    shop_id?: string | null
    product_id?: string | null
    source?: string
    metadata?: Record<string, unknown>
}

/**
 * Enregistre un événement comportemental.
 * Silencieux si la table n'existe pas encore (avant migration).
 * Ne bloque jamais le parcours client.
 */
export async function trackBehaviorEvent(params: BehaviorEventParams): Promise<void> {
    try {
        const db = svc()
        await db.from('behavior_events').insert({
            session_id: params.session_id,
            event_type: params.event_type,
            user_id: params.user_id ?? null,
            user_type: params.user_type ?? 'anonymous',
            shop_id: params.shop_id ?? null,
            product_id: params.product_id ?? null,
            source: params.source ?? 'direct',
            metadata: params.metadata ?? null,
        })
    } catch {
        // Silencieux — la table peut ne pas exister encore (migration en attente)
    }
}

// ─── Types pour le dashboard admin ───────────────────────────────────────────

export interface BehaviorAnalytics {
    funnelCounts: {
        add_to_cart: number
        checkout_started: number
        payment_declaration_submitted: number
        order_created: number
    }
    ordersFailedCount: number
    vendorSignupStarted: number
    vendorSignupCompleted: number
    vendorVerificationSubmitted: number
    whatsappClicks: number
    paymentMethodBreakdown: Array<{ method: string; count: number }>
    deviceBreakdown: Array<{ device: string; count: number }>
    userTypeBreakdown: Array<{ type: string; count: number }>
    topErrors: Array<{ message: string; count: number }>
    dailyFunnel: Array<{ date: string; add_to_cart: number; checkout_started: number; order_created: number }>
}

/**
 * Agrège les données de behavior_events pour le dashboard admin.
 * Retourne des zéros si la table n'existe pas encore.
 */
export async function adminGetBehaviorAnalytics(
    from: string | null
): Promise<BehaviorAnalytics> {
    const empty: BehaviorAnalytics = {
        funnelCounts: { add_to_cart: 0, checkout_started: 0, payment_declaration_submitted: 0, order_created: 0 },
        ordersFailedCount: 0,
        vendorSignupStarted: 0,
        vendorSignupCompleted: 0,
        vendorVerificationSubmitted: 0,
        whatsappClicks: 0,
        paymentMethodBreakdown: [],
        deviceBreakdown: [],
        userTypeBreakdown: [],
        topErrors: [],
        dailyFunnel: [],
    }

    try {
        const db = svc()
        let q = db.from('behavior_events').select(
            'event_type, user_type, metadata, created_at'
        ).limit(100000)
        if (from) q = q.gte('created_at', from)
        const { data, error } = await q
        if (error || !data) return empty

        const funnelCounts = { add_to_cart: 0, checkout_started: 0, payment_declaration_submitted: 0, order_created: 0 }
        let ordersFailedCount = 0
        let vendorSignupStarted = 0
        let vendorSignupCompleted = 0
        let vendorVerificationSubmitted = 0
        let whatsappClicks = 0
        const paymentMethodMap: Record<string, number> = {}
        const deviceMap: Record<string, number> = {}
        const userTypeMap: Record<string, number> = {}
        const errorMap: Record<string, number> = {}
        const dailyFunnelMap: Record<string, { add_to_cart: number; checkout_started: number; order_created: number }> = {}

        for (const e of data) {
            const date = (e.created_at as string).slice(0, 10)
            if (!dailyFunnelMap[date]) dailyFunnelMap[date] = { add_to_cart: 0, checkout_started: 0, order_created: 0 }

            const ut = e.user_type || 'anonymous'
            userTypeMap[ut] = (userTypeMap[ut] || 0) + 1

            const meta = e.metadata as Record<string, unknown> | null

            if (meta?.device) {
                const d = String(meta.device)
                deviceMap[d] = (deviceMap[d] || 0) + 1
            }

            switch (e.event_type) {
                case 'add_to_cart':
                    funnelCounts.add_to_cart++
                    dailyFunnelMap[date].add_to_cart++
                    break
                case 'checkout_started':
                    funnelCounts.checkout_started++
                    dailyFunnelMap[date].checkout_started++
                    break
                case 'payment_declaration_submitted':
                    funnelCounts.payment_declaration_submitted++
                    if (meta?.payment_method) {
                        const pm = String(meta.payment_method)
                        paymentMethodMap[pm] = (paymentMethodMap[pm] || 0) + 1
                    }
                    break
                case 'order_created':
                    funnelCounts.order_created++
                    dailyFunnelMap[date].order_created++
                    break
                case 'order_creation_failed':
                    ordersFailedCount++
                    if (meta?.error) {
                        const err = String(meta.error).slice(0, 80)
                        errorMap[err] = (errorMap[err] || 0) + 1
                    }
                    break
                case 'payment_method_selected':
                    if (meta?.method) {
                        const pm = String(meta.method)
                        paymentMethodMap[pm] = (paymentMethodMap[pm] || 0) + 1
                    }
                    break
                case 'vendor_signup_started':
                    vendorSignupStarted++
                    break
                case 'vendor_signup_completed':
                    vendorSignupCompleted++
                    break
                case 'vendor_verification_submitted':
                    vendorVerificationSubmitted++
                    break
                case 'whatsapp_contact_clicked':
                    whatsappClicks++
                    break
                case 'form_error':
                    if (meta?.field) {
                        const err = `${String(meta.field)}: ${String(meta.message ?? '').slice(0, 60)}`
                        errorMap[err] = (errorMap[err] || 0) + 1
                    }
                    break
            }
        }

        return {
            funnelCounts,
            ordersFailedCount,
            vendorSignupStarted,
            vendorSignupCompleted,
            vendorVerificationSubmitted,
            whatsappClicks,
            paymentMethodBreakdown: Object.entries(paymentMethodMap)
                .sort((a, b) => b[1] - a[1])
                .map(([method, count]) => ({ method, count })),
            deviceBreakdown: Object.entries(deviceMap)
                .sort((a, b) => b[1] - a[1])
                .map(([device, count]) => ({ device, count })),
            userTypeBreakdown: Object.entries(userTypeMap)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => ({ type, count })),
            topErrors: Object.entries(errorMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([message, count]) => ({ message, count })),
            dailyFunnel: Object.entries(dailyFunnelMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, v]) => ({ date, ...v })),
        }
    } catch {
        return empty
    }
}
