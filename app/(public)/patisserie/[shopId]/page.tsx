import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ShopClient from './ShopClient'

export const revalidate = 60

// ─── Metadata dynamique ───────────────────────────────────────────────────────

export async function generateMetadata(
    { params }: { params: { shopId: string } }
): Promise<Metadata> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
        .from('profiles')
        .select('shop_name, store_name, city')
        .eq('id', params.shopId)
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
    params: { shopId: string }
}) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Profil vendeur
    const { data: seller } = await supabase
        .from('profiles')
        .select(
            'id, shop_name, store_name, avatar_url, city, verification_status, phone, whatsapp_number, cover_image, delivery_time, min_order, delivery_fee, opening_hours_text, is_open'
        )
        .eq('id', params.shopId)
        .eq('role', 'vendor')
        .single()

    if (!seller) notFound()

    // Produits pâtisserie du vendeur (triés par popularité)
    const { data: products } = await supabase
        .from('products')
        .select(
            'id, name, price, img, images_gallery, category, seller_id, created_at, views_count, stock_quantity, promo_percentage, promo_start_date, promo_end_date, description, subcategory'
        )
        .eq('seller_id', params.shopId)
        .eq('category', 'Pâtisserie & Traiteur')
        .order('views_count', { ascending: false })

    // Note moyenne via RPC (même logique que getSellerData)
    let averageRating = 0
    let reviewCount = 0
    try {
        const { data: reviews } = await supabase.rpc('get_seller_reviews', {
            p_seller_id: params.shopId,
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
        ...seller,
        cover_image: seller.cover_image || null,
        delivery_time: seller.delivery_time || '30-60 min',
        min_order: seller.min_order || 0,
        delivery_fee: seller.delivery_fee ?? 0,
        opening_hours_text: seller.opening_hours_text || null,
        is_open: seller.is_open !== false,
    }

    return (
        <ShopClient
            seller={shopSeller}
            products={(products || []) as ShopProduct[]}
            averageRating={averageRating}
            reviewCount={reviewCount}
        />
    )
}
