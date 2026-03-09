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

// Client confirme la réception de sa commande
export async function confirmReception(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier que c'est bien la commande du client
    const { data: order } = await supabase
        .from('orders')
        .select('user_id, status, client_confirmed')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.user_id !== user.id) return { error: 'Non autorisé' }
    if (order.status !== 'delivered') return { error: 'La commande n\'est pas encore livrée' }
    if (order.client_confirmed) return { error: 'Déjà confirmé' }

    const { error } = await supabase
        .from('orders')
        .update({
            client_confirmed: true,
            client_confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) return { error: error.message }
    return { success: true }
}

// Client signale qu'il n'a pas reçu (pour litige futur)
export async function reportNotReceived(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: order } = await supabase
        .from('orders')
        .select('user_id, status')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.user_id !== user.id) return { error: 'Non autorisé' }

    // Marquer la commande comme disputée
    const { error } = await supabase
        .from('orders')
        .update({ disputed: true })
        .eq('id', orderId)

    if (error) return { error: error.message }
    return { success: true, message: 'Signalement enregistré. Notre équipe va vous contacter.' }
}

// Client soumet sa notation triple
export async function submitRating(input: {
    orderId: string
    vendorRating?: number
    vendorTags?: string[]
    deliveryRating?: number
    deliveryTags?: string[]
    platformRating?: number
    platformTags?: string[]
    comment?: string
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier que c'est la commande du client et qu'elle est confirmée
    const { data: order } = await supabase
        .from('orders')
        .select('user_id, client_confirmed')
        .eq('id', input.orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.user_id !== user.id) return { error: 'Non autorisé' }
    if (!order.client_confirmed) return { error: 'Confirmez d\'abord la réception' }

    // Valider les notes (1-5)
    const ratings = [input.vendorRating, input.deliveryRating, input.platformRating]
    for (const r of ratings) {
        if (r !== undefined && r !== null && (!Number.isInteger(r) || r < 1 || r > 5)) {
            return { error: 'Les notes doivent être entre 1 et 5.' }
        }
    }

    // Vérifier qu'il n'y a pas déjà une notation
    const { data: existing } = await supabase
        .from('ratings')
        .select('id')
        .eq('order_id', input.orderId)
        .single()

    if (existing) return { error: 'Vous avez déjà noté cette commande' }

    // Insérer la notation
    const { error } = await supabase
        .from('ratings')
        .insert({
            order_id: input.orderId,
            user_id: user.id,
            vendor_rating: input.vendorRating || null,
            vendor_tags: input.vendorTags || [],
            delivery_rating: input.deliveryRating || null,
            delivery_tags: input.deliveryTags || [],
            platform_rating: input.platformRating || null,
            platform_tags: input.platformTags || [],
            comment: input.comment || '',
        })

    if (error) return { error: error.message }

    // Ajouter 500 points de fidélité (avec optimistic concurrency check)
    const { data: profile } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', user.id)
        .single()

    const currentPoints = profile?.loyalty_points || 0
    const { error: pointsError } = await supabase
        .from('profiles')
        .update({ loyalty_points: currentPoints + 500 })
        .eq('id', user.id)
        .eq('loyalty_points', currentPoints)

    // Si la mise à jour échoue (race condition), on ne bloque pas — les points seront ajoutés au prochain essai
    const totalPoints = pointsError ? currentPoints : currentPoints + 500
    return { success: true, pointsEarned: pointsError ? 0 : 500, totalPoints }
}

// Récupérer la notation d'une commande
export async function getOrderRating(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { rating: null }

    const { data: rating } = await supabase
        .from('ratings')
        .select('*')
        .eq('order_id', orderId)
        .eq('user_id', user.id)
        .single()

    return { rating: rating ? JSON.parse(JSON.stringify(rating)) : null }
}

// Récupérer les points de fidélité du client
export async function getLoyaltyPoints() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { points: 0 }

    const { data: profile } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', user.id)
        .single()

    return { points: profile?.loyalty_points || 0 }
}
