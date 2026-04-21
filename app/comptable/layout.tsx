'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Toaster } from 'sonner'
import ComptableNav from './ComptableNav'
import { Loader2 } from 'lucide-react'

export default function ComptableLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        const check = async () => {
            const supabase = getSupabaseBrowserClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile || !['comptable', 'admin'].includes(profile.role)) {
                router.replace('/')
                return
            }
            setAuthorized(true)
        }
        check()
    }, [router])

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 size={32} className="animate-spin text-green-500" />
            </div>
        )
    }

    return (
        <>
            <ComptableNav />
            <Toaster position="top-right" richColors closeButton />
            {children}
        </>
    )
}
