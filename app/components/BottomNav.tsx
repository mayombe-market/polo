'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Cake, UtensilsCrossed, Building2, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
    {
        label: 'Accueil',
        href: '/',
        icon: Home,
        match: (p: string) => p === '/' || p === '/marketplace',
    },
    {
        label: 'Pâtisserie',
        href: '/patisserie',
        icon: Cake,
        match: (p: string) => p.startsWith('/patisserie'),
    },
    {
        label: 'Restaurant',
        href: '/restaurant',
        icon: UtensilsCrossed,
        match: (p: string) => p.startsWith('/restaurant'),
    },
    {
        label: 'Immobilier',
        href: '/category/Immobilier',
        icon: Building2,
        match: (p: string) => p.startsWith('/category/Immobilier') || p.startsWith('/category/immobilier'),
    },
    {
        label: 'Compte',
        href: '/vendor/dashboard',
        icon: User,
        match: (p: string) => p.startsWith('/vendor') || p.startsWith('/login') || p.startsWith('/signup'),
    },
]

// Pages où la barre est masquée
function shouldHide(pathname: string): boolean {
    if (pathname.startsWith('/checkout') || pathname === '/cart') return true
    // Pages boutique pâtisserie (ont leur propre bottom bar avec le panier)
    if (/^\/patisserie\/[^/]+/.test(pathname)) return true
    return false
}

export default function BottomNav() {
    const pathname = usePathname()
    const { profile } = useAuth()

    if (shouldHide(pathname)) return null

    const accountHref = profile ? '/vendor/dashboard' : '/login'

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-stretch h-16 max-w-lg mx-auto">
                {NAV_ITEMS.map(({ label, href, icon: Icon, match }) => {
                    const resolvedHref = label === 'Compte' ? accountHref : href
                    const active = match(pathname)
                    return (
                        <Link
                            key={label}
                            href={resolvedHref}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors group cursor-pointer"
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                active ? 'bg-amber-900 shadow-sm shadow-amber-900/30' : 'group-hover:bg-neutral-100'
                            }`}>
                                <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                            </div>
                            <span className={`text-[10px] font-bold transition-colors leading-none ${
                                active ? 'text-amber-900' : 'text-neutral-400 group-hover:text-neutral-600'
                            }`}>
                                {label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
