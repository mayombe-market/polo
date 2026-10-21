import 'server-only'

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getWebPush() {
    const subject = process.env.VAPID_SUBJECT
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privKey = process.env.VAPID_PRIVATE_KEY
    if (!subject || !pubKey || !privKey) return null
    try {
        webpush.setVapidDetails(subject, pubKey, privKey)
        return webpush
    } catch {
        return null
    }
}

/**
 * Envoie une notification push (téléphone) à des utilisateurs. Module serveur uniquement :
 * il lit les abonnements avec service_role, il ne doit jamais être exposé comme action serveur.
 */
export async function sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    url = '/vendor/dashboard'
): Promise<void> {
    if (!userIds.length) return
    const wp = getWebPush()
    if (!wp) return

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', userIds)
    if (!subs?.length) return

    const payload = JSON.stringify({ title, body, url, icon: '/favicon.ico', badge: '/favicon.ico' })
    await Promise.allSettled(
        subs.map((row: { subscription: webpush.PushSubscription }) =>
            wp.sendNotification(row.subscription, payload).catch(() => {})
        )
    )
}
