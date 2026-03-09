'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendOrderStatusEmail, sendSubscriptionConfirmationEmail } from '@/app/actions/emails'
import { createNotification } from '@/app/actions/notifications'
import { PLAN_PRICES } from '@/lib/planPrices'
import { computeNewEndDate, isSubscriptionExpiredPastGrace } from '@/lib/subscription'

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
        .select('items, user_id')
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
        .select('customer_name, customer_email, tracking_number')
        .eq('id', orderId)
        .single()

    if (orderData?.customer_email) {
        sendOrderStatusEmail(orderData.customer_email, orderData.customer_name, orderId, newStatus, orderData.tracking_number).catch(() => {})
    }

    // Notifier l'acheteur
    if (order.user_id && newStatus === 'shipped') {
        createNotification(order.user_id, 'order_shipped', 'Colis expédié', 'Votre commande a été expédiée.', `/account/dashboard?tab=orders`).catch(() => {})
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
        .select('transaction_id, payment_method, order_type, subscription_plan_id, subscription_billing, user_id, status, items')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.status !== 'pending') return { error: `Impossible de confirmer : la commande est déjà "${order.status}".` }

    if (order.transaction_id && adminTransactionId) {
        const clientId = order.transaction_id.replace(/\s/g, '')
        const adminId = adminTransactionId.replace(/\s/g, '')
        if (clientId !== adminId) {
            return { error: 'Les ID de transaction ne correspondent pas' }
        }
    }

    // Générer un numéro de suivi à la confirmation
    const tracking_number = generateTrackingNumber()

    const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed', tracking_number })
        .eq('id', orderId)

    if (error) return { error: error.message }

    // Si c'est un abonnement → activer le plan vendeur automatiquement
    if (order.order_type === 'subscription' && order.subscription_plan_id) {
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

        const { data: updatedProfile, error: planError } = await supabase
            .from('profiles')
            .update({
                subscription_plan: order.subscription_plan_id,
                subscription_start_date: new Date().toISOString(),
                subscription_end_date: newEndDate,
                subscription_billing: billing,
                updated_at: new Date().toISOString()
            })
            .eq('id', order.user_id)
            .select('subscription_plan')
            .single()

        if (planError || updatedProfile?.subscription_plan !== order.subscription_plan_id) {
            // Rollback : remettre la commande en pending pour que l'admin puisse réessayer
            await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId)
            return { error: 'L\'activation du plan a échoué (vérifiez les policies RLS sur profiles). Réessayez.' }
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
            sendOrderStatusEmail(fullOrder.customer_email, fullOrder.customer_name, orderId, 'confirmed', tracking_number).catch(() => {})
        }
    }

    // Notifications
    // Notifier les vendeurs concernés
    const sellerIds = [...new Set((order.items || []).map((i: any) => i.seller_id).filter(Boolean))]
    for (const sellerId of sellerIds) {
        createNotification(sellerId as string, 'order_confirmed', 'Commande confirmée', 'Un paiement a été confirmé pour votre commande.', `/account/dashboard?tab=orders`).catch(() => {})
    }
    // Notifier l'acheteur
    if (order.user_id) {
        createNotification(order.user_id, 'order_confirmed', 'Paiement confirmé', 'Votre paiement a été validé. Votre commande est en cours.', `/account/dashboard?tab=orders`).catch(() => {})
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
        .select('customer_name, customer_email, status, user_id')
        .eq('id', orderId)
        .single()

    if (!orderData) return { error: 'Commande introuvable' }
    if (orderData.status !== 'pending') return { error: `Impossible de rejeter : la commande est "${orderData.status}".` }

    const { error } = await supabase
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)

    if (error) return { error: error.message }

    if (orderData?.customer_email) {
        sendOrderStatusEmail(orderData.customer_email, orderData.customer_name, orderId, 'rejected').catch(() => {})
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

    // Vérifier que la commande est livrée et que 48h sont passées
    const { data: order } = await supabase
        .from('orders')
        .select('status, payout_status, delivered_at')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.status !== 'delivered') return { error: 'Commande non livrée' }
    if (order.payout_status !== 'pending') return { error: 'Fonds déjà libérés' }

    if (order.delivered_at) {
        const elapsed = Date.now() - new Date(order.delivered_at).getTime()
        if (elapsed < 48 * 60 * 60 * 1000) return { error: 'Il faut attendre 48h après la livraison' }
    }

    const { error } = await supabase
        .from('orders')
        .update({ payout_status: 'paid' })
        .eq('id', orderId)

    if (error) return { error: error.message }
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
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }

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

    const serverTotal = validatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    )

    // ═══ VÉRIFICATION DU STOCK AVANT COMMANDE ═══
    for (const item of validatedItems) {
        const dbProduct = productMap.get(item.id)!
        if (dbProduct.has_stock && dbProduct.stock_quantity < item.quantity) {
            return { error: `Stock insuffisant pour "${dbProduct.name}". Disponible : ${dbProduct.stock_quantity}` }
        }
    }

    // ═══ COMMISSION DYNAMIQUE PAR VENDEUR ═══
    const sellerIds = [...new Set(validatedItems.map(item => item.seller_id).filter(Boolean))]
    const { data: sellerProfiles } = await supabase
        .from('profiles')
        .select('id, subscription_plan')
        .in('id', sellerIds)

    const sellerPlanMap = new Map((sellerProfiles || []).map(p => [p.id, p.subscription_plan || 'free']))

    let totalCommission = 0
    for (const item of validatedItems) {
        const plan = sellerPlanMap.get(item.seller_id) || 'free'
        const rate = getPlanCommissionRate(plan)
        totalCommission += Math.round(item.price * item.quantity * rate)
    }
    const vendorPayout = serverTotal - totalCommission
    const avgCommissionRate = serverTotal > 0 ? totalCommission / serverTotal : 0.10

    // ═══ DÉCRÉMENTATION ATOMIQUE DU STOCK ═══
    for (const item of validatedItems) {
        const dbProduct = productMap.get(item.id)!
        if (dbProduct.has_stock) {
            const { data: updated } = await supabase
                .from('products')
                .update({ stock_quantity: dbProduct.stock_quantity - item.quantity })
                .eq('id', item.id)
                .gte('stock_quantity', item.quantity)
                .select('id')

            if (!updated || updated.length === 0) {
                return { error: `Stock insuffisant pour "${dbProduct.name}". Un autre acheteur a été plus rapide.` }
            }
        }
    }

    // ═══ CRÉATION DE LA COMMANDE ═══
    const { data: order, error } = await supabase.from('orders').insert([{
        user_id: user.id,
        customer_name: input.customer_name || user.email || 'Client',
        customer_email: user.email || null,
        phone: input.phone || '',
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
        transaction_id: input.transaction_id || null,
        landmark: input.landmark || null,
    }]).select().single()

    if (error) return { error: error.message }
    if (!order) return { error: 'La commande n\'a pas pu être créée. Réessayez.' }

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
        transaction_id: input.transaction_id,
        order_type: 'subscription',
        subscription_plan_id: input.planId,
        subscription_billing: input.billing,
    }]).select().single()

    if (error) return { error: error.message }
    if (!order) return { error: 'Impossible de créer la commande. Réessayez.' }

    return { order: JSON.parse(JSON.stringify(order)) }
}

