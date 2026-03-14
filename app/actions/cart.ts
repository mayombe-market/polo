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

interface CartItemPayload {
    product_id: string
    name: string
    price: number
    quantity: number
    img: string
    seller_id: string | null
    selected_size: string | null
    selected_color: string | null
}

/** Synchronise le panier complet — remplace tout le panier de l'utilisateur connecté */
export async function syncCart(items: CartItemPayload[]) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Non authentifié')

    // Supprimer l'ancien panier de cet utilisateur uniquement
    await supabase.from('cart').delete().eq('user_id', user.id)

    if (items.length > 0) {
        // Limiter à 50 articles max pour éviter les abus
        const limitedItems = items.slice(0, 50)

        const cartData = limitedItems.map(item => ({
            user_id: user.id,
            product_id: item.product_id,
            name: (item.name || '').slice(0, 255),
            price: Math.max(0, item.price),
            quantity: Math.max(1, Math.min(99, item.quantity)),
            img: item.img || '',
            seller_id: item.seller_id || null,
            selected_size: item.selected_size || null,
            selected_color: item.selected_color || null,
        }))

        const { error } = await supabase.from('cart').insert(cartData)
        if (error) throw new Error(error.message)
    }

    return { success: true }
}

/** Charge le panier de l'utilisateur connecté */
export async function loadCart() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { items: [], userId: null }

    const { data, error } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    return { items: data || [], userId: user.id }
}
