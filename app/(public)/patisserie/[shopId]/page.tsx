import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ShopClient from './ShopClient'

export const revalidate = 60

// ─── Metadata dynamique ───────────────────────────────────────────────────────

export async function generateMetadata(
    { params }: { params: Promise<{ shopId: string }> }
): Promise<Metadata> {
    const { shopId } = await params
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
        .from('profiles')
        .select('shop_name, store_name, city')
        .eq('id', shopId)
        .single()

    const name = data?.shop_name || data?.store_name || 'Pâtisserie'
    const city = data?.city ? ` · ${data.city}` : ''

    return {
        title: `${name}${city} — Mayombe Market`,
        description: `Découvrez les créations de ${name} : gâteaux, cupcakes, viennoiseries et pâtisseries sur commande.`,
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopProduct = {
    id: string
    name: string
    price: number
    img: string | null
    images_gallery?: string[] | null
    category: string
    seller_id: string | null
    created_at: string
    views_count: number
    stock_quantity?: number | null
    promo_percentage?: number | null
    promo_start_date?: string | null
    promo_end_date?: string | null
    description?: string | null
    subcategory?: string | null
}

export type ShopSeller = {
    id: string
    shop_name: string | null
    store_name: string | null
    avatar_url: string | null
    city: string | null
    verification_status: string | null
    phone: string | null
    whatsapp_number: string | null
    cover_image: string | null
    delivery_time: string
    min_order: number
    delivery_fee: number
    opening_hours_text: string | null
    is_open: boolean
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatisserieShopPage({
    params,
}: {
    params: Promise<{ shopId: string }>
}) {
    const { shopId } = await params
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // ── 1. Profil de base (colonnes toujours présentes) ──────────────────────
    const { data: baseProfile } = await supabase
        .from('profiles')
        .select('id, shop_name, store_name, avatar_url, city, verification_status, phone, whatsapp_number, role')
        .eq('id', shopId)
        .single()

    // Pas de profil du tout → 404
    if (!baseProfile) notFound()

    // ── 2. Nouvelles colonnes boutique (ajoutées par migration) ───────────────
    const { data: extraProfile } = await supabase
        .from('profiles')
        .select('cover_image, delivery_time, min_order, delivery_fee, opening_hours_text, is_open')
        .eq('id', shopId)
        .single()

    // ── 3. Produits pâtisserie du vendeur ────────────────────────────────────
    const { data: allProducts } = await supabase
        .from('products')
        .select(
            'id, name, price, img, images_gallery, category, seller_id, created_at, views_count, stock_quantity, promo_percentage, promo_start_date, promo_end_date, description, subcategory'
        )
        .eq('seller_id', shopId)
        .order('views_count', { ascending: false })

    // Garder seulement Pâtisserie & Traiteur (filtre côté JS pour éviter
    // tout problème d'encodage de la valeur dans l'URL Supabase)
    const products = (allProducts || []).filter(
        (p: any) => p.category === 'Pâtisserie & Traiteur'
    )

    // ── 4. Note moyenne via RPC ───────────────────────────────────────────────
    let averageRating = 0
    let reviewCount = 0
    try {
        const { data: reviews } = await supabase.rpc('get_seller_reviews', {
            p_seller_id: shopId,
        })
        if (reviews?.length) {
            reviewCount = reviews.length
            averageRating =
                Math.round(
                    (reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) /
                        reviewCount) *
                    10
                ) / 10
        }
    } catch {
        // Pas de note disponible — on continue sans
    }

    const shopSeller: ShopSeller = {
        id: baseProfile.id,
        shop_name: baseProfile.shop_name,
        store_name: baseProfile.store_name,
        avatar_url: baseProfile.avatar_url,
        city: baseProfile.city,
        verification_status: baseProfile.verification_status,
        phone: baseProfile.phone,
        whatsapp_number: baseProfile.whatsapp_number,
        cover_image: extraProfile?.cover_image || null,
        delivery_time: extraProfile?.delivery_time || '30-60 min',
        min_order: extraProfile?.min_order || 0,
        delivery_fee: extraProfile?.delivery_fee ?? 0,
        opening_hours_text: extraProfile?.opening_hours_text || null,
        is_open: extraProfile?.is_open !== false,
    }

    return (
        <ShopClient
            seller={shopSeller}
            products={products as ShopProduct[]}
            averageRating={averageRating}
            reviewCount={reviewCount}
        />
    )
}
