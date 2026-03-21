'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function requireAuth() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    return user
}

export async function revalidateProducts() {
    await requireAuth()
    revalidatePath('/')
    revalidatePath('/category/[id]', 'page')
    revalidatePath('/sub_category/[id]', 'page')
}

export async function revalidateHome() {
    await requireAuth()
    revalidatePath('/')
}

/**
 * Après suppression (ou retrait) d’un produit : invalide l’accueil, catégories,
 * fiche produit et boutique vendeur pour que le catalogue public soit à jour tout de suite.
 * Pas d’auth ici : appelée uniquement depuis des server actions déjà sécurisées (ex. deleteProduct).
 */
export function revalidateProductCatalog(productId: string, sellerId: string | null | undefined) {
    revalidatePath('/')
    revalidatePath('/category/[id]', 'page')
    revalidatePath('/sub_category/[id]', 'page')
    revalidatePath(`/product/${productId}`)
    if (sellerId) {
        revalidatePath(`/seller/${sellerId}`)
    }
}
