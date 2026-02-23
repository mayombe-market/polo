'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendNegotiationResponseEmail } from '@/app/actions/emails'

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

// Envoyer une offre de négociation
export async function sendNegotiationOffer(input: {
    productId: string
    sellerId: string
    initialPrice: number
    proposedPrice: number
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }
    if (user.id === input.sellerId) return { error: 'Vous ne pouvez pas négocier votre propre produit.' }

    if (input.proposedPrice < 100) return { error: 'Le prix proposé doit être d\'au moins 100 FCFA.' }
    if (input.proposedPrice >= input.initialPrice) return { error: 'Votre offre doit être inférieure au prix actuel.' }

    // Vérifier qu'il n'y a pas déjà une offre en attente
    const { data: existing } = await supabase
        .from('negotiations')
        .select('id')
        .eq('product_id', input.productId)
        .eq('buyer_id', user.id)
        .eq('status', 'en_attente')
        .maybeSingle()

    if (existing) return { error: 'Vous avez déjà une offre en attente pour ce produit.' }

    // Récupérer le nom de l'acheteur
    const { data: buyer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    // Insérer la négociation (avec email acheteur pour notification ultérieure)
    const { data: negotiation, error } = await supabase
        .from('negotiations')
        .insert([{
            product_id: input.productId,
            seller_id: input.sellerId,
            buyer_id: user.id,
            initial_price: input.initialPrice,
            proposed_price: input.proposedPrice,
            status: 'en_attente',
            buyer_email: user.email || null,
            buyer_name: buyer?.full_name || user.email || 'Client',
        }])
        .select()
        .single()

    if (error) return { error: error.message }

    // Note: le vendeur est notifié en temps réel via Supabase Realtime dans son dashboard
    // (son + toast + notification push navigateur)

    return { success: true, negotiationId: negotiation?.id }
}

// Répondre à une négociation (vendeur)
export async function respondToNegotiation(input: {
    negotiationId: string
    response: 'accepte' | 'refuse'
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier que c'est bien le vendeur de cette négociation
    const { data: negotiation } = await supabase
        .from('negotiations')
        .select('seller_id, buyer_id, proposed_price, product_id, buyer_email, buyer_name')
        .eq('id', input.negotiationId)
        .single()

    if (!negotiation) return { error: 'Négociation introuvable' }
    if (negotiation.seller_id !== user.id) return { error: 'Non autorisé' }

    // Mettre à jour le statut
    const { error } = await supabase
        .from('negotiations')
        .update({ status: input.response })
        .eq('id', input.negotiationId)

    if (error) return { error: error.message }

    // Envoyer un email à l'acheteur
    if (negotiation.buyer_email) {
        const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', negotiation.product_id)
            .single()

        const buyerName = negotiation.buyer_name || 'Client'
        const productName = product?.name || 'Produit'

        sendNegotiationResponseEmail(
            negotiation.buyer_email,
            buyerName,
            productName,
            negotiation.proposed_price,
            input.response === 'accepte'
        ).catch(() => {})
    }

    return { success: true }
}

// Récupérer le prix négocié accepté pour un produit (utilisateur connecté)
export async function getAcceptedNegotiation(productId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { negotiation: null }

    const { data } = await supabase
        .from('negotiations')
        .select('id, proposed_price, status')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .eq('status', 'accepte')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return { negotiation: data }
}

// Récupérer les négociations du vendeur connecté
export async function getSellerNegotiations() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { negotiations: [] }

    const { data } = await supabase
        .from('negotiations')
        .select('*, products(name, img, image_url)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

    return { negotiations: JSON.parse(JSON.stringify(data || [])) }
}

// Récupérer les négociations de l'acheteur connecté
export async function getBuyerNegotiations() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { negotiations: [] }

    const { data } = await supabase
        .from('negotiations')
        .select('*, products(name, img, image_url)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

    return { negotiations: JSON.parse(JSON.stringify(data || [])) }
}
