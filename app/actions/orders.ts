'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendOrderStatusEmail, sendSubscriptionConfirmationEmail, sendOrderRejectedVendorEmail } from '@/app/actions/emails'
import { revalidateProductCatalog } from '@/app/actions/revalidate'
import { createNotification } from '@/app/actions/notifications'
import { PLAN_PRICES } from '@/lib/planPrices'
import { computeNewEndDate, isSubscriptionExpiredPastGrace } from '@/lib/subscription'
import { digitsOnly, isExactly10Digits } from '@/lib/phonePaymentValidation'
import { DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'
import { orderRequiresInterUrbanDelivery, orderCityToProfileCity } from '@/lib/deliveryLocation'

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

// Récupérer les commandes d'un vendeur (filtrées côté serveur)
export async function getVendorOrders() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { orders: [], vendorId: null }

    // Vérifier que c'est bien un vendeur
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'vendor' && profile?.role !== 'admin') {
        return { orders: [], vendorId: null }
    }

    const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .neq('order_type', 'subscription')
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(200)

    // Filtrage côté SERVEUR — le client ne reçoit que ses commandes produit (pas les abonnements)
    const vendorOrders = (allOrders || []).filter(order =>
        order.status !== 'pending' &&
        order.order_type !== 'subscription' &&
        order.items?.some((item: any) => item.seller_id === user.id)
    )

    // Nettoyer les données sensibles : retirer les items des autres vendeurs
    const cleanOrders = vendorOrders.map(order => ({
        ...order,
        items: order.items?.filter((item: any) => item.seller_id === user.id) || [],
    }))

    return { orders: JSON.parse(JSON.stringify(cleanOrders)), vendorId: user.id }
}

// Mettre à jour le statut d'une commande (vendeur)
export async function updateOrderStatus(orderId: string, newStatus: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier que la commande contient des produits de ce vendeur
    const { data: order } = await supabase
        .from('orders')
        .select('items, user_id, delivery_mode')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }

    const hasVendorItems = order.items?.some((item: any) => item.seller_id === user.id)
    if (!hasVendorItems) return { error: 'Non autorisé' }

    // Valider le statut — le vendeur ne peut que confirmer et expédier
    // Le logisticien gère picked_up et delivered via deliveries.ts
    const validStatuses = ['confirmed', 'shipped']
    if (!validStatuses.includes(newStatus)) return { error: 'Statut invalide — utilisez le dashboard logisticien pour les livraisons' }

    const updateData: any = { status: newStatus }

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

    if (error) return { error: error.message }

    // Envoyer un email au client
    const { data: orderData } = await supabase
        .from('orders')
        .select('customer_name, customer_email, tracking_number, delivery_mode, items')
        .eq('id', orderId)
        .single()

    if (orderData?.customer_email) {
        const emailProductNames = (orderData.items || []).map((i: any) => i.name).join(', ')
        sendOrderStatusEmail(orderData.customer_email, orderData.customer_name, orderId, newStatus, orderData.tracking_number, orderData.delivery_mode, emailProductNames).catch(() => {})
    }

    // Notifier l'acheteur
    if (order.user_id && newStatus === 'shipped') {
        const productNames = (order.items || []).map((i: any) => i.name).join(', ')
        const dlvLabel = order.delivery_mode === 'express' ? '⚡ Express 3-6H' : '📦 Standard'
        createNotification(order.user_id, 'order_shipped', `Colis expédié — ${dlvLabel}`, `${productNames} est en route vers vous !`, `/account/dashboard?tab=orders`).catch(() => {})
    }

    return { success: true }
}

