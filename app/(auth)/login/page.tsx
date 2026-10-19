'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'

const AuthModal = dynamic(() => import('@/app/components/AuthModal'), { ssr: false })

function LoginContent() {
    const { user } = useAuth()
    const router = useRouter()
    const params = useSearchParams()
    const next = params.get('next') || '/account'

    useEffect(() => {
        if (user) router.replace(next)
    }, [user, router, next])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <AuthModal isOpen={true} onClose={() => router.back()} nextPath={next} />
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    )
}
