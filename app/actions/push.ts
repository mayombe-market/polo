'use server'

import webpush from 'web-push'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// setVapidDetails en lazy — ne plante pas si les clés sont absentes (prod sans config)
function getWebPush() {
    const subject = process.env.VAPID_SUBJECT
    const pubKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privKey = process.env.VAPID_PRIVATE_KEY
    if (!subject || !pubKey || !privKey) return null
    try {
        webpush.setVapidDetails(subject, pubKey, privKey)
        return webpush
    } catch {
        return null
    }
}

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )
}

/** Enregistre l'abonnement push du vendeur connecté */
export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<{ success: true } | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const endpoint = subscription.endpoint
    if (!endpoint) return { error: 'Abonnement invalide' }

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ user_id: user.id, endpoint, subscription }, { onConflict: 'endpoint' })

    if (error) return { error: error.message }
    return { success: true }
}

/** Envoie une notification push à une liste d'utilisateurs (par user_id) */
export async function sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    url = '/vendor/dashboard'
): Promise<void> {
    if (!userIds.length) return

    const wp = getWebPush()
    if (!wp) return  // clés VAPID non configurées → on skip silencieusement

    const supabase = await getSupabase()
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', userIds)

    if (!subs?.length) return

    const payload = JSON.stringify({ title, body, url, icon: '/favicon.ico', badge: '/favicon.ico' })

    await Promise.allSettled(
        subs.map((row: { subscription: webpush.PushSubscription }) =>
            wp.sendNotification(row.subscription, payload)
                .catch(() => { /* subscription expirée ou invalide */ })
        )
    )
}
