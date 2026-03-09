'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNotification } from '@/app/actions/notifications'

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

    // Toutes les conversations de l'utilisateur
    const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

    if (!conversations || conversations.length === 0) return { conversations: [] }

    // Pour chaque conversation, récupérer le profil de l'autre + le dernier message + unread count
    const enriched = await Promise.all(
        conversations.map(async (conv) => {
            const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id

            // Profil de l'autre personne
            const { data: otherProfile } = await supabase
                .from('profiles')
                .select('id, full_name, store_name, shop_name, avatar_url')
                .eq('id', otherId)
                .single()

            // Dernier message
            const { data: lastMessage } = await supabase
                .from('messages')
                .select('content, sender_id, created_at')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            // Nombre de messages non lus
            const { count: unreadCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id)
                .eq('is_read', false)

            // Nom du produit si lié
            let productName = null
            if (conv.product_id) {
                const { data: product } = await supabase
                    .from('products')
                    .select('name')
                    .eq('id', conv.product_id)
                    .single()
                productName = product?.name || null
            }

            return {
                ...conv,
                otherProfile,
                lastMessage,
                unreadCount: unreadCount || 0,
                productName,
            }
        })
    )

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
