'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    User,
    MapPin,
    Settings,
    LogOut,
    ShoppingBag
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const menuItems = [
        { name: 'Vue d’ensemble', href: '/account/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Mon Profil', href: '/account/profile', icon: <User size={18} /> },
        { name: 'Mes Adresses', href: '/account/addresses', icon: <MapPin size={18} /> },
        { name: 'Sécurité', href: '/account/settings', icon: <Settings size={18} /> },
    ]

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            router.push('/')
            router.refresh()
        } catch (err) {
            console.error('Erreur déconnexion:', err)
        }
    }

    return (
        <>
        <Header />
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
            {/* BARRE DE NAVIGATION (SIDEBAR SUR DESKTOP / TOPBAR SUR MOBILE) */}
            <aside className="w-full md:w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between">
                <div className="space-y-8">
                    {/* Logo / Home Link */}
                    <Link href="/" className="flex items-center gap-2 px-4">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black italic">M</div>
                        <span className="font-black uppercase italic tracking-tighter">Mon Compte</span>
                    </Link>

                    {/* Menu Principal */}
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 p-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest transition-all ${isActive
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Actions secondaires */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <Link
                        href="/orders"
                        className="flex items-center gap-3 p-4 text-slate-500 font-black uppercase italic text-[10px] hover:text-orange-500 transition-colors"
                    >
                        <ShoppingBag size={18} /> Mes Commandes
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-4 text-red-500 font-black uppercase italic text-[10px] hover:bg-red-50 rounded-2xl transition-all"
                    >
                        <LogOut size={18} /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* CONTENU DE LA PAGE */}
            <main className="flex-1 p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
                {children}
            </main>
        </div>
        </>
    )
}