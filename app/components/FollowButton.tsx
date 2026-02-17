'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Bell, BellRing, Loader2 } from 'lucide-react'

interface FollowButtonProps {
    sellerId: string
    onFollowChange?: (delta: number) => void
}

export default function FollowButton({ sellerId, onFollowChange }: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const checkFollow = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (!user || !sellerId) {
                    setChecking(false)
                    return
                }

                setCurrentUserId(user.id)

                const { data } = await supabase
                    .from('seller_follows')
                    .select('id')
                    .eq('follower_id', user.id)
                    .eq('seller_id', sellerId)
                    .maybeSingle()

                if (data) setIsFollowing(true)
            } catch (err) {
                console.error("Erreur check follow:", err)
            } finally {
                setChecking(false)
            }
        }
        checkFollow()
    }, [sellerId])

    const updateFollowerCount = async () => {
        try {
            // Compter le vrai nombre de followers pour être précis
            const { count } = await supabase
                .from('seller_follows')
                .select('id', { count: 'exact', head: true })
                .eq('seller_id', sellerId)

            await supabase
                .from('profiles')
                .update({ followers_count: count ?? 0 })
                .eq('id', sellerId)
        } catch (err) {
            console.error("Erreur mise à jour compteur followers:", err)
        }
    }

    const toggleFollow = async (e: React.MouseEvent) => {
        e.preventDefault()

        if (!currentUserId) return alert("Connectez-vous pour suivre ce vendeur")
        if (currentUserId === sellerId) return alert("Vous ne pouvez pas vous abonner à vous-même")

        setLoading(true)

        try {
            if (isFollowing) {
                await supabase
                    .from('seller_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('seller_id', sellerId)

                setIsFollowing(false)
                await updateFollowerCount()
                onFollowChange?.(-1)
            } else {
                await supabase
                    .from('seller_follows')
                    .insert([{ follower_id: currentUserId, seller_id: sellerId }])

                setIsFollowing(true)
                await updateFollowerCount()
                onFollowChange?.(1)
            }
        } catch (err) {
            alert("Une erreur est survenue.")
        } finally {
            setLoading(false)
        }
    }

    if (checking) return <div className="h-10 w-28 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-full" />

    return (
        <button
            onClick={toggleFollow}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest transition-all shadow-sm border ${isFollowing
                ? 'bg-orange-500 text-white border-orange-600 shadow-orange-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
        >
            {loading ? (
                <Loader2 size={14} className="animate-spin" />
            ) : isFollowing ? (
                <BellRing size={14} className="animate-bounce" />
            ) : (
                <Bell size={14} />
            )}
            {isFollowing ? 'Abonné' : 'Suivre le vendeur'}
        </button>
    )
}
