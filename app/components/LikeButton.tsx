'use client'
import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LikeButton({ productId }: { productId: string }) {
    const [isLiked, setIsLiked] = useState(false)
    const [loading, setLoading] = useState(true)
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        const checkLike = async () => {
            try {
                const { user } = await safeGetUser(supabase)
                if (user) {
                    const { data } = await supabase
                        .from('favorites')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('product_id', productId)
                        .maybeSingle()
                    setIsLiked(!!data)
                }
            } catch (err) {
                console.error("Erreur check like:", err)
            } finally {
                setLoading(false)
            }
        }
        checkLike()
    }, [productId])

    const toggleLike = async (e: React.MouseEvent) => {
        e.preventDefault()
        const { user } = await safeGetUser(supabase)
        if (!user) return alert("Connectez-vous pour ajouter aux favoris")

        if (isLiked) {
            await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId)
            setIsLiked(false)
        } else {
            await supabase.from('favorites').insert({ user_id: user.id, product_id: productId })
            setIsLiked(true)
        }
    }

    return (
        <button
            onClick={toggleLike}
            disabled={loading}
            className={`p-2 rounded-full transition-all ${isLiked
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white/90 text-slate-400 hover:text-red-500 shadow-sm'
                }`}
        >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
        </button>
    )
}
