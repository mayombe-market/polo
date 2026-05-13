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
    avatar_url?: string | null
    // Champs pâtisserie
    shop_schedule?: Record<string, unknown> | null
    cover_image?: string | null
    opening_hours_text?: string | null
    is_open?: boolean | null
    delivery_time?: string | null
    min_order?: number | null
    delivery_fee?: number | null
    latitude?: number | null
    longitude?: number | null
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

    const payload: Record<string, string | number | boolean | null | Record<string, unknown>> = {}

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
    if (fields.avatar_url !== undefined) {
        const v = (fields.avatar_url ?? '').trim()
        payload.avatar_url = v || null
    }
    if (fields.shop_schedule !== undefined) {
        // Stocker l'objet JSON directement (Supabase jsonb)
        payload.shop_schedule = fields.shop_schedule ?? null
    }
    if (fields.latitude !== undefined) {
        payload.latitude = fields.latitude ?? null
    }
    if (fields.longitude !== undefined) {
        payload.longitude = fields.longitude ?? null
    }
    if (fields.cover_image !== undefined) {
        const v = (fields.cover_image ?? '').trim()
        payload.cover_image = v || null
    }
    if (fields.opening_hours_text !== undefined) {
        const v = (fields.opening_hours_text ?? '').trim()
        payload.opening_hours_text = v || null
    }
    if (fields.is_open !== undefined) {
        payload.is_open = fields.is_open ?? true
    }
    if (fields.delivery_time !== undefined) {
        const v = (fields.delivery_time ?? '').trim()
        payload.delivery_time = v || '30-60 min'
    }
    if (fields.min_order !== undefined) {
        payload.min_order = fields.min_order ?? 0
    }
    if (fields.delivery_fee !== undefined) {
        payload.delivery_fee = fields.delivery_fee ?? 0
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
