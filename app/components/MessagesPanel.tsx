'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { getConversations, getMessages, sendMessage } from '@/app/actions/messages'
import { playMessageSound } from '@/lib/notificationSound'
import { useRealtime } from '@/hooks/useRealtime'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ArrowLeft, Send, Loader2, MessageCircle, Package } from 'lucide-react'
import { toast } from 'sonner'

interface MessagesPanelProps {
    userId: string
    initialConversationId?: string | null
}

export default function MessagesPanel({ userId, initialConversationId }: MessagesPanelProps) {
    const [conversations, setConversations] = useState<any[]>([])
    const [activeConversation, setActiveConversation] = useState<string | null>(initialConversationId || null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loadingConvs, setLoadingConvs] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    // Charger les conversations
    useEffect(() => {
        const load = async () => {
            try {
                const result = await getConversations()
                setConversations(result.conversations || [])
            } catch (err) {
                console.error('Erreur chargement conversations:', err)
            } finally {
                setLoadingConvs(false)
            }
        }
        load()
    }, [])

    // Si initialConversationId, charger la conversation directement
    useEffect(() => {
        if (initialConversationId) {
            setActiveConversation(initialConversationId)
        }
    }, [initialConversationId])

    // Charger les messages quand on sélectionne une conversation
    useEffect(() => {
        if (!activeConversation) return

        const loadMessages = async () => {
            setLoadingMessages(true)
            try {
                const result = await getMessages(activeConversation)
                setMessages(result.messages || [])

                // Mettre à jour le compteur non-lu dans la liste
                setConversations(prev => prev.map(c =>
                    c.id === activeConversation ? { ...c, unreadCount: 0 } : c
                ))
            } catch (err) {
                console.error('Erreur chargement messages:', err)
            } finally {
                setLoadingMessages(false)
            }
        }
        loadMessages()
    }, [activeConversation])

    // Auto-scroll vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Real-time via shared channel
    useRealtime('message:insert', (payload) => {
        const msg = payload.new as any

        // Si le message est dans la conversation active, l'ajouter
        if (msg.conversation_id === activeConversation) {
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev
                return [...prev, msg]
            })

            // Marquer comme lu si c'est de l'autre personne
            if (msg.sender_id !== userId) {
                supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('id', msg.id)
                    .then(() => {})
            }
        }

        // Notification si ce n'est pas notre message
        if (msg.sender_id !== userId) {
            if (msg.conversation_id !== activeConversation) {
                setConversations(prev => prev.map(c =>
                    c.id === msg.conversation_id
                        ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { content: msg.content, sender_id: msg.sender_id, created_at: msg.created_at } }
                        : c
                ))
            }
            playMessageSound()
        }
    }, [activeConversation, userId])

    // Envoyer un message
    const handleSend = async () => {
        if (!activeConversation || !newMessage.trim() || sending) return

        const content = newMessage.trim()
        setNewMessage('')
        setSending(true)

        // Ajout optimiste
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            conversation_id: activeConversation,
            sender_id: userId,
            content,
            is_read: false,
            created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])

        try {
            const result = await sendMessage(activeConversation, content)
            if (result.error) {
                toast.error(result.error)
                // Retirer le message optimiste
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
            } else if (result.message) {
                // Remplacer le message optimiste par le vrai
                setMessages(prev => prev.map(m =>
                    m.id === optimisticMsg.id ? result.message : m
                ))
            }
        } catch (err) {
            toast.error('Erreur réseau. Réessayez.')
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const getOtherName = (conv: any) => {
        const p = conv.otherProfile
        return p?.store_name || p?.shop_name || p?.full_name || 'Utilisateur'
    }

    const getOtherAvatar = (conv: any) => {
        return conv.otherProfile?.avatar_url || null
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        } else if (diffDays === 1) {
            return 'Hier'
        } else if (diffDays < 7) {
            return date.toLocaleDateString('fr-FR', { weekday: 'short' })
        }
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }

    // Active conversation data
    const activeConvData = conversations.find(c => c.id === activeConversation)

    // ── VUE CHAT ──
    if (activeConversation) {
        return (
            <div className="flex flex-col h-[calc(100vh-200px)] max-h-[600px]">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => { setActiveConversation(null); setMessages([]) }}
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    {activeConvData && (
                        <>
                            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
                                {getOtherAvatar(activeConvData) ? (
                                    <img src={getOtherAvatar(activeConvData)} alt="" width={36} height={36} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                    getOtherName(activeConvData)[0]
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold dark:text-white truncate">{getOtherName(activeConvData)}</p>
                                {activeConvData.productName && (
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                        <Package size={10} /> {activeConvData.productName}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMessages ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={24} className="animate-spin text-orange-500" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10">
                            <MessageCircle size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                            <p className="text-xs text-slate-400 font-bold uppercase">Aucun message</p>
                            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Envoyez le premier message !</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.sender_id === userId
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-2.5 ${
                                        isMine
                                            ? 'bg-orange-500 text-white rounded-[18px] rounded-br-[4px]'
                                            : 'bg-slate-100 dark:bg-white/[0.04] text-slate-900 dark:text-[#F0ECE2] rounded-[18px] rounded-bl-[4px]'
                                    }`}>
                                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                        <p className={`text-[9px] mt-1 ${
                                            isMine ? 'text-white/60' : 'text-slate-400'
                                        }`}>
                                            {formatTime(msg.created_at)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Votre message..."
                            maxLength={1000}
                            className="flex-1 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                            className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-all disabled:opacity-30 disabled:hover:bg-orange-500 flex-shrink-0"
                        >
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── VUE LISTE DES CONVERSATIONS ──
    return (
        <div className="p-4 md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Messages</h2>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">
                    {conversations.length > 0 ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}` : 'Vos conversations'}
                </p>
            </div>

            {loadingConvs ? (
                <div className="py-20 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-orange-500 mb-3" />
                    <p className="text-xs font-black uppercase text-slate-400">Chargement...</p>
                </div>
            ) : conversations.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <MessageCircle size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-xs font-black uppercase italic text-slate-400">Aucune conversation</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-2">
                        Contactez un vendeur depuis la page d'un produit
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {conversations.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => setActiveConversation(conv.id)}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left"
                        >
                            {/* Avatar */}
                            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-orange-500 flex items-center justify-center text-white font-bold">
                                {getOtherAvatar(conv) ? (
                                    <img src={getOtherAvatar(conv)} alt="" width={48} height={48} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                    <span className="text-lg">{getOtherName(conv)[0]}</span>
                                )}
                                {conv.unreadCount > 0 && (
                                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-black dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                        {getOtherName(conv)}
                                    </p>
                                    {conv.lastMessage && (
                                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                                            {formatTime(conv.lastMessage.created_at)}
                                        </span>
                                    )}
                                </div>
                                {conv.productName && (
                                    <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1 truncate">
                                        <Package size={9} /> {conv.productName}
                                    </p>
                                )}
                                {conv.lastMessage && (
                                    <p className={`text-xs truncate mt-0.5 ${
                                        conv.unreadCount > 0 ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400'
                                    }`}>
                                        {conv.lastMessage.sender_id === userId ? 'Vous : ' : ''}
                                        {conv.lastMessage.content}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
