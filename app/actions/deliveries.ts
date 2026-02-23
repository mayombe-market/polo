'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendPickupNotificationEmail, sendDeliveryConfirmationRequestEmail } from '@/app/actions/emails'

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

// Récupérer les livraisons du logisticien connecté
export async function getLogisticianDeliveries() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { deliveries: [] }

    // Vérifier le rôle
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'logistician' && profile?.role !== 'admin') {
        return { deliveries: [] }
    }

    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('logistician_id', user.id)
        .in('status', ['shipped', 'picked_up', 'delivered'])
        .order('created_at', { ascending: false })

    // Enrichir avec les infos vendeur
    const enriched = await Promise.all((orders || []).map(async (order) => {
        const sellerId = order.items?.[0]?.seller_id
        let sellerProfile = null
        if (sellerId) {
            const { data } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', sellerId)
                .single()
            sellerProfile = data
        }
        return {
            ...order,
            seller_name: sellerProfile?.full_name || 'Vendeur',
            seller_phone: sellerProfile?.phone || '',
        }
    }))

    return { deliveries: JSON.parse(JSON.stringify(enriched)) }
}

// Logisticien marque "récupéré chez le vendeur" (shipped → picked_up)
export async function markPickedUp(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier que la commande est bien assignée à ce logisticien
    const { data: order } = await supabase
        .from('orders')
        .select('logistician_id, status, customer_name, customer_email, items')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.logistician_id !== user.id) return { error: 'Non autorisé' }
    if (order.status !== 'shipped') return { error: 'Statut invalide — la commande doit être expédiée' }

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'picked_up',
            picked_up_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) return { error: error.message }

    // Récupérer le nom du logisticien
    const { data: logProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    // Notifier le client par email
    if (order.customer_email) {
        const productName = order.items?.[0]?.name || 'votre commande'
        sendPickupNotificationEmail(
            order.customer_email,
            order.customer_name,
            productName,
            logProfile?.full_name || 'Un livreur'
        ).catch(() => {})
    }

    return { success: true }
}

// Logisticien marque "livré au client" (picked_up → delivered)
export async function markDelivered(orderId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: order } = await supabase
        .from('orders')
        .select('logistician_id, status, customer_name, customer_email, items')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.logistician_id !== user.id) return { error: 'Non autorisé' }
    if (order.status !== 'picked_up') return { error: 'Statut invalide — le colis doit d\'abord être récupéré' }

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) return { error: error.message }

    // Notifier le client pour confirmer la réception
    if (order.customer_email) {
        const productName = order.items?.[0]?.name || 'votre commande'
        sendDeliveryConfirmationRequestEmail(
            order.customer_email,
            order.customer_name,
            orderId,
            productName
        ).catch(() => {})
    }

    return { success: true }
}

// Admin assigne un logisticien à une commande
export async function assignLogistician(orderId: string, logisticianId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    // Vérifier que c'est un admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    // Vérifier que le logisticien existe
    const { data: logProfile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', logisticianId)
        .single()

    if (!logProfile || logProfile.role !== 'logistician') {
        return { error: 'Logisticien introuvable' }
    }

    const { error } = await supabase
        .from('orders')
        .update({ logistician_id: logisticianId })
        .eq('id', orderId)

    if (error) return { error: error.message }
    return { success: true, logisticianName: logProfile.full_name }
}

// Admin récupère la liste des logisticiens disponibles
export async function getAvailableLogisticians() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { logisticians: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { logisticians: [] }

    const { data: logisticians } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('role', 'logistician')
        .order('full_name')

    return { logisticians: JSON.parse(JSON.stringify(logisticians || [])) }
}

// Admin : promouvoir un utilisateur en logisticien
export async function promoteToLogistician(userId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    const { error } = await supabase
        .from('profiles')
        .update({ role: 'logistician', updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) return { error: error.message }
    return { success: true }
}

// Admin : retirer le rôle logisticien (remettre en buyer)
export async function demoteLogistician(userId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    const { error } = await supabase
        .from('profiles')
        .update({ role: 'buyer', updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) return { error: error.message }
    return { success: true }
}

// Admin : rechercher un utilisateur par email pour le promouvoir
export async function searchUserByEmail(email: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { users: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { users: [] }

    const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, phone, role')
        .or(`full_name.ilike.%${email}%,first_name.ilike.%${email}%`)
        .limit(10)

    return { users: JSON.parse(JSON.stringify(users || [])) }
}
