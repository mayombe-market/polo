'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AccountRedirect() {
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        const redirect = async () => {
            const { user } = await safeGetUser(supabase)

            if (!user) {
                router.replace('/')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            if (profile?.role === 'vendor') {
                router.replace('/vendor/dashboard')
            } else {
                router.replace('/account/dashboard')
            }
        }
        redirect()
    }, [])

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <p className="font-black uppercase italic text-slate-400 animate-pulse">Redirection...</p>
        </div>
    )
}
