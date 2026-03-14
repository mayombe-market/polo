'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { safeGetUser } from '@/lib/supabase-utils'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { toggleFollow } from '@/app/actions/follows'

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
                const user = await safeGetUser(supabase)

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

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault()

        if (!currentUserId) return alert("Connectez-vous pour suivre ce vendeur")
        if (currentUserId === sellerId) return alert("Vous ne pouvez pas vous abonner à vous-même")

        setLoading(true)

        try {
            const result = await toggleFollow(sellerId)
            setIsFollowing(result.isFollowing)
            onFollowChange?.(result.isFollowing ? 1 : -1)
        } catch (err) {
            alert("Une erreur est survenue.")
        } finally {
            setLoading(false)
        }
    }

    if (checking) return <div className="h-10 w-28 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-full" />

    return (
        <button
            onClick={handleToggle}
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
