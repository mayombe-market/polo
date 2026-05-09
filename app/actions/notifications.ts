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

// Client service_role — bypass RLS pour créer des notifications pour d'autres utilisateurs
function getServiceSupabase() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
    )
}

/** Crée une notification pour un utilisateur.
 *  Utilise le service_role pour bypasser la RLS —
 *  l'admin peut ainsi notifier les vendeurs sans restriction. */
export async function createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    link?: string
) {
    try {
        // Vérifier que l'appelant est bien connecté (sécurité minimale)
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Insert via service_role pour ne pas être bloqué par RLS
        const adminSupabase = getServiceSupabase()
        const { error } = await adminSupabase.from('notifications').insert({
            user_id: userId,
            type,
            title,
            body,
            link: link || null,
        })
        if (error) {
            console.error('[createNotification] insert error:', error.message, { userId, type })
        }
    } catch (e) {
        console.error('[createNotification] exception:', e)
    }
}

/** Récupère les notifications de l'utilisateur connecté */
export async function getNotifications(limit = 50) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { notifications: [], error: 'Non connecté' }

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) return { notifications: [], error: error.message }
    return { notifications: data || [] }
}

/** Marque une notification comme lue */
export async function markAsRead(notificationId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

/** Marque toutes les notifications comme lues */
export async function markAllAsRead() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    if (error) return { error: error.message }
    return { success: true }
}

/** Compte les notifications non lues */
export async function getUnreadNotifCount() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    return count || 0
}
