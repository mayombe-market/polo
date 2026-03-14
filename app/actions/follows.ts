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

export async function toggleFollow(sellerId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Non authentifié')
    if (user.id === sellerId) throw new Error('Vous ne pouvez pas vous suivre vous-même')

    // Vérifier si déjà suivi
    const { data: existing } = await supabase
        .from('seller_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('seller_id', sellerId)
        .maybeSingle()

    if (existing) {
        // Unfollow
        await supabase
            .from('seller_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('seller_id', sellerId)
    } else {
        // Follow
        await supabase
            .from('seller_follows')
            .insert([{ follower_id: user.id, seller_id: sellerId }])
    }

    // Recalculer le compteur côté serveur (sécurisé)
    const { count } = await supabase
        .from('seller_follows')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)

    await supabase
        .from('profiles')
        .update({ followers_count: count ?? 0 })
        .eq('id', sellerId)

    return { isFollowing: !existing, count: count ?? 0 }
}
