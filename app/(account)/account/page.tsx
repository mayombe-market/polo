'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AccountRedirect() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const redirect = async () => {
            const { data: { user } } = await supabase.auth.getUser()

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
