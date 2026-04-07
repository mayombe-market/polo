'use client'

import { useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { getOrCreateConversation, getOrCreateRealEstateAdminConversation } from '@/app/actions/messages'
import { useRouter } from 'next/navigation'

const MessageButton = ({
    sellerId,
    productId,
    user,
    /** Immobilier : la conversation est créée avec un compte `role = admin`, pas l’annonceur. */
    realEstateContactAdmin,
    viewerIsAdmin,
    /** Libellé affiché (défaut : « Contacter »). */
    label = 'Contacter',
    /** Surcharge des classes Tailwind du bouton (ex. variante primaire fiche immo). */
    className,
}: {
    sellerId: string
    productId?: string
    user: any
    realEstateContactAdmin?: boolean
    viewerIsAdmin?: boolean
    label?: string
    className?: string
}) => {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const isOwnProduct = user?.id === sellerId

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user) {
            alert(
                realEstateContactAdmin
                    ? 'Connectez-vous pour contacter l’équipe Mayombe Market.'
                    : 'Connectez-vous pour contacter le vendeur.',
            )
            return
        }

        if (isOwnProduct) return

        if (realEstateContactAdmin && !productId) {
            alert('Annonce invalide pour la messagerie.')
            return
        }

        setLoading(true)
        try {
            const result = realEstateContactAdmin
                ? await getOrCreateRealEstateAdminConversation(productId!)
                : await getOrCreateConversation(sellerId, productId)

            if (result.error) {
                alert(result.error)
                return
            }

            if ('conversation' in result && result.conversation) {
                router.push(`/account/dashboard?tab=messages&conv=${result.conversation.id}`)
            }
        } catch (err) {
            console.error('Erreur messagerie:', err)
            alert('Une erreur est survenue. Réessayez.')
        } finally {
            setLoading(false)
        }
    }

    if (isOwnProduct) return null

    if (realEstateContactAdmin && viewerIsAdmin) return null

    const defaultClassName =
        'flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50'

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            type="button"
            className={className ?? defaultClassName}
        >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
            {label}
        </button>
    )
}

export default MessageButton
