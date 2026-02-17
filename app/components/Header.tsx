'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import AuthModal from '@/app/components/AuthModal'
import CartBadge from './CartBadge'
import SearchBar from './SearchBar'


export default function Header() {
    const [user, setUser] = useState<any>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isDarkMode, setIsDarkMode] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const savedMode = localStorage.getItem('darkMode')
        const prefersDark = savedMode === 'true'
        setIsDarkMode(prefersDark)
        if (prefersDark) document.documentElement.classList.add('dark')
    }, [])

    const toggleDarkMode = () => {
        const newMode = !isDarkMode
        setIsDarkMode(newMode)
        localStorage.setItem('darkMode', String(newMode))
        if (newMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle()
                setUserRole(profile?.role || null)
                setAvatarUrl(profile?.avatar_url || null)
            }
        }
        checkUser()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (!session?.user) {
                setAvatarUrl(null)
                setUserRole(null)
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    // Fermer le menu quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false)
            }
        }
        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showUserMenu])

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut({ scope: 'local' })
        } catch (err) {
            console.error('Erreur signOut:', err)
        }
        setUser(null)
        setAvatarUrl(null)
        setUserRole(null)
        setShowUserMenu(false)
        router.push('/')
        router.refresh()
    }

    return (
        <header className="flex flex-col md:flex-row justify-between items-center p-4 gap-4 border-b bg-white dark:bg-slate-900 dark:border-slate-800 sticky top-0 z-50 transition-colors shadow-sm">
            {/* 1. LOGO (TON IMAGE ORIGINALE) */}
            <Link href="/" className="shrink-0">
                <Image src="/logo.png" alt="Logo" width={128} height={128} className="h-32 w-auto hover:scale-105 transition-transform" />
            </Link>

            {/* 2. BARRE DE RECHERCHE */}
            <SearchBar />

            {/* 3. NAVIGATION DROITE */}
            <nav className="flex items-center gap-5">
                <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all text-xl">
                    {isDarkMode ? '☀️' : '🌙'}
                </button>

                {/* AJOUT DU PANIER ICI */}
                <CartBadge />

                <div className="relative group cursor-pointer">
                    <div className="w-9 h-9 border-2 border-gray-300 dark:border-slate-600 rounded-full flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 group-hover:border-green-600 group-hover:text-green-600 transition-all">?</div>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden text-left">
                        <Link href="/faq" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">🙋‍♂️ FAQ</Link>
                        <Link href="/guide" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">📖 Guide Vendeur</Link>
                        <a href="#" className="block px-4 py-3 text-sm text-green-600 font-bold hover:bg-green-50 dark:hover:bg-slate-700">🟢 Aide WhatsApp</a>
                    </div>
                </div>

                {user ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="relative w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:scale-110 transition-transform overflow-hidden"
                        >
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt="Avatar" fill sizes="40px" className="object-cover" />
                            ) : (
                                <div className="w-full h-full bg-green-600 flex items-center justify-center text-white font-bold">
                                    {user.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </button>
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden text-left">
                                <div className="px-4 py-3 border-b dark:border-slate-700 text-left">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Connecté en tant que</p>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.email}</p>
                                </div>
                                {userRole === 'admin' && (
                                    <Link href="/admin/orders" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-slate-700 border-b dark:border-slate-700">🛡️ Admin Panel</Link>
                                )}
                                {(userRole === 'vendor' || userRole === 'admin') && (
                                    <Link href="/vendor/dashboard" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-green-600 dark:text-green-400 font-bold hover:bg-green-50 dark:hover:bg-slate-700 border-b dark:border-slate-700">🏪 Ma Boutique</Link>
                                )}
                                <Link href="/account/dashboard" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">📊 Mon Dashboard</Link>
                                <Link href="/account/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">👤 Mon Profil</Link>
                                <Link href="/orders" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">📦 Mes Commandes</Link>
                                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t dark:border-slate-700 font-bold">🚪 Déconnexion</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={() => setShowAuthModal(true)} className="bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-700 transition shadow-md text-sm">
                        Connexion
                    </button>
                )}
            </nav>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </header>
    )
}
