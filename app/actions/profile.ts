'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { normalizeShopDescription } from '@/lib/shopDescription'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        /* ignore set in Server Components edge cases */
                    }
                },
            },
        }
    )
}

export type UpdateProfileInput = {
    store_name?: string | null
    shop_description?: string | null
    bio?: string | null
    phone?: string | null
    city?: string | null
    return_policy?: string | null
    shipping_info?: string | null
    cover_url?: string | null
}

/**
 * Met à jour le profil de l’utilisateur connecté (RLS : ligne id = auth.uid()).
 * Inclut shop_description (slogan ≤ 75 car. via normalizeShopDescription).
 */
export async function updateProfile(
    fields: UpdateProfileInput
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await getSupabase()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non connecté' }
    }

    const payload: Record<string, string | null> = {}

    if (fields.store_name !== undefined) {
        payload.store_name = (fields.store_name ?? '').trim()
    }
    if (fields.shop_description !== undefined) {
        payload.shop_description = normalizeShopDescription(
            typeof fields.shop_description === 'string' ? fields.shop_description : ''
        )
    }
    if (fields.bio !== undefined) {
        const v = (fields.bio ?? '').trim()
        payload.bio = v || null
    }
    if (fields.phone !== undefined) {
        payload.phone = (fields.phone ?? '').trim()
    }
    if (fields.city !== undefined) {
        payload.city = (fields.city ?? '').trim()
    }
    if (fields.return_policy !== undefined) {
        payload.return_policy = (fields.return_policy ?? '').trim()
    }
    if (fields.shipping_info !== undefined) {
        payload.shipping_info = (fields.shipping_info ?? '').trim()
    }
    if (fields.cover_url !== undefined) {
        const v = (fields.cover_url ?? '').trim()
        payload.cover_url = v || null
    }

    if (Object.keys(payload).length === 0) {
        return { success: false, error: 'Aucune donnée à enregistrer' }
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/seller/${user.id}`)
    revalidatePath('/vendor/dashboard')
    revalidatePath('/vendor/profile')

    const { data: prodRows } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id)
        .limit(150)

    for (const row of prodRows ?? []) {
        if (row?.id) revalidatePath(`/product/${row.id}`)
    }

    return { success: true }
}

const MANDATORY_CITY_CODES = ['brazzaville', 'pointe-noire'] as const

/**
 * Mise à jour sécurisée de la ville uniquement (même client Supabase + RLS que updateProfile).
 * Utilisé par l’écran obligatoire /required-city.
 */
export async function saveMandatoryCity(
    city: string
): Promise<{ success: true } | { success: false; error: string }> {
    const normalized = (city ?? '').trim().toLowerCase()
    if (!MANDATORY_CITY_CODES.includes(normalized as (typeof MANDATORY_CITY_CODES)[number])) {
        return { success: false, error: 'Ville invalide' }
    }
    return updateProfile({ city: normalized })
}
