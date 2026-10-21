'use server'

import { createClient } from '@supabase/supabase-js'
import { FEATURES } from '@/lib/featureFlags'
import { digitsOnly } from '@/lib/phonePaymentValidation'
import { DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'
import { orderRequiresInterUrbanDelivery } from '@/lib/deliveryLocation'
import { randomUUID } from 'crypto'
import { after } from 'next/server'
import { notifyVendorsNewOrder } from '@/lib/orderNotifyServer'

function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export type GuestOrderInput = {
    customer_name: string
    phone: string
    city: string
    district: string
    landmark?: string
    payment_method: 'mobile_money' | 'airtel_money' | 'cash'
    delivery_mode: 'standard' | 'express' | 'inter_urban' | 'pickup' | 'vendor_delivery'
    delivery_fee: number
    transaction_id?: string
    items: Array<{
        id: string
        name: string
        price: number
        quantity: number
        img?: string
        seller_id: string
    }>
    vendor_payment_info?: Record<string, {
        method: string
        vendor_number: string | null
        holder_name: string | null
        transaction_id: string
        sender_phone: string
    }>
    idempotency_key?: string
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
    attribution_session_id?: string | null
}

export type GuestOrderResult =
    | { order: { id: string; guest_token: string; status: string; total_amount: number } }
    | { error: string; code?: string }

const VALID_DELIVERY_FEES: Record<string, number> = { standard: 1000, express: 2000 }

export async function createGuestOrder(input: GuestOrderInput): Promise<GuestOrderResult> {
    if (!FEATURES.guestCheckout) {
        return { error: 'Checkout invité non disponible.', code: 'feature_disabled' }
    }

    const supabase = getServiceSupabase()

    // ── Validation des entrées ──────────────────────────────────────────────
    const nameClean = input.customer_name?.trim()
    if (!nameClean || nameClean.length < 2 || nameClean.length > 100) {
        return { error: 'Nom complet requis (2–100 caractères).' }
    }

    const phoneDigits = digitsOnly(input.phone || '')
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
        return { error: 'Numéro de téléphone invalide.' }
    }

    if (!input.city?.trim() || input.city.length > 100) {
        return { error: 'Ville invalide.' }
    }
    if (!input.district?.trim() || input.district.length > 100) {
        return { error: 'Quartier invalide.' }
    }
    if (!input.items || input.items.length === 0 || input.items.length > 50) {
        return { error: 'Panier invalide.' }
    }

    for (const item of input.items) {
        const qty = Number(item.quantity)
        if (!Number.isInteger(qty) || qty < 1) {
            return { error: 'Quantité invalide dans le panier.' }
        }
    }

    const VALID_PAYMENT_METHODS = ['mobile_money', 'airtel_money', 'cash']
    if (!VALID_PAYMENT_METHODS.includes(input.payment_method)) {
        return { error: 'Méthode de paiement invalide.' }
    }

    // ── Rate-limit : max 5 commandes invitées par numéro dans les 24h ──────
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('is_guest', true)
        .gte('created_at', oneDayAgo)
        .filter('phone', 'like', `%${phoneDigits.slice(-8)}%`)
    if ((recentCount ?? 0) >= 5) {
        return { error: 'Trop de commandes récentes avec ce numéro. Réessayez dans 24h ou créez un compte.', code: 'rate_limited' }
    }

    // ── Idempotence : renvoyer commande existante si même clé + téléphone ──
    if (input.idempotency_key) {
        const { data: existing } = await supabase
            .from('orders')
            .select('id, guest_token, status, total_amount')
            .eq('idempotency_key', input.idempotency_key)
            .eq('is_guest', true)
            .maybeSingle()
        if (existing && existing.guest_token) {
            return { order: existing as { id: string; guest_token: string; status: string; total_amount: number } }
        }
    }

    // ── Vérification doublons transaction_id ──────────────────────────────
    const txDigits = input.transaction_id ? digitsOnly(input.transaction_id) : ''
    if (txDigits.length >= 6 && ['mobile_money', 'airtel_money'].includes(input.payment_method)) {
        const { data: dupTx } = await supabase
            .from('orders')
            .select('id')
            .eq('transaction_id', txDigits)
            .in('status', ['confirmed', 'delivered'])
            .maybeSingle()
        if (dupTx) {
            return { error: 'Ce code de transaction a déjà été validé sur une autre commande.' }
        }
    }

    // ── Validation serveur des prix ──────────────────────────────────────
    const productIds = [...new Set(input.items.map(i => i.id))]
    const { data: dbProducts, error: productsError } = await supabase
        .from('products')
        .select('id, price, seller_id, name, has_stock, stock_quantity')
        .in('id', productIds)

    if (productsError || !dbProducts || dbProducts.length !== productIds.length) {
        return { error: 'Certains produits sont introuvables. Rafraîchissez la page.' }
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]))
    const validatedItems = input.items.map(item => {
        const dbProduct = productMap.get(item.id)!
        return { ...item, price: dbProduct.price, seller_id: dbProduct.seller_id, name: dbProduct.name }
    })

    const itemsTotal = validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const sellerIds = [...new Set(validatedItems.map(i => i.seller_id).filter(Boolean))]

    // ── COD : vérifier que tous les vendeurs l'acceptent ─────────────────
    if (input.payment_method === 'cash') {
        const { data: vendorCodProfiles } = await supabase
            .from('profiles')
            .select('id, accept_cod')
            .in('id', sellerIds)
        const vendorRefusing = (vendorCodProfiles || []).find(p => p.accept_cod === false)
        if (vendorRefusing) {
            return { error: "Un ou plusieurs vendeurs n'acceptent pas le paiement à la livraison." }
        }
    }

    // ── Calcul livraison côté serveur ────────────────────────────────────
    const { data: sellerProfiles } = await supabase
        .from('profiles')
        .select('id, subscription_plan, city, vendor_delivery_fee')
        .in('id', sellerIds)

    const sellerCityList = sellerIds.map(sid => sellerProfiles?.find(p => p.id === sid)?.city ?? null)
    const interUrban = orderRequiresInterUrbanDelivery(input.city, sellerCityList)

    const modeInput = (input.delivery_mode || 'standard').trim()
    let deliveryMode: string
    let deliveryFee: number

    if (modeInput === 'pickup') {
        deliveryMode = 'pickup'; deliveryFee = 0
        if (input.delivery_fee !== 0) return { error: 'Retrait en boutique : frais = 0.' }
    } else if (modeInput === 'vendor_delivery') {
        const totalVendorFee = (sellerProfiles || []).reduce((s, p) => s + (p.vendor_delivery_fee || 0), 0)
        deliveryMode = 'vendor_delivery'; deliveryFee = totalVendorFee
        if (input.delivery_fee !== totalVendorFee) return { error: 'Frais de livraison vendeur invalides.' }
    } else if (interUrban) {
        deliveryMode = 'inter_urban'; deliveryFee = DELIVERY_FEE_INTER_URBAN
        if (modeInput !== 'inter_urban' || input.delivery_fee !== DELIVERY_FEE_INTER_URBAN) {
            return { error: 'Frais inter-ville invalides (forfait 3 500 F).' }
        }
    } else {
        deliveryMode = modeInput === 'express' ? 'express' : 'standard'
        deliveryFee = VALID_DELIVERY_FEES[deliveryMode]
        if (input.delivery_fee !== deliveryFee) return { error: 'Frais de livraison invalides.' }
    }

    const serverTotal = itemsTotal + deliveryFee

    // ── Vérification stock ──────────────────────────────────────────────
    for (const item of validatedItems) {
        const dbProduct = productMap.get(item.id)!
        if (dbProduct.has_stock && dbProduct.stock_quantity < item.quantity) {
            return { error: `Stock insuffisant pour "${dbProduct.name}". Disponible : ${dbProduct.stock_quantity}` }
        }
    }

    // ── vendor_payments JSONB ───────────────────────────────────────────
    const vendorPaymentsMap: Record<string, object> = {}
    if (input.vendor_payment_info && Object.keys(input.vendor_payment_info).length > 0) {
        for (const sid of sellerIds) {
            const vpi = input.vendor_payment_info[sid]
            if (!vpi) continue
            const vendorItemsTotal = validatedItems
                .filter(i => i.seller_id === sid)
                .reduce((s, i) => s + i.price * i.quantity, 0)
            vendorPaymentsMap[sid] = {
                amount: vendorItemsTotal,
                method: vpi.method,
                vendor_number: vpi.vendor_number || null,
                holder_name: vpi.holder_name || null,
                transaction_id: digitsOnly(vpi.transaction_id || ''),
                sender_phone: digitsOnly(vpi.sender_phone || ''),
                vendor_confirmed: false,
                vendor_confirmed_at: null,
                disputed: false,
            }
        }
    }

    // ── Token invité unique ─────────────────────────────────────────────
    const guestToken = randomUUID()

    // ── Insertion ──────────────────────────────────────────────────────
    const { data: order, error: insertError } = await supabase.from('orders').insert([{
        user_id: null,
        is_guest: true,
        guest_token: guestToken,
        customer_name: nameClean,
        customer_email: null,
        phone: phoneDigits,
        city: input.city.trim(),
        district: input.district.trim(),
        landmark: input.landmark?.trim() || null,
        status: 'pending',
        total_amount: serverTotal,
        payment_method: input.payment_method,
        items: validatedItems,
        commission_rate: 0,
        commission_amount: 0,
        vendor_payout: itemsTotal,
        payout_status: 'pending',
        payment_status: input.payment_method === 'cash' ? 'unpaid' : 'paid',
        transaction_id: ['mobile_money', 'airtel_money'].includes(input.payment_method) ? txDigits || null : null,
        vendor_payments: Object.keys(vendorPaymentsMap).length > 0 ? vendorPaymentsMap : {},
        delivery_mode: deliveryMode,
        delivery_fee: deliveryFee,
        idempotency_key: input.idempotency_key ?? null,
        utm_source: input.utm_source ?? null,
        utm_medium: input.utm_medium ?? null,
        utm_campaign: input.utm_campaign ?? null,
        attribution_session_id: input.attribution_session_id ?? null,
    }]).select('id, guest_token, status, total_amount').single()

    if (insertError || !order) {
        return { error: insertError?.message || 'Impossible de créer la commande. Réessayez.' }
    }

    // ── Décrémentation atomique du stock — APRÈS insertion de la commande ──
    // Si le stock échoue, on supprime la commande pour ne pas laisser de fantôme.
    for (const item of validatedItems) {
        const dbProduct = productMap.get(item.id)!
        if (dbProduct.has_stock) {
            const { data: success, error: rpcError } = await supabase.rpc('decrement_stock', {
                p_product_id: item.id,
                p_quantity: item.quantity,
            })
            if (rpcError || !success) {
                await supabase.from('orders').delete().eq('id', order.id)
                return { error: `Stock insuffisant pour "${dbProduct.name}". Un autre acheteur a été plus rapide.` }
            }
        }
    }

    const createdOrderId = order.id as string
    after(() => notifyVendorsNewOrder(createdOrderId).catch(err => console.error('[createGuestOrder] notifications vendeurs:', err)))

    return { order: { id: order.id, guest_token: order.guest_token!, status: order.status, total_amount: order.total_amount } }
}

// ── Récupérer une commande invitée par token (page de suivi) ───────────────
export async function getGuestOrder(token: string) {
    if (!token || token.length < 10) return { error: 'Token invalide.' }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase.rpc('get_order_by_guest_token', { p_token: token })

    if (error) return { error: 'Commande introuvable.' }
    if (!data || (Array.isArray(data) && data.length === 0)) return { error: 'Commande introuvable.' }

    return { order: Array.isArray(data) ? data[0] : data }
}

// ── Lier les commandes invitées à un compte après inscription ──────────────
export async function claimGuestOrdersByPhone(userId: string, phone: string) {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.rpc('claim_guest_orders_by_phone', {
        p_user_id: userId,
        p_phone: digitsOnly(phone),
    })
    if (error) return { error: error.message, claimed: 0 }
    return { claimed: (data as number) || 0 }
}