// Créer un produit (server-side pour contourner les problèmes RLS côté client)
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
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }

    // ═══ Vérification de la limite de produits selon le plan ═══
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_end_date')
        .eq('id', user.id)
        .single()

    const plan = profile?.subscription_plan || 'free'
    const maxProducts = getPlanMaxProducts(plan)

    // Vérifier si l'abonnement est expiré (au-delà de la période de grâce)
    if (plan !== 'free' && isSubscriptionExpiredPastGrace(profile)) {
        return { error: 'Votre abonnement a expiré. Renouvelez votre plan pour continuer à publier des produits.' }
    }

    if (maxProducts !== -1) { // -1 = illimité (premium)
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id)

        if ((count || 0) >= maxProducts) {
            const planName = plan === 'free' ? 'Gratuit' : plan.charAt(0).toUpperCase() + plan.slice(1)
            return { error: `Limite atteinte ! Votre plan ${planName} est limité à ${maxProducts} produits. Passez au niveau supérieur pour continuer à publier.` }
        }
    }

    const { data: product, error } = await supabase
        .from('products')
        .insert({
            ...input,
            seller_id: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.message }
    return { product: JSON.parse(JSON.stringify(product)) }
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

    // Remettre le profil vendeur en plan gratuit
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            subscription_plan: null,
            subscription_start_date: null,
            subscription_end_date: null,
            subscription_billing: null,
        })
        .eq('id', order.user_id)

    if (profileError) return { error: profileError.message }

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