// Générer un numéro de suivi unique
function generateTrackingNumber(): string {
    const prefix = 'MM'
    const date = new Date()
    const yy = String(date.getFullYear()).slice(2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}${yy}${mm}${dd}${rand}`
}

// Actions admin : confirmer paiement (avec vérification optionnelle du transaction_id)
export async function adminConfirmPayment(orderId: string, adminTransactionId?: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    const { data: order } = await supabase
        .from('orders')
        .select('transaction_id, payment_method, order_type, subscription_plan_id, subscription_billing, user_id, status, items, delivery_mode, delivery_fee')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.status !== 'pending') return { error: `Impossible de confirmer : la commande est déjà "${order.status}".` }

    if (order.transaction_id && adminTransactionId) {
        const clientId = digitsOnly(order.transaction_id)
        const adminId = digitsOnly(adminTransactionId)
        if (!isExactly10Digits(adminId)) {
            return { error: 'L\'ID saisi doit contenir exactement 10 chiffres.' }
        }
        // Commandes récentes : 10 chiffres. Anciennes entrées plus longues : comparer les 10 derniers chiffres.
        const clientRef = clientId.length === 10 ? clientId : clientId.slice(-10)
        if (clientRef !== adminId) {
            return { error: 'Les ID de transaction ne correspondent pas' }
        }
    }

    // Générer un numéro de suivi à la confirmation
    const tracking_number = generateTrackingNumber()

    // ═══ CONFIRMATION ATOMIQUE (verrou optimiste via RPC) ═══
    const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_confirm_order', {
        p_order_id: orderId,
        p_tracking_number: tracking_number,
    })

    if (rpcError) return { error: rpcError.message }
    if (!rpcResult) return { error: 'Cette commande a déjà été confirmée par un autre admin.' }

    // Si c'est un abonnement → activer le plan vendeur automatiquement
    if (order.order_type === 'subscription' && order.subscription_plan_id) {
        if (!order.user_id) {
            await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId)
            return { error: 'Commande d’abonnement sans vendeur (user_id manquant).' }
        }

        const billing = (order.subscription_billing || 'monthly') as 'monthly' | 'yearly'

        // Récupérer la date de fin actuelle pour le calcul de renouvellement
        const { data: currentVendorProfile } = await supabase
            .from('profiles')
            .select('subscription_end_date')
            .eq('id', order.user_id)
            .single()

        const newEndDate = computeNewEndDate(
            currentVendorProfile?.subscription_end_date || null,
            billing
        )

        // RPC SECURITY DEFINER : contourne les échecs RLS sur profiles.update pour un autre utilisateur
        const { data: subscriptionUpdated, error: planError } = await supabase.rpc(
            'admin_update_vendor_subscription',
            {
                p_user_id: order.user_id,
                p_subscription_plan: order.subscription_plan_id,
                p_subscription_billing: billing,
                p_subscription_start_date: new Date().toISOString(),
                p_subscription_end_date: newEndDate,
            }
        )

        if (planError || !subscriptionUpdated) {
            console.error('[adminConfirmPayment] activation abonnement:', planError?.message || 'RPC false (profil introuvable ?)')
            await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId)
            return {
                error: planError?.message
                    || 'L\'activation du plan a échoué. Exécutez le script SQL supabase-profiles-rls-and-subscription-rpc.sql dans Supabase, puis réessayez.',
            }
        }
    }

    // Envoyer un email au client
    const { data: fullOrder } = await supabase
        .from('orders')
        .select('customer_name, customer_email, total_amount')
        .eq('id', orderId)
        .single()

    if (fullOrder?.customer_email) {
        if (order.order_type === 'subscription' && order.subscription_plan_id) {
            // Email spécifique abonnement avec les avantages du plan
            const planFeatures: Record<string, string[]> = {
                starter: ['30 produits maximum', 'Commission 10% par vente', 'Statistiques basiques', 'Support par email', '1 code promo / mois'],
                pro: ['100 produits maximum', 'Commission 7% par vente', 'Badge vérifié', 'Priorité dans le feed', 'Stats avancées & export', 'Support WhatsApp'],
                premium: ['Produits illimités', 'Commission 4% par vente', 'Badge vérifié', 'Priorité maximale', 'Stats avancées & export', 'Manager dédié', 'Produits sponsorisés'],
            }
            const planNames: Record<string, string> = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }
            const planId = order.subscription_plan_id
            sendSubscriptionConfirmationEmail(
                fullOrder.customer_email,
                fullOrder.customer_name,
                planNames[planId] || planId,
                fullOrder.total_amount || 0,
                planFeatures[planId] || []
            ).catch(() => {})
        } else {
            const emailProdNames = (order.items || []).map((i: any) => i.name).join(', ')
            sendOrderStatusEmail(fullOrder.customer_email, fullOrder.customer_name, orderId, 'confirmed', tracking_number, order.delivery_mode, emailProdNames).catch(() => {})
        }
    }

    // Notifications avec produit + mode livraison
    const productNames = (order.items || []).filter((i: any) => i.id && !i.id.startsWith('subscription_')).map((i: any) => i.name).join(', ')
    const dlvLabel = order.delivery_mode === 'express' ? '⚡ Express 3-6H' : '📦 Standard'
    const sellerIds = [...new Set((order.items || []).map((i: any) => i.seller_id).filter(Boolean))]
    for (const sellerId of sellerIds) {
        const sellerItems = (order.items || []).filter((i: any) => i.seller_id === sellerId).map((i: any) => i.name).join(', ')
        createNotification(sellerId as string, 'order_confirmed', `Commande confirmée — ${dlvLabel}`, `${sellerItems} · Paiement validé, préparez la commande !`, `/account/dashboard?tab=orders`).catch(() => {})
    }
    // Notifier l'acheteur
    if (order.user_id) {
        createNotification(order.user_id, 'order_confirmed', 'Paiement confirmé ✓', `${productNames} · ${dlvLabel} · Votre commande est en cours de préparation.`, `/account/dashboard?tab=orders`).catch(() => {})
    }

    return { success: true, tracking_number }
}

// Actions admin : rejeter une commande
export async function adminRejectOrder(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    // Récupérer les infos du client avant la mise à jour
    const { data: orderData } = await supabase
        .from('orders')
        .select('customer_name, customer_email, status, user_id, items, delivery_mode, order_type')
        .eq('id', orderId)
        .single()

    if (!orderData) return { error: 'Commande introuvable' }
    if (orderData.status !== 'pending') return { error: `Impossible de rejeter : la commande est "${orderData.status}".` }

    // ═══ REJET ATOMIQUE (verrou optimiste via RPC) ═══
    const { data: rejected, error: rpcError } = await supabase.rpc('admin_reject_order', {
        p_order_id: orderId,
    })

    if (rpcError) {
        console.error('[adminRejectOrder] RPC admin_reject_order (base de données):', rpcError.message)
        return { error: rpcError.message }
    }
    if (!rejected) {
        console.warn('[adminRejectOrder] rejet refusé (déjà traitée ou pas pending):', orderId)
        return { error: 'Cette commande a déjà été traitée par un autre admin.' }
    }

    console.info('[adminRejectOrder] commande rejetée en base:', orderId)

    if (orderData?.customer_email) {
        const rejProdNames = (orderData.items || []).map((i: any) => i.name).join(', ')
        const buyerMail = sendOrderStatusEmail(
            orderData.customer_email,
            orderData.customer_name,
            orderId,
            'rejected',
            undefined,
            orderData.delivery_mode,
            rejProdNames
        )
        buyerMail
            .then((r) => {
                if (r?.error) {
                    console.error('[adminRejectOrder] email acheteur (Resend / config):', r.error, {
                        orderId,
                        to: orderData.customer_email,
                    })
                } else {
                    console.info('[adminRejectOrder] email acheteur (rejet) envoyé:', orderId)
                }
            })
            .catch((e) => {
                console.error('[adminRejectOrder] email acheteur exception:', e)
            })
    } else {
        console.warn('[adminRejectOrder] pas d’email acheteur — skip mail client:', orderId)
    }

    // Emails vendeurs (une commande peut concerner plusieurs vendeurs)
    const items = (orderData.items || []) as { seller_id?: string }[]
    let vendorIds = [...new Set(items.map(i => i.seller_id).filter(Boolean))] as string[]
    if (vendorIds.length === 0 && orderData.order_type === 'subscription' && orderData.user_id) {
        vendorIds = [orderData.user_id]
    }
    if (vendorIds.length > 0) {
        const { data: vendorProfiles, error: vendorProfilesError } = await supabase
            .from('profiles')
            .select('email')
            .in('id', vendorIds)

        if (vendorProfilesError) {
            console.error('[adminRejectOrder] lecture emails vendeurs (Supabase / RLS):', vendorProfilesError.message, {
                orderId,
                vendorIds,
            })
        } else if (!vendorProfiles?.length) {
            console.warn('[adminRejectOrder] aucun profil vendeur trouvé pour les emails:', { orderId, vendorIds })
        }

        const seen = new Set<string>()
        for (const row of vendorProfiles || []) {
            const em = (row.email || '').trim()
            if (!em) continue
            const key = em.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            sendOrderRejectedVendorEmail(em)
                .then((r) => {
                    if (r?.error) {
                        console.error('[adminRejectOrder] email vendeur (Resend / config):', r.error, { orderId, to: em })
                    } else {
                        console.info('[adminRejectOrder] email vendeur (rejet) envoyé:', orderId, em)
                    }
                })
                .catch((e) => {
                    console.error('[adminRejectOrder] email vendeur exception:', e, { orderId, to: em })
                })
        }
    } else {
        console.warn('[adminRejectOrder] aucun vendeur à notifier (items sans seller_id):', orderId)
    }

    // Notifier l'acheteur
    if (orderData.user_id) {
        createNotification(orderData.user_id, 'order_rejected', 'Commande rejetée', 'Votre commande a été rejetée. Contactez le support.', `/account/dashboard?tab=orders`).catch(() => {})
    }

    return { success: true }
}

// Actions admin : libérer les fonds
export async function adminReleaseFunds(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier le rôle admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    // ═══ LIBÉRATION ATOMIQUE DES FONDS (via RPC avec FOR UPDATE) ═══
    const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_release_funds', {
        p_order_id: orderId,
    })

    if (rpcError) return { error: rpcError.message }
    if (rpcResult !== 'OK') return { error: rpcResult || 'Erreur inconnue' }

    return { success: true }
}

/** Suppression définitive en base (admin uniquement). Exécuter supabase-admin-delete-order.sql si la suppression est refusée par RLS. */
export async function adminDeleteOrder(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .maybeSingle()

    if (!existing) return { error: 'Commande introuvable' }

    const { error } = await supabase.from('orders').delete().eq('id', orderId)

    if (error) {
        console.error('[adminDeleteOrder]', error.message)
        return {
            error:
                error.message.includes('policy') || error.code === '42501'
                    ? 'Suppression refusée : exécutez le script SQL supabase-admin-delete-order.sql dans Supabase (policy + CASCADE sur ratings).'
                    : error.message,
        }
    }

    return { success: true }
}

// Créer une commande (appelé côté client via server action)
export async function createOrder(input: {
    items: Array<{
        id: string
        name: string
        price: number
        quantity: number
        img: string
        seller_id: string
        selectedSize?: string
        selectedColor?: string
    }>
    city: string
    district: string
    payment_method: string
    total_amount: number
    transaction_id?: string
    customer_name?: string
    phone?: string
    landmark?: string
    delivery_mode?: string
    delivery_fee?: number
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }

    // ═══ PROFIL ACHETEUR : ville + téléphone obligatoires pour commander ═══
    const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('city, phone, whatsapp_number')
        .eq('id', user.id)
        .maybeSingle()

    const profileCity = buyerProfile?.city?.trim()
    const profilePhone = (buyerProfile?.phone?.trim() || buyerProfile?.whatsapp_number?.trim()) ?? ''
    if (!profileCity || !profilePhone) {
        return {
            error: 'Complétez votre ville et votre numéro de téléphone dans votre profil (Mon compte → Profil) avant de passer commande.',
            code: 'profile_incomplete',
        }
    }

    // ═══ VALIDATION DES INPUTS ═══
    const VALID_PAYMENT_METHODS = ['mobile_money', 'airtel_money', 'cash']
    if (!VALID_PAYMENT_METHODS.includes(input.payment_method)) {
        return { error: 'Méthode de paiement invalide.' }
    }

    if (!input.city?.trim() || input.city.length > 100) {
        return { error: 'Ville invalide (max 100 caractères).' }
    }
    if (!input.district?.trim() || input.district.length > 100) {
        return { error: 'Quartier invalide (max 100 caractères).' }
    }
    if (input.customer_name && input.customer_name.length > 100) {
        return { error: 'Nom trop long (max 100 caractères).' }
    }
    if (input.landmark && input.landmark.length > 255) {
        return { error: 'Point de repère trop long (max 255 caractères).' }
    }

    const txDigits = input.transaction_id ? digitsOnly(input.transaction_id) : ''
    const phoneDigits = input.phone ? digitsOnly(input.phone) : ''

    if (['mobile_money', 'airtel_money'].includes(input.payment_method)) {
        if (!isExactly10Digits(txDigits)) {
            return { error: 'L\'ID de transaction doit contenir exactement 10 chiffres.' }
        }
    }
    if (input.payment_method === 'cash') {
        if (!isExactly10Digits(phoneDigits)) {
            return { error: 'Le numéro de téléphone doit contenir exactement 10 chiffres.' }
        }
    } else if (phoneDigits.length > 0 && !isExactly10Digits(phoneDigits)) {
        return { error: 'Le numéro de téléphone doit contenir exactement 10 chiffres.' }
    }
    if (!input.items || input.items.length === 0 || input.items.length > 50) {
        return { error: 'Panier invalide.' }
    }

    // ═══ VALIDATION SERVEUR DES PRIX ═══
    const productIds = input.items.map(item => item.id)
    const { data: dbProducts, error: productsError } = await supabase
        .from('products')
        .select('id, price, seller_id, name, has_stock, stock_quantity')
        .in('id', productIds)

    if (productsError || !dbProducts || dbProducts.length !== productIds.length) {
        return { error: 'Certains produits sont introuvables. Rafraîchissez la page.' }
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]))

    // Valider et reconstruire les items avec les prix BDD
    const validatedItems = input.items.map(item => {
        const dbProduct = productMap.get(item.id)!
        return {
            ...item,
            price: dbProduct.price,
            seller_id: dbProduct.seller_id,
            name: dbProduct.name,
        }
    })

    const itemsTotal = validatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    )

    const sellerIds = [...new Set(validatedItems.map(item => item.seller_id).filter(Boolean))]
    const { data: sellerProfiles } = await supabase
        .from('profiles')
        .select('id, subscription_plan, city')
        .in('id', sellerIds)

    const sellerCityList = sellerIds.map((sid) => {
        const row = sellerProfiles?.find((p) => p.id === sid)
        return row?.city ?? null
    })
    const interUrban = orderRequiresInterUrbanDelivery(input.city, sellerCityList)

    // Frais de livraison (validés côté serveur — recalculés, jamais fiables seuls depuis le client)
    const VALID_LOCAL_FEES: Record<string, number> = { standard: 1000, express: 2000 }
    const feeInput = Number(input.delivery_fee)
    const modeInput = (input.delivery_mode || 'standard').trim()

    let deliveryMode: string
    let deliveryFee: number

    if (interUrban) {
        deliveryMode = 'inter_urban'
        deliveryFee = DELIVERY_FEE_INTER_URBAN
        if (modeInput !== 'inter_urban' || feeInput !== DELIVERY_FEE_INTER_URBAN) {
            return {
                error: 'Frais de livraison invalides pour une commande inter-ville (forfait 3 500 F). Rafraîchissez la page.',
            }
        }
    } else {
        deliveryMode = modeInput === 'express' ? 'express' : 'standard'
        deliveryFee = VALID_LOCAL_FEES[deliveryMode]
        if (modeInput === 'inter_urban' || feeInput !== deliveryFee) {
            return { error: 'Frais de livraison invalides. Rafraîchissez la page.' }
        }
    }

    const serverTotal = itemsTotal + deliveryFee

    // ═══ VÉRIFICATION DU STOCK AVANT COMMANDE ═══
    for (const item of validatedItems) {
        const dbProduct = productMap.get(item.id)!
        if (dbProduct.has_stock && dbProduct.stock_quantity < item.quantity) {
            return { error: `Stock insuffisant pour "${dbProduct.name}". Disponible : ${dbProduct.stock_quantity}` }
        }
    }

    // ═══ COMMISSION DYNAMIQUE PAR VENDEUR ═══
    const sellerPlanMap = new Map((sellerProfiles || []).map(p => [p.id, p.subscription_plan || 'free']))

    let totalCommission = 0
    for (const item of validatedItems) {
        const plan = sellerPlanMap.get(item.seller_id) || 'free'
        const rate = getPlanCommissionRate(plan)
        totalCommission += Math.round(item.price * item.quantity * rate)
    }
    // Commission uniquement sur les produits, pas sur les frais de livraison
    const vendorPayout = itemsTotal - totalCommission
    const avgCommissionRate = itemsTotal > 0 ? totalCommission / itemsTotal : 0.10

    // ═══ DÉCRÉMENTATION ATOMIQUE DU STOCK (via RPC SECURITY DEFINER) ═══
    for (const item of validatedItems) {
        const dbProduct = productMap.get(item.id)!
        if (dbProduct.has_stock) {
            const { data: success, error: rpcError } = await supabase.rpc('decrement_stock', {
                p_product_id: item.id,
                p_quantity: item.quantity,
            })

            if (rpcError || !success) {
                return { error: `Stock insuffisant pour "${dbProduct.name}". Un autre acheteur a été plus rapide.` }
            }
        }
    }

    // ═══ CRÉATION DE LA COMMANDE ═══
    const { data: order, error } = await supabase.from('orders').insert([{
        user_id: user.id,
        customer_name: input.customer_name || user.email || 'Client',
        customer_email: user.email || null,
        phone: phoneDigits || input.phone || '',
        city: input.city,
        district: input.district,
        status: 'pending',
        total_amount: serverTotal,
        payment_method: input.payment_method,
        items: validatedItems,
        commission_rate: avgCommissionRate,
        commission_amount: totalCommission,
        vendor_payout: vendorPayout,
        payout_status: 'pending',
        transaction_id: ['mobile_money', 'airtel_money'].includes(input.payment_method) ? txDigits : null,
        landmark: input.landmark || null,
        delivery_mode: deliveryMode,
        delivery_fee: deliveryFee,
    }]).select().single()

    if (error) return { error: error.message }
    if (!order) return { error: 'La commande n\'a pas pu être créée. Réessayez.' }

    // Synchroniser ville / quartier de livraison sur le profil acheteur (aligné sur la commande)
    await supabase
        .from('profiles')
        .update({
            city: orderCityToProfileCity(input.city),
            district: input.district?.trim() || null,
        })
        .eq('id', user.id)

    return { order: JSON.parse(JSON.stringify(order)) }
}

// Supprimer un produit (vérifie que l'utilisateur est propriétaire ou admin)
export async function deleteProduct(productId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single()

    if (!product) return { error: 'Produit introuvable' }

    // Vérifier : propriétaire OU admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (product.seller_id !== user.id && profile?.role !== 'admin') {
        return { error: 'Non autorisé' }
    }

    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

    if (error) return { error: error.message }

    try {
        await revalidateProductCatalog(productId, product.seller_id)
    } catch (revErr) {
        console.error('[deleteProduct] revalidateProductCatalog:', revErr)
    }

    return { success: true }
}

// ═══ Promotions vendeur ═══

export async function activatePromo(productId: string, percentage: number, days: number) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    if (percentage < 5 || percentage > 50) return { error: 'La réduction doit être entre 5% et 50%.' }
    if (days < 1 || days > 7) return { error: 'La durée doit être entre 1 et 7 jours.' }

    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single()

    if (!product) return { error: 'Produit introuvable' }
    if (product.seller_id !== user.id) return { error: 'Non autorisé' }

    const now = new Date()
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const { error } = await supabase
        .from('products')
        .update({
            promo_percentage: percentage,
            promo_start_date: now.toISOString(),
            promo_end_date: endDate.toISOString(),
        })
        .eq('id', productId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function deactivatePromo(productId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single()

    if (!product) return { error: 'Produit introuvable' }
    if (product.seller_id !== user.id) return { error: 'Non autorisé' }

    const { error } = await supabase
        .from('products')
        .update({
            promo_percentage: null,
            promo_start_date: null,
            promo_end_date: null,
        })
        .eq('id', productId)

    if (error) return { error: error.message }
    return { success: true }
}

// ═══ Commission par plan d'abonnement ═══
function getPlanCommissionRate(plan: string): number {
    switch (plan) {
        case 'pro': return 0.07
        case 'premium': return 0.04
        default: return 0.10 // free & starter
    }
}

// ═══ Limites par plan d'abonnement ═══
function getPlanMaxProducts(plan: string): number {
    switch (plan) {
        case 'starter': return 30
        case 'pro': return 100
        case 'premium': return -1 // illimité
        default: return 5 // free
    }
}

// Récupérer les infos du plan vendeur (utilisé côté client pour afficher les limites)
export async function getSellerPlanInfo() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { plan: 'free', productCount: 0, maxProducts: 5 }

    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_end_date, subscription_billing')
        .eq('id', user.id)
        .single()

    const plan = profile?.subscription_plan || 'free'
    const maxProducts = getPlanMaxProducts(plan)

    const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)

    return {
        plan,
        productCount: count || 0,
        maxProducts,
        subscriptionEndDate: profile?.subscription_end_date || null,
        subscriptionBilling: profile?.subscription_billing || null,
    }
}

// Créer une commande d'abonnement vendeur
export async function createSubscriptionOrder(input: {
    planId: string
    planName: string
    price: number
    billing: string
    payment_method: string
    transaction_id: string
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }

    // Vérifier qu'il n'y a pas déjà un abonnement en attente
    const { data: existingPending } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('order_type', 'subscription')
        .eq('status', 'pending')
        .maybeSingle()

    if (existingPending) {
        return { error: 'Vous avez déjà un abonnement en attente de confirmation. Attendez la validation avant d\'en créer un autre.' }
    }

    // ═══ VALIDATION DU PRIX CÔTÉ SERVEUR ═══
    const planPrices = PLAN_PRICES[input.planId]
    if (!planPrices) return { error: 'Plan invalide.' }
    const expectedPrice = input.billing === 'monthly' ? planPrices.monthly : planPrices.yearly
    if (input.price !== expectedPrice) {
        return { error: 'Le prix ne correspond pas au plan sélectionné.' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

    const txDigits = digitsOnly(input.transaction_id)
    if (!isExactly10Digits(txDigits)) {
        return { error: 'L\'ID de transaction doit contenir exactement 10 chiffres.' }
    }

    const { data: order, error } = await supabase.from('orders').insert([{
        user_id: user.id,
        customer_name: profile?.full_name || user.email || 'Vendeur',
        customer_email: user.email || null,
        phone: profile?.phone || '',
        city: 'Abonnement',
        district: 'Mayombe Market',
        status: 'pending',
        total_amount: expectedPrice,
        payment_method: input.payment_method,
        items: [{
            id: `subscription_${input.planId}`,
            name: `Abonnement ${input.planName} (${input.billing === 'monthly' ? 'Mensuel' : 'Annuel'})`,
            price: input.price,
            quantity: 1,
            img: '',
            seller_id: user.id,
        }],
        commission_rate: 0,
        commission_amount: 0,
        vendor_payout: 0,
        payout_status: 'paid',
        transaction_id: txDigits,
        order_type: 'subscription',
        subscription_plan_id: input.planId,
        subscription_billing: input.billing,
    }]).select().single()

    if (error) return { error: error.message }
    if (!order) return { error: 'Impossible de créer la commande. Réessayez.' }

    return { order: JSON.parse(JSON.stringify(order)) }
}

export type CreateProductDiagnostic = {
    code?: string
    details?: string
    hint?: string
}

// Créer un produit (server-side pour contourner les problèmes RLS côté client)
// N’écrit pas sur profiles : shop_* / boutique vides ne bloquent pas l’insert.
export async function createProduct(input: {
    name: string
    price: number
    description: string
    category: string
    subcategory: string
    img: string
    images_gallery: string[]
    has_stock: boolean
    stock_quantity: number
    has_variants: boolean
    sizes: string[]
    colors: string[]
    /** Doit être l’UUID auth actuel ; sinon refus (alignement client / serveur, anti usurpation seller_id). */
    expected_seller_id?: string
}): Promise<
    | { product: Record<string, unknown> }
    | { error: string; diagnostic?: CreateProductDiagnostic }
> {
    try {
        const supabase = await getSupabase()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()

        if (authErr) {
            console.error('[createProduct] auth.getUser:', authErr.message)
            return {
                error: 'Session invalide ou expirée. Reconnectez-vous.',
                diagnostic: { code: authErr.message, details: 'auth_getUser' },
            }
        }
        if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }

        if (input.expected_seller_id != null && input.expected_seller_id.trim() !== user.id) {
            console.error('[createProduct] expected_seller_id !== auth.uid()', {
                expected: input.expected_seller_id,
                actual: user.id,
            })
            return {
                error: 'Session incohérente. Reconnectez-vous et réessayez.',
                diagnostic: { code: 'seller_mismatch', details: 'expected_seller_id' },
            }
        }

        // ═══ Vérification de l'identité vendeur ═══
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('subscription_plan, subscription_end_date, verification_status')
            .eq('id', user.id)
            .single()

        if (profileErr) {
            console.error('[createProduct] lecture profil:', profileErr.message, profileErr)
            return {
                error: profileErr.message,
                diagnostic: {
                    code: profileErr.code,
                    details: profileErr.details ?? undefined,
                    hint: profileErr.hint ?? undefined,
                },
            }
        }

        if (profile?.verification_status !== 'verified') {
            return { error: 'Votre compte doit être vérifié avant de publier des produits. Rendez-vous dans Vérification depuis votre dashboard.' }
        }

        // ═══ Vérification de la limite de produits selon le plan ═══
        const plan = profile?.subscription_plan || 'free'
        const maxProducts = getPlanMaxProducts(plan)

        if (plan !== 'free' && isSubscriptionExpiredPastGrace(profile)) {
            return { error: 'Votre abonnement a expiré. Renouvelez votre plan pour continuer à publier des produits.' }
        }

        if (maxProducts !== -1) {
            const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id)

            if ((count || 0) >= maxProducts) {
                const planName = plan === 'free' ? 'Gratuit' : plan.charAt(0).toUpperCase() + plan.slice(1)
                return { error: `Limite atteinte ! Votre plan ${planName} est limité à ${maxProducts} produits. Passez au niveau supérieur pour continuer à publier.` }
            }
        }

        // Payload explicite (évite toute clé inconnue issue d’un spread)
        const row = {
            name: input.name,
            price: input.price,
            description: input.description ?? '',
            category: input.category,
            subcategory: input.subcategory,
            img: input.img,
            images_gallery: Array.isArray(input.images_gallery) ? input.images_gallery : [],
            has_stock: Boolean(input.has_stock),
            stock_quantity: Number.isFinite(input.stock_quantity) ? input.stock_quantity : 0,
            has_variants: Boolean(input.has_variants),
            sizes: Array.isArray(input.sizes) ? input.sizes : [],
            colors: Array.isArray(input.colors) ? input.colors : [],
            seller_id: user.id,
        }

        const { data: product, error } = await supabase
            .from('products')
            .insert(row)
            .select()
            .single()

        if (error) {
            console.error('[createProduct] insert products:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            })
            return {
                error: error.message,
                diagnostic: {
                    code: error.code,
                    details: error.details ?? undefined,
                    hint: error.hint ?? undefined,
                },
            }
        }

        return { product: JSON.parse(JSON.stringify(product)) as Record<string, unknown> }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[createProduct] exception:', e)
        return { error: msg, diagnostic: { details: 'exception_createProduct' } }
    }
}

// Admin : annuler l'abonnement d'un vendeur
export async function adminCancelSubscription(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    // Récupérer la commande d'abonnement
    const { data: order } = await supabase
        .from('orders')
        .select('user_id, order_type, subscription_plan_id')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.order_type !== 'subscription') return { error: 'Cette commande n\'est pas un abonnement' }
    if (!order.user_id) return { error: 'Commande sans vendeur associé (user_id manquant).' }

    const { data: cleared, error: profileError } = await supabase.rpc('admin_update_vendor_subscription', {
        p_user_id: order.user_id,
        p_subscription_plan: null,
        p_subscription_billing: null,
        p_subscription_start_date: null,
        p_subscription_end_date: null,
    })

    if (profileError) {
        console.error('[adminCancelSubscription] RPC profil:', profileError.message)
        return { error: profileError.message }
    }
    if (!cleared) {
        return { error: 'Impossible de réinitialiser l’abonnement (profil vendeur introuvable).' }
    }

    // Marquer la commande comme rejetée
    await supabase
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)

    // Notifier le vendeur
    createNotification(
        order.user_id,
        'subscription_cancelled',
        'Abonnement annulé',
        'Votre abonnement a été annulé par l\'administrateur. Vous êtes repassé en plan gratuit.',
        '/account/dashboard?tab=subscription'
    ).catch(() => {})

    return { success: true }
}
