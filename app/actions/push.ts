'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
