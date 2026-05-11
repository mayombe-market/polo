import { createClient } from '@supabase/supabase-js'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import PatisserieClient from './PatisserieClient'

export const revalidate = 60

export const metadata = {
    title: 'Pâtisserie & Boulangerie — Mayombe Market',
    description:
        'Commandez vos gâteaux, cupcakes, box sucrées et viennoiseries auprès des meilleures pâtisseries de Brazzaville et Pointe-Noire.',
}

// ─── Types partagés ───────────────────────────────────────────────────────────

export type PatisserieProduct = {
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

export type PatisserieSeller = {
    id: string
    shop_name: string | null
    store_name: string | null
    avatar_url: string | null
    city: string | null
    verification_status: string | null
    phone: string | null
    whatsapp_number: string | null
    cover_image: string | null
    delivery_time: string | null
    min_order: number | null
    delivery_fee: number | null
    opening_hours_text: string | null
    is_open: boolean
    products: PatisserieProduct[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatisseriePage() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const expiredIds = await getExpiredSellerIds(supabase)

    // Tous les produits pâtisserie (limite haute pour couvrir toutes les boutiques)
    const { data: products } = await excludeExpiredSellers(
        supabase
            .from('products')
            .select(
                'id, name, price, img, images_gallery, category, seller_id, created_at, views_count, stock_quantity, promo_percentage, promo_start_date, promo_end_date, description, subcategory'
            )
            .eq('category', 'Pâtisserie & Traiteur')
            .order('views_count', { ascending: false })
            .limit(120),
        expiredIds
    )

    // Vendeurs uniques
    const sellerIds = [
        ...new Set((products || []).map((p: any) => p.seller_id).filter(Boolean)),
    ]

    const { data: sellers } = sellerIds.length > 0
        ? await supabase
            .from('profiles')
            .select(
                'id, shop_name, store_name, avatar_url, city, verification_status, phone, whatsapp_number, cover_image, delivery_time, min_order, delivery_fee, opening_hours_text, is_open'
            )
            .in('id', sellerIds)
            .eq('role', 'vendor')
        : { data: [] }

    // Grouper les produits par vendeur
    const productsBySeller: Record<string, PatisserieProduct[]> = {}
    for (const p of products || []) {
        if (!p.seller_id) continue
        if (!productsBySeller[p.seller_id]) productsBySeller[p.seller_id] = []
        productsBySeller[p.seller_id].push(p as PatisserieProduct)
    }

    // Construire le tableau des boutiques
    const shops: PatisserieSeller[] = (sellers || [])
        .map((s: any) => ({
            ...s,
            cover_image: s.cover_image || null,
            delivery_time: s.delivery_time || '30-60 min',
            min_order: s.min_order || 0,
            delivery_fee: s.delivery_fee ?? 0,
            opening_hours_text: s.opening_hours_text || null,
            is_open: s.is_open !== false,
            products: productsBySeller[s.id] || [],
        }))
        .filter((s: PatisserieSeller) => s.products.length > 0)
        // Trier : plus de produits en premier
        .sort((a: PatisserieSeller, b: PatisserieSeller) => b.products.length - a.products.length)

    return <PatisserieClient shops={shops} />
}
