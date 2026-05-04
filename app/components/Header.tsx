'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CartBadge from './CartBadge'
import SearchBar from './SearchBar'
import HeaderContactPhones from './HeaderContactPhones'
import TrustBar from './TrustBar'
import { Menu, X, Bell, LayoutGrid, ChevronDown } from 'lucide-react'
import MayombeLogo from './MayombeLogo'

// Lazy load AuthModal — ne se charge que quand l'user clique "Connexion"
const AuthModal = dynamic(() => import('@/app/components/AuthModal'), { ssr: false })
import { getUnreadNotifCount } from '@/app/actions/notifications'
import { useAuth } from '@/hooks/useAuth'
import BecomeVendorCta from '@/app/components/BecomeVendorCta'
import { useRealtime } from '@/hooks/useRealtime'

export default function Header() {
    const { user, profile, supabase } = useAuth()
    const avatarUrl = profile?.avatar_url || null
    const userRole = profile?.role || null
    const [isDarkMode, setIsDarkMode] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [unreadNotifCount, setUnreadNotifCount] = useState(0)
    /** Catégories menu burger (chargées une fois à l’ouverture) */
    /** `null` = pas encore chargé (première ouverture du menu) */
    const [burgerCategories, setBurgerCategories] = useState<{ id: string; name: string }[] | null>(null)
    const [categoriesOpen, setCategoriesOpen] = useState(false)
    const burgerCategoriesLoadedRef = useRef(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        const savedMode = localStorage.getItem('darkMode')
        // Dark mode par défaut si aucune préférence sauvegardée
        const prefersDark = savedMode === null ? true : savedMode === 'true'
        setIsDarkMode(prefersDark)
        if (prefersDark) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }, [])

    const toggleDarkMode = () => {
        const newMode = !isDarkMode
        setIsDarkMode(newMode)
        localStorage.setItem('darkMode', String(newMode))
        if (newMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }

    // Load notification count when user changes
    useEffect(() => {
        if (user) {
            getUnreadNotifCount().then(c => setUnreadNotifCount(c)).catch(() => {})
        } else {
            setUnreadNotifCount(0)
        }
    }, [user?.id])

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

    // Realtime: update bell badge (via shared channel)
    useRealtime('notification:insert', () => {
        setUnreadNotifCount(prev => prev + 1)
    })

    /** Liste des catégories (Supabase `category`) pour le drawer mobile */
    useEffect(() => {
        if (!mobileMenuOpen || !supabase || burgerCategoriesLoadedRef.current) return
        burgerCategoriesLoadedRef.current = true
        supabase
            .from('category')
            .select('id, name')
            .order('name', { ascending: true })
            .then((res: { data: { id: string; name: string }[] | null; error: { message: string } | null }) => {
                const { data, error } = res
                if (!error && Array.isArray(data)) {
                    setBurgerCategories(data)
                } else {
                    setBurgerCategories([])
                }
            })
            .catch(() => {
                setBurgerCategories([])
            })
    }, [mobileMenuOpen, supabase])

    const notifDashboardLink = userRole === 'vendor' || userRole === 'admin'
        ? '/vendor/dashboard?tab=notifs'
        : '/account/dashboard?tab=notifs'

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut({ scope: 'local' })
        } catch (err) {
            console.error('Erreur signOut:', err)
        }
        setShowUserMenu(false)
        router.push('/')
    }

    return (
        <>
        <header className="relative border-b bg-white dark:bg-slate-900 dark:border-slate-800 sticky top-0 z-50 transition-colors shadow-sm">
            <div className="flex items-center justify-between gap-3 py-2 px-3 md:py-2.5 md:px-4 md:gap-4">
                {/* 1. LOGO adaptatif fond clair / fond sombre */}
                <Link href="/" className="shrink-0 flex items-center hover:opacity-90 transition-opacity">
                    <MayombeLogo />
                </Link>

                <div className="hidden md:flex flex-1 min-w-0 items-center gap-3 lg:gap-4 mx-2">
                    <HeaderContactPhones variant="inline" />
                    <div className="flex min-w-0 flex-1 justify-center max-w-xl">
                        <SearchBar compact />
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all text-lg leading-none"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>

                    {user && (
                        <Link href={notifDashboardLink} className="relative p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all">
                            <Bell size={18} className="text-slate-600 dark:text-slate-300" />
                            {unreadNotifCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                                </span>
                            )}
                        </Link>
                    )}

                    <BecomeVendorCta variant="header-desktop" />

                    <CartBadge />

                    <div className="relative group cursor-pointer">
                        <div className="w-8 h-8 border-2 border-gray-300 dark:border-slate-600 rounded-full flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:border-green-600 group-hover:text-green-600 transition-all">
                            ?
                        </div>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden text-left">
                            <Link href="/faq" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">🙋‍♂️ FAQ</Link>
                            <Link href="/guide-vendeur" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-slate-700">📖 Guide Vendeur</Link>
                            <Link href="/orders" className="block px-4 py-3 text-sm text-green-600 font-bold hover:bg-green-50 dark:hover:bg-slate-700">📦 Mes Commandes</Link>
                        </div>
                    </div>

                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="relative w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition-transform overflow-hidden"
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="absolute inset-0 h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
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
                                    {(userRole === 'comptable' || userRole === 'admin') && (
                                        <Link href="/comptable" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-slate-700 border-b dark:border-slate-700">🧾 Bureau Comptable</Link>
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
                        <button
                            type="button"
                            onClick={() => setShowAuthModal(true)}
                            className="rounded-full border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
                        >
                            Connexion
                        </button>
                    )}
                </nav>

                {/* MOBILE: hamburger à gauche est déjà le logo, on met notif + panier + hamburger à droite */}
                <div className="flex md:hidden items-center gap-2">
                    {user && (
                        <Link href={notifDashboardLink} className="relative p-1">
                            <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                            {unreadNotifCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-0.5">
                                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                                </span>
                            )}
                        </Link>
                    )}
                    <CartBadge />
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Menu"
                    >
                        {mobileMenuOpen ? <X size={24} className="text-slate-700 dark:text-slate-200" /> : <Menu size={24} className="text-slate-700 dark:text-slate-200" />}
                    </button>
                </div>
            </div>

            {/* Mobile : barre de recherche pleine largeur (toujours visible, comme Jumia) */}
            <div className="md:hidden border-t border-slate-200/60 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900">
                <SearchBar />
            </div>

            {/* Mobile : numéros visibles (desktop les a entre logo et recherche) */}
            <div className="md:hidden border-t border-slate-200/80 bg-slate-50/80 px-2 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                <HeaderContactPhones variant="banner" />
            </div>

            {/* MOBILE MENU DRAWER */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pb-4 overflow-y-auto max-h-[75vh]">
                    <div className="flex flex-col gap-1 pt-2">
                        <div className="px-0 py-2">
                            <BecomeVendorCta variant="header-mobile" onNavigate={() => setMobileMenuOpen(false)} />
                        </div>

                        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setCategoriesOpen(!categoriesOpen)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/60 dark:bg-slate-900/50 text-left"
                            >
                                <LayoutGrid size={16} className="text-orange-500 shrink-0" />
                                <span className="flex-1 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    Nos catégories
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {categoriesOpen && (
                                <div className="max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain px-1 py-1 border-t border-slate-100 dark:border-slate-800">
                                    {burgerCategories === null && (
                                        <p className="px-3 py-3 text-xs text-slate-500">Chargement…</p>
                                    )}
                                    {burgerCategories !== null && burgerCategories.length === 0 && (
                                        <p className="px-3 py-3 text-xs text-slate-500">Aucune catégorie pour le moment.</p>
                                    )}
                                    {burgerCategories !== null &&
                                        burgerCategories.map((cat) => (
                                            <Link
                                                key={cat.id}
                                                href={`/category/${encodeURIComponent(cat.name)}`}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors no-underline text-sm font-medium text-slate-700 dark:text-slate-200"
                                            >
                                                <span className="truncate">{cat.name}</span>
                                            </Link>
                                        ))}
                                </div>
                            )}
                        </div>

                        <button onClick={toggleDarkMode} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left">
                            <span className="text-lg">{isDarkMode ? '☀️' : '🌙'}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{isDarkMode ? 'Mode clair' : 'Mode sombre'}</span>
                        </button>

                        <Link href="/comment-commander" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors no-underline" style={{ background: "linear-gradient(135deg, rgba(232,168,56,0.08), rgba(232,168,56,0.04))", border: "1px solid rgba(232,168,56,0.2)" }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #E8A838, #D4782F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(232,168,56,0.3)" }}>
                                <span className="text-base">🛒</span>
                            </div>
                            <div>
                                <span className="text-sm font-black text-orange-500 dark:text-orange-400 block">Comment commander ?</span>
                                <span className="text-xs text-slate-400">Guide visuel étape par étape</span>
                            </div>
                            <span className="ml-auto text-orange-400 text-sm">→</span>
                        </Link>

                        <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors no-underline">
                            <span className="text-lg">🙋‍♂️</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">FAQ</span>
                        </Link>

                        <Link href="/guide-vendeur" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors no-underline">
                            <span className="text-lg">📖</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Guide Vendeur</span>
                        </Link>

                        <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors no-underline">
                            <span className="text-lg">📦</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400 font-bold">Mes Commandes</span>
                        </Link>

                        <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />

                        {user ? (
                            <>
                                <div className="px-3 py-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Connecté en tant que</p>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.email}</p>
                                </div>
                                {userRole === 'admin' && (
                                    <Link href="/admin/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors no-underline">
                                        <span className="text-lg">🛡️</span>
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">Admin Panel</span>
                                    </Link>
                                )}
                                {(userRole === 'comptable' || userRole === 'admin') && (
                                    <Link href="/comptable" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors no-underline">
                                        <span className="text-lg">🧾</span>
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Bureau Comptable</span>
                                    </Link>
                                )}
                                {(userRole === 'vendor' || userRole === 'admin') && (
                                    <Link href="/vendor/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-green-50 dark:hover:bg-slate-800 transition-colors no-underline">
                                        <span className="text-lg">🏪</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">Ma Boutique</span>
                                    </Link>
                                )}
                                <Link href="/account/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors no-underline">
                                    <span className="text-lg">📊</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mon Dashboard</span>
                                </Link>
                                <Link href="/account/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors no-underline">
                                    <span className="text-lg">👤</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mon Profil</span>
                                </Link>
                                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left w-full border-none bg-transparent cursor-pointer">
                                    <span className="text-lg">🚪</span>
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">Déconnexion</span>
                                </button>
                            </>
                        ) : (
                            <button onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }} className="mt-2 w-full cursor-pointer rounded-full border border-neutral-900 bg-neutral-900 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white">
                                Connexion
                            </button>
                        )}
                    </div>
                </div>
            )}

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </header>
        <TrustBar />
        </>
    )
}
