'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import AuthModal from '@/app/components/AuthModal'
import { useRouter } from 'next/navigation'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null)
    const [isDarkMode, setIsDarkMode] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Charger le mode sombre depuis le localStorage au montage
    useEffect(() => {
        setMounted(true)
        const savedMode = localStorage.getItem('darkMode')
        const prefersDark = savedMode === 'true'

        setIsDarkMode(prefersDark)
        if (prefersDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    // Toggle avec sauvegarde
    const toggleDarkMode = () => {
        const newMode = !isDarkMode
        setIsDarkMode(newMode)
        localStorage.setItem('darkMode', String(newMode))

        if (newMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    // Vérifier l'utilisateur connecté
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        checkUser()

        // Écouter les changements d'auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // Fonction de déconnexion
    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setShowUserMenu(false)
        router.push('/')
    }

    // Éviter le flash de contenu avant le montage
    if (!mounted) {
        return null
    }

    return (
        <section className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500">

            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-center p-4 gap-4 border-b bg-white dark:bg-slate-900 dark:border-slate-800 sticky top-0 z-50 transition-colors shadow-sm">

                {/* 1. LOGO */}
                <Link href="/" className="shrink-0">
                    <img src="/logo.png" alt="Logo" className="h-32 w-auto hover:scale-105 transition-transform" />
                </Link>

                {/* 2. BARRE DE RECHERCHE */}
                <div className="flex-grow max-w-xl w-full mx-4">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Rechercher sur Mayombe Market..."
                            className="w-full bg-gray-100 dark:bg-slate-800 dark:text-white border-none rounded-full py-2.5 px-11 focus:ring-2 focus:ring-green-500 transition-all outline-none text-sm"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>
                </div>

                {/* 3. NAVIGATION DROITE */}
                <nav className="flex items-center gap-5">

                    {/* BOUTON MODE SOMBRE */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all text-xl"
                        aria-label="Toggle dark mode"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>

                    {/* MENU AIDE (?) */}
                    <div className="relative group cursor-pointer">
                        <div className="w-9 h-9 border-2 border-gray-300 dark:border-slate-600 rounded-full flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 group-hover:border-green-600 group-hover:text-green-600 transition-all">
                            ?
                        </div>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                            <Link href="/faq" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">🙋‍♂️ FAQ</Link>
                            <Link href="/guide" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">📖 Guide Vendeur</Link>
                            <a href="https://wa.me/ton-numero" className="block px-4 py-3 text-sm text-green-600 font-bold hover:bg-green-50 dark:hover:bg-slate-700">🟢 Aide WhatsApp</a>
                        </div>
                    </div>

                    {/* PROFIL / CONNEXION AVEC MENU DÉROULANT */}
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm hover:scale-110 transition-transform"
                            >
                                {user.email?.[0]?.toUpperCase() || 'U'}
                            </button>

                            {/* MENU DÉROULANT */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                    {/* HEADER DU MENU */}
                                    <div className="px-4 py-3 border-b dark:border-slate-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Connecté en tant que</p>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.email}</p>
                                    </div>

                                    {/* OPTIONS DU MENU */}
                                    <Link
                                        href="/vendor/dashboard"
                                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        🏪 Mon Dashboard
                                    </Link>
                                    <Link
                                        href="/profile"
                                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        👤 Mon Profil
                                    </Link>
                                    <Link
                                        href="/orders"
                                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        📦 Mes Commandes
                                    </Link>

                                    {/* DÉCONNEXION */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t dark:border-slate-700 font-bold"
                                    >
                                        🚪 Déconnexion
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-700 transition shadow-md text-sm"
                        >
                            Connexion
                        </button>
                    )}
                </nav>
            </header>

            {/* CONTENU DE LA PAGE */}
            <main className="flex-grow transition-colors duration-500">
                {children}
            </main>

            {/* FOOTER */}
            <footer className="p-6 border-t bg-gray-50 dark:bg-slate-900 dark:border-slate-800 text-center text-gray-400 text-sm">
                © 2026 Mayombe Market - Tous droits réservés
            </footer>

            {/* MODAL D'AUTHENTIFICATION */}
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </section>
    )
}