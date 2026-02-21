'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendOrderStatusEmail } from '@/app/actions/emails'

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
        .order('created_at', { ascending: false })

    // Filtrage côté SERVEUR — le client ne reçoit que ses commandes
    const vendorOrders = (allOrders || []).filter(order =>
        order.status !== 'pending' &&
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
        .select('items')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }

    const hasVendorItems = order.items?.some((item: any) => item.seller_id === user.id)
    if (!hasVendorItems) return { error: 'Non autorisé' }

    // Valider le statut
    const validStatuses = ['confirmed', 'shipped', 'delivered']
    if (!validStatuses.includes(newStatus)) return { error: 'Statut invalide' }

    const updateData: any = { status: newStatus }
    if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
    }

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
        .select('transaction_id, payment_method')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }

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

    // Envoyer un email au client
    const { data: fullOrder } = await supabase
        .from('orders')
        .select('customer_name, customer_email')
        .eq('id', orderId)
        .single()

    if (fullOrder?.customer_email) {
        sendOrderStatusEmail(fullOrder.customer_email, fullOrder.customer_name, orderId, 'confirmed', tracking_number).catch(() => {})
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
        .select('customer_name, customer_email')
        .eq('id', orderId)
        .single()

    const { error } = await supabase
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)

    if (error) return { error: error.message }

    if (orderData?.customer_email) {
        sendOrderStatusEmail(orderData.customer_email, orderData.customer_name, orderId, 'rejected').catch(() => {})
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
