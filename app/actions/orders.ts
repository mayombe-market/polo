'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
                remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
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
    return { success: true }
}

// Actions admin : confirmer paiement
export async function adminConfirmPayment(orderId: string) {
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

    const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId)

    if (error) return { error: error.message }
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
