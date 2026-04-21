'use server'

import { createClient } from '@supabase/supabase-js'
import { sendHotelReviewRequestEmail } from './emails'

// Service-role client pour bypass RLS sur hotel_review_requests
function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// ─────────────────────────────────────────────────────────
// requestHotelReview
// Appelé par le dashboard hôtelier.
// Crée un token et envoie l'email au client.
// ─────────────────────────────────────────────────────────
export async function requestHotelReview({
    hotelId,
    productId,
    productName,
    hotelName,
    guestEmail,
    guestName,
}: {
    hotelId: string
    productId: string
    productName: string
    hotelName: string
    guestEmail: string
    guestName?: string
}) {
    const supabase = getServiceClient()

    // Insérer la demande → le token UUID est généré par Postgres
    const { data, error } = await supabase
        .from('hotel_review_requests')
        .insert({
            hotel_id: hotelId,
            product_id: productId,
            guest_email: guestEmail,
            guest_name: guestName || null,
        })
        .select('token')
        .single()

    if (error || !data?.token) {
        console.error('[requestHotelReview] insert error:', error)
        return { error: 'Impossible de créer la demande' }
    }

    const token = data.token as string
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/${token}`

    // Envoyer l'email au client
    const emailResult = await sendHotelReviewRequestEmail({
        guestEmail,
        guestName: guestName || 'Cher client',
        hotelName,
        productName,
        reviewUrl,
    })

    if ('error' in emailResult) {
        // L'email a échoué mais le token est créé — on signale sans bloquer
        console.error('[requestHotelReview] email error:', emailResult.error)
        return { success: true, token, emailWarning: true }
    }

    return { success: true, token }
}

// ─────────────────────────────────────────────────────────
// getReviewRequest
// Récupère la demande par token (page guest).
// ─────────────────────────────────────────────────────────
export async function getReviewRequest(token: string) {
    const supabase = getServiceClient()

    const { data, error } = await supabase
        .from('hotel_review_requests')
        .select(`
            id,
            token,
            status,
            expires_at,
            guest_name,
            guest_email,
            product_id,
            hotel_id,
            products:product_id (
                id,
                name,
                img,
                seller_id
            ),
            profiles:hotel_id (
                id,
                shop_name,
                avatar_url
            )
        `)
        .eq('token', token)
        .single()

    if (error || !data) return { error: 'Demande introuvable' }

    // Vérifier expiration
    if (data.status === 'completed') return { error: 'Avis déjà soumis', completed: true }
    if (data.status === 'expired') return { error: 'Ce lien a expiré', expired: true }
    if (new Date(data.expires_at) < new Date()) {
        // Marquer comme expiré
        await supabase
            .from('hotel_review_requests')
            .update({ status: 'expired' })
            .eq('token', token)
        return { error: 'Ce lien a expiré', expired: true }
    }

    return { data }
}

// ─────────────────────────────────────────────────────────
// submitHotelReview
// Soumission depuis la page guest (pas de user connecté).
// ─────────────────────────────────────────────────────────
export async function submitHotelReview({
    token,
    rating,
    comment,
    imageUrls,
}: {
    token: string
    rating: number
    comment: string
    imageUrls?: string[]
}) {
    const supabase = getServiceClient()

    // Récupérer la demande
    const { data: req, error: reqErr } = await supabase
        .from('hotel_review_requests')
        .select('id, status, expires_at, product_id, guest_name, guest_email, hotel_id')
        .eq('token', token)
        .single()

    if (reqErr || !req) return { error: 'Demande introuvable' }
    if (req.status !== 'pending') return { error: 'Ce lien a déjà été utilisé ou a expiré' }
    if (new Date(req.expires_at) < new Date()) return { error: 'Ce lien a expiré' }

    // Insérer l'avis dans la table reviews existante
    const reviewData: Record<string, unknown> = {
        product_id: req.product_id,
        user_id: req.hotel_id, // attribué à l'hôtel (faute de user guest)
        rating,
        content: comment,
        user_name: req.guest_name || req.guest_email.split('@')[0],
        user_avatar: '',
        is_hotel_guest_review: true, // colonne optionnelle pour distinguer
    }

    if (imageUrls && imageUrls.length > 0) {
        reviewData.images = imageUrls
    }

    const { error: reviewErr } = await supabase
        .from('reviews')
        .insert(reviewData)

    if (reviewErr) {
        // Si la colonne is_hotel_guest_review n'existe pas encore, retry sans
        if (reviewErr.message?.includes('is_hotel_guest_review')) {
            delete reviewData.is_hotel_guest_review
            const { error: retryErr } = await supabase.from('reviews').insert(reviewData)
            if (retryErr) {
                console.error('[submitHotelReview] retry error:', retryErr)
                return { error: 'Erreur lors de la publication de l\'avis' }
            }
        } else {
            console.error('[submitHotelReview] review error:', reviewErr)
            return { error: 'Erreur lors de la publication de l\'avis' }
        }
    }

    // Marquer le token comme utilisé
    await supabase
        .from('hotel_review_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('token', token)

    return { success: true }
}

// ─────────────────────────────────────────────────────────
// addHotelReply
// L'hôtelier répond à un avis client depuis son dashboard.
// ─────────────────────────────────────────────────────────
export async function addHotelReply({
    reviewId,
    hotelId,
    reply,
}: {
    reviewId: string
    hotelId: string
    reply: string
}) {
    const supabase = getServiceClient()

    // Vérifier que l'avis appartient bien à un produit de cet hôtel
    const { data: review, error: findErr } = await supabase
        .from('reviews')
        .select('id, product_id, products:product_id(seller_id)')
        .eq('id', reviewId)
        .single()

    if (findErr || !review) return { error: 'Avis introuvable' }

    const sellerId = (review.products as any)?.seller_id
    if (sellerId !== hotelId) return { error: 'Non autorisé' }

    const { error: updateErr } = await supabase
        .from('reviews')
        .update({
            hotel_reply: reply.trim(),
            hotel_reply_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

    if (updateErr) {
        console.error('[addHotelReply] error:', updateErr)
        return { error: 'Impossible d\'enregistrer la réponse' }
    }

    return { success: true }
}

// ─────────────────────────────────────────────────────────
// getHotelProductReviews
// Avis sur les chambres de l'hôtel + réponses hôtelier.
// Passe par products pour trouver ceux qui appartiennent à l'hôtel.
// ─────────────────────────────────────────────────────────
export async function getHotelProductReviews(hotelId: string) {
    const supabase = getServiceClient()

    // 1. Récupérer les IDs des chambres de l'hôtel
    const { data: prods, error: prodsErr } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', hotelId)

    if (prodsErr || !prods?.length) return { data: [] }

    const productIds = prods.map(p => p.id)

    // 2. Récupérer les avis sur ces chambres
    const { data, error } = await supabase
        .from('reviews')
        .select(`
            id, rating, content, user_name, created_at,
            hotel_reply, hotel_reply_at,
            products:product_id (id, name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) return { error: error.message }
    return { data: data || [] }
}

// ─────────────────────────────────────────────────────────
// getHotelReviewRequests
// Liste des demandes d'un hôtel dans le dashboard.
// ─────────────────────────────────────────────────────────
export async function getHotelReviewRequests(hotelId: string) {
    const supabase = getServiceClient()

    const { data, error } = await supabase
        .from('hotel_review_requests')
        .select(`
            id, token, status, guest_name, guest_email, created_at, completed_at,
            products:product_id (id, name)
        `)
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) return { error: error.message }
    return { data: data || [] }
}
