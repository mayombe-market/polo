'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNotification } from '@/app/actions/notifications'
import { IMMOBILIER_CATEGORY } from '@/lib/realEstateListing'

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

// Trouver ou créer une conversation entre acheteur et vendeur
export async function getOrCreateConversation(sellerId: string, productId?: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }
    if (user.id === sellerId) return { error: 'Vous ne pouvez pas vous envoyer un message à vous-même.' }

    // Chercher une conversation existante
    let query = supabase
        .from('conversations')
        .select('*')
        .or(`and(buyer_id.eq.${user.id},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${user.id})`)

    if (productId) {
        query = query.eq('product_id', productId)
    } else {
        query = query.is('product_id', null)
    }

    const { data: existing } = await query.maybeSingle()

    if (existing) return { success: true, conversation: existing }

    // Créer une nouvelle conversation
    const { data: conversation, error } = await supabase
        .from('conversations')
        .insert([{
            buyer_id: user.id,
            seller_id: sellerId,
            product_id: productId || null,
        }])
        .select()
        .single()

    if (error) return { error: error.message }
    return { success: true, conversation }
}

/**
 * Immobilier : ouvre une conversation avec **un compte administrateur** (`profiles.role = 'admin'`),
 * pas avec l’annonceur. Le premier admin (tri par `id`) sert de boîte de réception.
 */
export async function getOrCreateRealEstateAdminConversation(productId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté. Veuillez vous reconnecter.' }

    const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, seller_id, category')
        .eq('id', productId)
        .single()

    if (productError || !product) return { error: 'Annonce introuvable.' }

    if ((product.category || '').trim() !== IMMOBILIER_CATEGORY) {
        return { error: 'Cette annonce n’est pas une annonce immobilière.' }
    }

    if (user.id === product.seller_id) {
        return { error: 'Vous ne pouvez pas vous envoyer un message à vous-même.' }
    }

    const { data: adminRow } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle()

    const adminId = adminRow?.id
    if (!adminId) {
        return {
            error: 'Messagerie indisponible : aucun compte administrateur n’est configuré (rôle admin dans les profils).',
        }
    }

    if (user.id === adminId) {
        return {
            error: 'En tant qu’administrateur, gérez les demandes depuis votre tableau de bord (messages).',
        }
    }

    return getOrCreateConversation(adminId, productId)
}

// Envoyer un message
export async function sendMessage(conversationId: string, content: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non connecté' }

    const trimmed = content.trim()
    if (!trimmed) return { error: 'Le message ne peut pas être vide.' }
    if (trimmed.length > 1000) return { error: 'Le message est trop long (1000 caractères max).' }

    // Vérifier que l'utilisateur fait partie de la conversation
    const { data: conv } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single()

    if (!conv) return { error: 'Conversation introuvable.' }
    if (conv.buyer_id !== user.id && conv.seller_id !== user.id) return { error: 'Non autorisé.' }

    // Insérer le message
    const { data: message, error } = await supabase
        .from('messages')
        .insert([{
            conversation_id: conversationId,
            sender_id: user.id,
            content: trimmed,
        }])
        .select()
        .single()

    if (error) return { error: error.message }

    // Mettre à jour last_message_at
    await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

    // Notifier le destinataire
    const recipientId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
    createNotification(recipientId, 'new_message', 'Nouveau message', trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed, `/account/dashboard?tab=messages&conv=${conversationId}`).catch(() => {})

    return { success: true, message }
}

// Récupérer les conversations de l'utilisateur
export async function getConversations() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { conversations: [] }

    // 1. Toutes les conversations de l'utilisateur
    const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .limit(100)

    if (!conversations || conversations.length === 0) return { conversations: [] }

    const convIds = conversations.map(c => c.id)
    const otherIds = [...new Set(conversations.map(c =>
        c.buyer_id === user.id ? c.seller_id : c.buyer_id
    ))]
    const productIds = [...new Set(
        conversations.filter(c => c.product_id).map(c => c.product_id)
    )]

    // 2. Batch : 4 requêtes au lieu de N×4
    const [profilesRes, recentMsgsRes, unreadMsgsRes, productsRes] = await Promise.all([
        // Profils des interlocuteurs
        supabase
            .from('profiles')
            .select('id, full_name, store_name, shop_name, avatar_url')
            .in('id', otherIds),
        // Messages récents (pour extraire le dernier par conversation)
        supabase
            .from('messages')
            .select('conversation_id, content, sender_id, created_at')
            .in('conversation_id', convIds)
            .order('created_at', { ascending: false })
            .limit(500),
        // Messages non lus
        supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', convIds)
            .neq('sender_id', user.id)
            .eq('is_read', false),
        // Noms des produits liés
        productIds.length > 0
            ? supabase.from('products').select('id, name').in('id', productIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    // 3. Construire les maps pour lookup O(1)
    const profileMap = Object.fromEntries(
        (profilesRes.data || []).map(p => [p.id, p])
    )
    // Premier message rencontré = le plus récent (déjà trié DESC)
    const lastMessageMap: Record<string, any> = {}
    for (const msg of (recentMsgsRes.data || [])) {
        if (!lastMessageMap[msg.conversation_id]) {
            lastMessageMap[msg.conversation_id] = msg
        }
    }
    // Compter non-lus par conversation en JS
    const unreadMap: Record<string, number> = {}
    for (const msg of (unreadMsgsRes.data || [])) {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1
    }
    const productMap = Object.fromEntries(
        ((productsRes as any).data || []).map((p: any) => [p.id, p.name])
    )

    // 4. Enrichir sans aucune requête supplémentaire
    const enriched = conversations.map(conv => {
        const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
        return {
            ...conv,
            otherProfile: profileMap[otherId] || null,
            lastMessage: lastMessageMap[conv.id] || null,
            unreadCount: unreadMap[conv.id] || 0,
            productName: conv.product_id ? productMap[conv.product_id] || null : null,
        }
    })

    return { conversations: JSON.parse(JSON.stringify(enriched)) }
}

// Récupérer les messages d'une conversation
export async function getMessages(conversationId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { messages: [] }

    // Vérifier que l'utilisateur fait partie de la conversation
    const { data: conv } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single()

    if (!conv) return { messages: [] }
    if (conv.buyer_id !== user.id && conv.seller_id !== user.id) return { messages: [] }

    // Récupérer les messages
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

    // Marquer les messages de l'autre comme lus
    await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)

    return { messages: JSON.parse(JSON.stringify(messages || [])) }
}

// Compter les messages non lus
export async function getUnreadCount() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { count: 0 }

    // Trouver toutes les conversations de l'utilisateur
    const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

    if (!conversations || conversations.length === 0) return { count: 0 }

    const convIds = conversations.map(c => c.id)

    // Compter les messages non lus dans toutes ses conversations
    const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .eq('is_read', false)

    return { count: count || 0 }
}
