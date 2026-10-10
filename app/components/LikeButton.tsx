'use client'
import { useState, useCallback, useRef } from 'react'
import { Heart } from 'lucide-react'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

/**
 * Bouton favori — chargement différé (lazy).
 *
 * N+1 éliminé : aucun appel Supabase au montage. Le statut favori est chargé
 * seulement lors du premier survol ou du premier clic, évitant 2 requêtes × N
 * produits sur chaque page catalogue (typiquement 30–60 requêtes en moins).
 */
export default function LikeButton({ productId }: { productId: string }) {
    const [isLiked, setIsLiked] = useState(false)
    const [ready, setReady] = useState(false)
    const [busy, setBusy] = useState(false)
    const supabase = getSupabaseBrowserClient()
    const initiated = useRef(false)

    const initStatus = useCallback(async () => {
        if (initiated.current) return
        initiated.current = true
        try {
            const { user } = await safeGetUser(supabase)
            if (user) {
                const { data } = await supabase
                    .from('favorites')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('product_id', productId)
                    .maybeSingle()
                setIsLiked(!!data)
            }
        } catch {
            // Silencieux — état par défaut = non aimé
        } finally {
            setReady(true)
        }
    }, [productId, supabase])

    const toggleLike = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (busy) return
        setBusy(true)

        // Charge le statut si pas encore fait
        if (!initiated.current) {
            await initStatus()
        }

        try {
            const { user } = await safeGetUser(supabase)
            if (!user) {
                alert('Connectez-vous pour ajouter aux favoris')
                return
            }
            if (isLiked) {
                await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId)
                setIsLiked(false)
            } else {
                await supabase.from('favorites').insert({ user_id: user.id, product_id: productId })
                setIsLiked(true)
            }
        } catch {
            // Silencieux
        } finally {
            setBusy(false)
        }
    }, [busy, initStatus, isLiked, productId, supabase])

    const showActive = ready && isLiked

    return (
        <button
            onClick={toggleLike}
            onMouseEnter={initStatus}
            onFocus={initStatus}
            disabled={busy}
            aria-label={showActive ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`p-2 rounded-full transition-all ${
                showActive
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-white/90 text-slate-400 hover:text-red-500 shadow-sm'
            }`}
        >
            <Heart size={20} fill={showActive ? 'currentColor' : 'none'} />
        </button>
    )
}
