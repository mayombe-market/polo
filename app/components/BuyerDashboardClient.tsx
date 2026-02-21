'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useCart } from '@/hooks/userCart'
import {
    LayoutDashboard, Package, Heart, ShoppingCart, Store,
    Bell, MapPin, User, Settings, ChevronLeft, ChevronRight,
    Eye, EyeOff, Loader2, Trash2, Plus, Minus, Save,
    Clock, CheckCircle2, Truck, LogOut, Lock, Camera,
    Phone, Home, Navigation, ShieldCheck, AlertCircle,
    ArrowUpRight, BellRing, X, Moon, Sun, Globe,
    Smartphone, Volume2, Tag, TruckIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { useRouter } from 'next/navigation'

type Page = 'home' | 'orders' | 'wishlist' | 'cart' | 'following' | 'notifs' | 'addresses' | 'profile' | 'settings'

const MENU: { id: Page; icon: any; label: string }[] = [
    { id: 'home', icon: LayoutDashboard, label: 'Accueil' },
    { id: 'orders', icon: Package, label: 'Mes commandes' },
    { id: 'wishlist', icon: Heart, label: 'Favoris' },
    { id: 'cart', icon: ShoppingCart, label: 'Mon panier' },
    { id: 'following', icon: Store, label: 'Boutiques suivies' },
    { id: 'notifs', icon: Bell, label: 'Notifications' },
    { id: 'addresses', icon: MapPin, label: 'Mes adresses' },
    { id: 'profile', icon: User, label: 'Mon profil' },
    { id: 'settings', icon: Settings, label: 'Paramètres' },
]

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function BuyerDashboardClient({ user, profile: initialProfile }: { user: any; profile: any }) {
    const router = useRouter()
    const [activePage, setActivePage] = useState<Page>('home')
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // Data
    const [orders, setOrders] = useState<any[]>([])
    const [favorites, setFavorites] = useState<any[]>([])
    const [followedShops, setFollowedShops] = useState<any[]>([])
    const [profile, setProfile] = useState(initialProfile || {})
    const [address, setAddress] = useState({ city: '', district: '', landmark: '' })
    const [dataLoading, setDataLoading] = useState(true)

    // Cart hook
    const { cart, total, itemCount, updateQuantity, removeFromCart } = useCart()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // ===== NOTIFICATION SOUND + BROWSER PUSH =====
    const audioCtxRef = useRef<AudioContext | null>(null)

    useEffect(() => {
        // Demander la permission pour les notifications navigateur
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [])

    const playNotificationSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
            const ctx = audioCtxRef.current
            const now = ctx.currentTime

            // Note 1 : tonalité aiguë courte
            const osc1 = ctx.createOscillator()
            const gain1 = ctx.createGain()
            osc1.type = 'sine'
            osc1.frequency.setValueAtTime(880, now)
            gain1.gain.setValueAtTime(0.3, now)
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
            osc1.connect(gain1).connect(ctx.destination)
            osc1.start(now)
            osc1.stop(now + 0.15)

            // Note 2 : tonalité plus haute (intervalle de quinte)
            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.type = 'sine'
            osc2.frequency.setValueAtTime(1320, now + 0.15)
            gain2.gain.setValueAtTime(0.3, now + 0.15)
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
            osc2.connect(gain2).connect(ctx.destination)
            osc2.start(now + 0.15)
            osc2.stop(now + 0.35)
        } catch {}
    }, [])

    const sendNotification = useCallback((title: string, body: string) => {
        const prefs = JSON.parse(localStorage.getItem('mayombe_prefs') || '{}')

        // Son
        if (prefs.notifOrders !== false) {
            playNotificationSound()
        }

        // Notification navigateur
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
            })
        }
    }, [playNotificationSound])

    // Badges
    const activeOrdersCount = orders.filter(o => ['confirmed', 'shipped'].includes(o.status)).length
    const getBadge = (id: Page): number | null => {
        if (id === 'orders' && activeOrdersCount > 0) return activeOrdersCount
        if (id === 'wishlist' && favorites.length > 0) return favorites.length
        if (id === 'cart' && itemCount > 0) return itemCount
        return null
    }

    // ===== FETCH ALL DATA =====
    useEffect(() => {
        if (!user?.id) return
        const fetchAll = async () => {
            // Orders
            try {
                const { data } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                setOrders(data || [])
            } catch (err) { console.error('Erreur commandes:', err) }

            // Favorites
            try {
                const { data } = await supabase
                    .from('favorites')
                    .select('product_id, products(*)')
                    .eq('user_id', user.id)
                if (data) setFavorites(data.map((f: any) => ({ ...f.products, fav_id: f.product_id })))
            } catch (err) { console.error('Erreur favoris:', err) }

            // Followed shops
            try {
                const { data } = await supabase
                    .from('seller_follows')
                    .select('seller_id, profiles(id, store_name, shop_name, avatar_url, city, followers_count)')
                    .eq('follower_id', user.id)
                if (data) setFollowedShops(data.map((f: any) => f.profiles).filter(Boolean))
            } catch (err) { console.error('Erreur boutiques:', err) }

            // Address
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('city, district, landmark')
                    .eq('id', user.id)
                    .single()
                if (data) setAddress({ city: data.city || '', district: data.district || '', landmark: data.landmark || '' })
            } catch (err) { console.error('Erreur adresse:', err) }

            setDataLoading(false)
        }
        fetchAll()
    }, [user?.id])

    // ===== REAL-TIME ORDERS =====
    useEffect(() => {
        if (!user?.id) return
        const channel = supabase
            .channel('buyer-orders')
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'orders',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                const updated = payload.new as any
                setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
                const labels: Record<string, string> = { confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée' }
                const label = labels[updated.status]
                if (label) {
                    toast.success(formatOrderNumber(updated), { description: `Statut : ${label}` })
                    sendNotification(
                        `Commande ${formatOrderNumber(updated)}`,
                        `Votre commande est maintenant : ${label}`
                    )
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user?.id])

    // Logout
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const userName = profile?.full_name || user?.email?.split('@')[0] || 'Client'
    const initials = userName.slice(0, 2).toUpperCase()

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            {/* ===== SIDEBAR DESKTOP ===== */}
            <aside className={`hidden md:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-300 sticky top-0 h-screen`}>
                <div className="p-6 flex items-center justify-between">
                    {sidebarOpen && (
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Mon Espace</h1>
                            <p className="text-[8px] font-black uppercase text-orange-500 tracking-[0.2em]">Mayombe Market</p>
                        </div>
                    )}
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors">
                        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {MENU.map(item => {
                        const Icon = item.icon
                        const isActive = activePage === item.id
                        const badge = getBadge(item.id)
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActivePage(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative ${isActive
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                {sidebarOpen && <span>{item.label}</span>}
                                {badge && (
                                    <span className={`${sidebarOpen ? 'ml-auto' : 'absolute -top-1 -right-1'} min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${isActive ? 'bg-white text-orange-500' : 'bg-red-500 text-white'}`}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Logout + Profile */}
                <div className="px-3 pb-4 space-y-2">
                    {sidebarOpen && (
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                            <LogOut size={20} /> Déconnexion
                        </button>
                    )}
                    {sidebarOpen && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-sm">
                                    {profile?.avatar_url ? (
                                        <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                                    ) : initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black truncate dark:text-white">{userName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Client</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ===== MOBILE BOTTOM NAV ===== */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-50 flex justify-around py-2 px-1 safe-area-bottom">
                {MENU.slice(0, 5).map(item => {
                    const Icon = item.icon
                    const isActive = activePage === item.id
                    const badge = getBadge(item.id)
                    return (
                        <button key={item.id} onClick={() => setActivePage(item.id)} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                            <Icon size={20} />
                            <span className="text-[8px] font-black uppercase">{item.label.split(' ').pop()}</span>
                            {badge && <span className="absolute -top-1 right-0 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">{badge}</span>}
                        </button>
                    )
                })}
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 pb-24 md:pb-0 overflow-y-auto">
                {activePage === 'home' && <BuyerHome user={user} profile={profile} orders={orders} favorites={favorites} followedShops={followedShops} cartCount={itemCount} onNavigate={setActivePage} dataLoading={dataLoading} />}
                {activePage === 'orders' && <BuyerOrders orders={orders} />}
                {activePage === 'wishlist' && <BuyerWishlist favorites={favorites} setFavorites={setFavorites} userId={user?.id} />}
                {activePage === 'cart' && <BuyerCart cart={cart} total={total} itemCount={itemCount} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />}
                {activePage === 'following' && <FollowingPage shops={followedShops} />}
                {activePage === 'notifs' && <NotificationsPage orders={orders} />}
                {activePage === 'addresses' && <AddressesPage address={address} setAddress={setAddress} userId={user?.id} />}
                {activePage === 'profile' && <ProfilePage profile={profile} setProfile={setProfile} userId={user?.id} />}
                {activePage === 'settings' && <SettingsPage />}
            </main>
        </div>
    )
}

// =====================================================================
// BUYER HOME
// =====================================================================
function BuyerHome({ user, profile, orders, favorites, followedShops, cartCount, onNavigate, dataLoading }: any) {
    const activeOrders = orders.filter((o: any) => ['confirmed', 'shipped'].includes(o.status))
    const deliveredOrders = orders.filter((o: any) => o.status === 'delivered')

    const quickStats = [
        { icon: Package, label: 'Commandes', value: orders.length, sub: `${activeOrders.length} en cours`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', page: 'orders' as Page },
        { icon: Heart, label: 'Favoris', value: favorites.length, sub: 'articles sauvegardés', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', page: 'wishlist' as Page },
        { icon: Store, label: 'Boutiques', value: followedShops.length, sub: 'suivies', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', page: 'following' as Page },
        { icon: ShoppingCart, label: 'Panier', value: cartCount, sub: 'articles', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', page: 'cart' as Page },
    ]

    const userName = profile?.full_name || user?.email?.split('@')[0] || 'Client'

    const statusMap: Record<string, { label: string; color: string }> = {
        confirmed: { label: 'Confirmée', color: 'text-blue-600 bg-blue-50' },
        shipped: { label: 'En livraison', color: 'text-orange-600 bg-orange-50' },
        delivered: { label: 'Livrée', color: 'text-green-600 bg-green-50' },
        pending: { label: 'En attente', color: 'text-yellow-600 bg-yellow-50' },
    }

    const getProgress = (status: string) => {
        switch (status) {
            case 'pending': return 15
            case 'confirmed': return 40
            case 'shipped': return 75
            case 'delivered': return 100
            default: return 0
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter dark:text-white">
                    Salut, {userName} 👋
                </h1>
                <p className="text-sm text-slate-400 font-bold mt-1">Voici votre espace personnel</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {quickStats.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <button key={i} onClick={() => onNavigate(stat.page)} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 text-left hover:border-orange-300 transition-all group">
                            <div className={`w-10 h-10 ${stat.bg} rounded-2xl flex items-center justify-center mb-3`}>
                                <Icon size={20} className={stat.color} />
                            </div>
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                            <p className={`text-[10px] font-bold ${stat.color} mt-1`}>{stat.sub}</p>
                        </button>
                    )
                })}
            </div>

            {/* Active orders */}
            {activeOrders.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black uppercase text-sm dark:text-white">Commandes en cours</h3>
                        <button onClick={() => onNavigate('orders')} className="text-[10px] font-black uppercase text-orange-500 hover:underline">Tout voir</button>
                    </div>
                    <div className="space-y-4">
                        {activeOrders.slice(0, 3).map((order: any) => {
                            const progress = getProgress(order.status)
                            const st = statusMap[order.status] || statusMap.pending
                            const firstItem = order.items?.[0]
                            return (
                                <div key={order.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-4 mb-4">
                                        {firstItem?.img && (
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                <Image src={firstItem.img} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black dark:text-white truncate">{firstItem?.name || 'Commande'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{formatOrderNumber(order)}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black text-orange-500">{fmt(order.total_amount)} F</p>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-[10px] text-slate-400 font-bold">Progression</span>
                                            <span className="text-[10px] text-orange-500 font-black">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-2 text-[8px] font-bold">
                                            <span className={progress >= 15 ? 'text-green-500' : 'text-slate-300'}>Commandé</span>
                                            <span className={progress >= 40 ? 'text-green-500' : 'text-slate-300'}>Confirmé</span>
                                            <span className={progress >= 75 ? 'text-orange-500' : 'text-slate-300'}>En route</span>
                                            <span className={progress >= 100 ? 'text-green-500' : 'text-slate-300'}>Livré</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/" className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-orange-300 transition-all text-left group">
                    <Store size={24} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-black text-sm dark:text-white uppercase">Explorer le marché</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Découvrir de nouveaux produits</p>
                </Link>
                <button onClick={() => onNavigate('wishlist')} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-red-300 transition-all text-left group">
                    <Heart size={24} className="text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-black text-sm dark:text-white uppercase">Mes favoris</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{favorites.length} articles sauvegardés</p>
                </button>
                <button onClick={() => onNavigate('profile')} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 transition-all text-left group">
                    <User size={24} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-black text-sm dark:text-white uppercase">Mon profil</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Gérer mes informations</p>
                </button>
            </div>
        </div>
    )
}

// =====================================================================
// ORDERS PAGE
// =====================================================================
function BuyerOrders({ orders }: { orders: any[] }) {
    const [tab, setTab] = useState('all')

    const tabs = [
        { id: 'all', label: 'Toutes', count: orders.length },
        { id: 'active', label: 'En cours', count: orders.filter(o => ['pending', 'confirmed', 'shipped'].includes(o.status)).length },
        { id: 'delivered', label: 'Livrées', count: orders.filter(o => o.status === 'delivered').length },
    ]

    const filtered = tab === 'all' ? orders
        : tab === 'active' ? orders.filter(o => ['pending', 'confirmed', 'shipped'].includes(o.status))
            : orders.filter(o => o.status === tab)

    const statusMap: Record<string, { label: string; style: string }> = {
        pending: { label: 'En attente', style: 'bg-yellow-100 text-yellow-700' },
        confirmed: { label: 'Confirmée', style: 'bg-blue-100 text-blue-700' },
        shipped: { label: 'En livraison', style: 'bg-orange-100 text-orange-700' },
        delivered: { label: 'Livrée', style: 'bg-green-100 text-green-700' },
        rejected: { label: 'Rejetée', style: 'bg-red-100 text-red-700' },
    }

    const steps = [
        { id: 'pending', label: 'En attente', icon: Clock },
        { id: 'confirmed', label: 'Confirmé', icon: CheckCircle2 },
        { id: 'shipped', label: 'En route', icon: Truck },
        { id: 'delivered', label: 'Livré', icon: Package },
    ]

    return (
        <div className="p-4 md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Mes commandes</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Suivez vos achats en temps réel</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-6">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border flex items-center gap-2 ${tab === t.id
                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}>
                        {t.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${tab === t.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>{t.count}</span>
                    </button>
                ))}
            </div>

            {filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((order: any) => {
                        const st = statusMap[order.status] || statusMap.pending
                        const currentStepIndex = steps.findIndex(s => s.id === order.status)
                        return (
                            <div key={order.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-md transition-all">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{formatOrderNumber(order)}</p>
                                        <p className="text-xl font-black italic dark:text-white mt-1">
                                            {fmt(order.total_amount)} <small className="text-[10px]">FCFA</small>
                                        </p>
                                        <div className="flex gap-3 mt-1 text-[10px] text-slate-400 font-bold">
                                            <span>{new Date(order.created_at).toLocaleDateString('fr-FR')} à {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${order.payment_method === 'mobile_money' ? 'bg-yellow-100 text-yellow-600' : order.payment_method === 'airtel_money' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {order.payment_method === 'mobile_money' ? 'MoMo' : order.payment_method === 'airtel_money' ? 'Airtel' : 'Cash'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${st.style}`}>{st.label}</span>
                                </div>

                                {/* Progress timeline */}
                                {order.status !== 'rejected' && (
                                    <div className="relative flex justify-between items-center mb-6 px-2">
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%` }} />
                                        {steps.map((step, idx) => {
                                            const Icon = step.icon
                                            const done = idx <= currentStepIndex
                                            return (
                                                <div key={step.id} className="flex flex-col items-center gap-1.5 relative z-10">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${done ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <span className={`text-[7px] font-black uppercase ${done ? 'text-orange-500' : 'text-slate-400'}`}>{step.label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Items */}
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {order.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                                            <Image src={item.img || '/placeholder-image.jpg'} alt={item.name || ''} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                                            <div>
                                                <p className="text-[9px] font-black uppercase truncate max-w-[120px] dark:text-white">{item.name}</p>
                                                <p className="text-[8px] text-slate-400 font-bold">x{item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <Package size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-sm font-black uppercase italic text-slate-400 mb-4">Aucune commande</p>
                    <Link href="/" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-orange-600 transition-all">Découvrir le marché</Link>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// WISHLIST
// =====================================================================
function BuyerWishlist({ favorites, setFavorites, userId }: { favorites: any[]; setFavorites: any; userId: string }) {
    const [removing, setRemoving] = useState<string | null>(null)
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const removeFav = async (productId: string) => {
        setRemoving(productId)
        try {
            await supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', productId)
            setFavorites((prev: any[]) => prev.filter(f => f.id !== productId))
            toast.success('Retiré des favoris')
        } catch (err) { toast.error('Erreur') }
        finally { setRemoving(null) }
    }

    return (
        <div className="p-4 md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Mes favoris</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">{favorites.length} articles sauvegardés</p>
            </div>

            {favorites.length > 0 ? (
                <div className="space-y-3">
                    {favorites.map((item: any) => (
                        <div key={item.id} className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all ${item.has_stock && item.stock_quantity <= 0 ? 'opacity-50' : ''}`}>
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                <Image src={item.img || item.image_url || '/placeholder-image.jpg'} alt={item.name} width={64} height={64} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black dark:text-white truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.category}</p>
                                <p className="text-orange-500 font-black text-lg mt-1">{fmt(item.price)} <small className="text-[10px]">FCFA</small></p>
                                {item.has_stock && item.stock_quantity <= 0 && (
                                    <p className="text-[10px] text-red-500 font-bold">Rupture de stock</p>
                                )}
                                {item.has_stock && item.stock_quantity > 0 && item.stock_quantity <= 5 && (
                                    <p className="text-[10px] text-yellow-500 font-bold">Plus que {item.stock_quantity} en stock</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <Link href={`/product/${item.id}`} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase text-center hover:bg-orange-600 transition-colors">
                                    Voir
                                </Link>
                                <button onClick={() => removeFav(item.id)} disabled={removing === item.id} className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                    {removing === item.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Retirer'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Heart size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-sm font-black uppercase italic text-slate-400 mb-4">Aucun favori</p>
                    <Link href="/" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">Explorer le marché</Link>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// CART
// =====================================================================
function BuyerCart({ cart, total, itemCount, updateQuantity, removeFromCart }: any) {
    return (
        <div className="p-4 md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Mon panier</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">{itemCount} article{itemCount !== 1 ? 's' : ''}</p>
            </div>

            {cart.length > 0 ? (
                <>
                    <div className="space-y-3 mb-6">
                        {cart.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                    <Image src={item.img || '/placeholder-image.jpg'} alt={item.name} width={64} height={64} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black dark:text-white truncate">{item.name}</p>
                                    {(item.selectedSize || item.selectedColor) && (
                                        <div className="flex gap-2 mt-0.5">
                                            {item.selectedSize && <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Taille: {item.selectedSize}</span>}
                                            {item.selectedColor && <span className="text-[8px] font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-0.5 rounded">Couleur: {item.selectedColor}</span>}
                                        </div>
                                    )}
                                    <p className="text-orange-500 font-black text-lg mt-1">{fmt(item.price * item.quantity)} F</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors">
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-black dark:text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md">
                        <div className="flex justify-between text-slate-500 text-sm font-bold mb-3">
                            <span>Sous-total ({itemCount} articles)</span>
                            <span>{fmt(total)} F</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-sm font-bold mb-4">
                            <span>Livraison</span>
                            <span className="text-green-600 text-xs font-black uppercase">Gratuite</span>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-end mb-6">
                            <span className="font-black uppercase text-xs text-slate-400">Total</span>
                            <span className="font-black text-2xl text-orange-500">{fmt(total)} F</span>
                        </div>
                        <Link href="/checkout" className="block w-full bg-orange-500 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-[0.2em] text-center shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                            Commander maintenant
                        </Link>
                    </div>
                </>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <ShoppingCart size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-sm font-black uppercase italic text-slate-400 mb-4">Votre panier est vide</p>
                    <Link href="/" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">Commencer mes achats</Link>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// FOLLOWING SHOPS
// =====================================================================
function FollowingPage({ shops }: { shops: any[] }) {
    return (
        <div className="p-4 md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Boutiques suivies</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">{shops.length} boutique{shops.length !== 1 ? 's' : ''}</p>
            </div>

            {shops.length > 0 ? (
                <div className="space-y-4">
                    {shops.map((shop: any) => (
                        <Link key={shop.id} href={`/seller/${shop.id}`} className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-orange-300 transition-all">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-orange-500 flex-shrink-0 flex items-center justify-center">
                                {shop.avatar_url ? (
                                    <Image src={shop.avatar_url} alt="" width={56} height={56} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-black text-xl">{(shop.store_name || shop.shop_name || '?')[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-black dark:text-white truncate">{shop.store_name || shop.shop_name || 'Boutique'}</p>
                                </div>
                                {shop.city && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{shop.city}</p>}
                                <div className="flex gap-4 mt-2">
                                    <span className="text-[10px] text-slate-400"><span className="font-black dark:text-white">{shop.followers_count || 0}</span> abonnés</span>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <span className="px-4 py-2 border border-orange-200 dark:border-orange-800 text-orange-500 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5">
                                    <BellRing size={12} /> Abonné
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Store size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-sm font-black uppercase italic text-slate-400 mb-4">Aucune boutique suivie</p>
                    <Link href="/feed" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">Découvrir des boutiques</Link>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// NOTIFICATIONS (based on order activity)
// =====================================================================
function NotificationsPage({ orders }: { orders: any[] }) {
    const notifs = orders.slice(0, 10).map((order: any) => {
        const statusInfo: Record<string, { icon: any; title: string; color: string }> = {
            pending: { icon: Clock, title: 'Commande en attente', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
            confirmed: { icon: CheckCircle2, title: 'Commande confirmée', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
            shipped: { icon: Truck, title: 'Colis en livraison', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
            delivered: { icon: Package, title: 'Commande livrée', color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
        }
        const info = statusInfo[order.status] || statusInfo.pending
        const firstItem = order.items?.[0]
        return {
            id: order.id,
            Icon: info.icon,
            title: info.title,
            desc: `${firstItem?.name || 'Article'} - ${fmt(order.total_amount)} FCFA`,
            time: `${new Date(order.updated_at || order.created_at).toLocaleDateString('fr-FR')} à ${new Date(order.updated_at || order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
            color: info.color,
            isRecent: Date.now() - new Date(order.updated_at || order.created_at).getTime() < 86400000 * 3,
        }
    })

    return (
        <div className="p-4 md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Notifications</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">{notifs.filter(n => n.isRecent).length} récentes</p>
            </div>

            {notifs.length > 0 ? (
                <div className="space-y-2">
                    {notifs.map(n => {
                        const Icon = n.Icon
                        return (
                            <div key={n.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${n.isRecent ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'border-transparent'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-bold ${n.isRecent ? 'dark:text-white' : 'text-slate-500'}`}>{n.title}</p>
                                        {n.isRecent && <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <Bell size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-xs font-black uppercase italic text-slate-400">Aucune notification</p>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// ADDRESSES
// =====================================================================
function AddressesPage({ address, setAddress, userId }: { address: any; setAddress: any; userId: string }) {
    const [updating, setUpdating] = useState(false)
    const [saved, setSaved] = useState(false)
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        setSaved(false)
        try {
            const { error } = await supabase.from('profiles').update({
                city: address.city, district: address.district, landmark: address.landmark, updated_at: new Date()
            }).eq('id', userId)
            if (error) throw error
            setSaved(true)
            toast.success('Adresse enregistrée')
            setTimeout(() => setSaved(false), 3000)
        } catch (err) { toast.error("Erreur lors de l'enregistrement") }
        finally { setUpdating(false) }
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Mes adresses</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Gérez vos adresses de livraison</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-5">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5">
                            <Home size={12} /> Ville
                        </label>
                        <input value={address.city || ''} onChange={e => setAddress({ ...address, city: e.target.value })}
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="Ex: Brazzaville" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5">
                            <MapPin size={12} /> Quartier
                        </label>
                        <input value={address.district || ''} onChange={e => setAddress({ ...address, district: e.target.value })}
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="Ex: Poto-Poto" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5">
                            <Navigation size={12} /> Point de repère
                        </label>
                        <textarea value={address.landmark || ''} onChange={e => setAddress({ ...address, landmark: e.target.value })}
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 font-bold min-h-[100px] resize-none" placeholder="Ex: En face de la pharmacie..." />
                    </div>
                </div>

                <button type="submit" disabled={updating} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                    {updating ? <Loader2 size={16} className="animate-spin" /> : saved ? <><CheckCircle2 size={16} /> Enregistré !</> : <><Save size={16} /> Sauvegarder</>}
                </button>
            </form>

            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-dashed border-orange-200 dark:border-orange-800">
                <p className="text-[10px] font-bold text-orange-600 text-center">
                    Ces informations seront utilisées lors de vos prochaines commandes.
                </p>
            </div>
        </div>
    )
}

// =====================================================================
// PROFILE
// =====================================================================
function ProfilePage({ profile, setProfile, userId }: { profile: any; setProfile: any; userId: string }) {
    const [updating, setUpdating] = useState(false)
    const [uploading, setUploading] = useState(false)
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const filePath = `${userId}-${Math.random()}.${fileExt}`
            const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }))
            await supabase.from('profiles').upsert({ id: userId, avatar_url: publicUrl })
            toast.success('Photo mise à jour')
        } catch (err) { toast.error("Erreur lors de l'upload") }
        finally { setUploading(false) }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: userId, full_name: profile.full_name, whatsapp_number: profile.whatsapp_number,
            })
            if (error) throw error
            toast.success('Profil mis à jour')
        } catch (err: any) { toast.error(err?.message || 'Erreur') }
        finally { setUpdating(false) }
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Mon profil</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Gérez vos informations personnelles</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl">
                            {profile?.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={48} /></div>
                            )}
                            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full"><Loader2 className="animate-spin text-white" /></div>}
                        </div>
                        <label className={`absolute bottom-0 right-0 bg-orange-500 text-white p-2.5 rounded-xl shadow-lg hover:scale-110 transition-transform cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                            <Camera size={14} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                        </label>
                    </div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Cliquer pour changer la photo</p>
                </div>

                {/* Fields */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-5">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom complet</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input value={profile?.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                className="w-full p-4 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="Votre nom" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Numéro de téléphone</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input value={profile?.whatsapp_number || ''} onChange={e => setProfile({ ...profile, whatsapp_number: e.target.value })}
                                className="w-full p-4 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="Ex: 06 444 22 11" />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={updating || uploading} className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
                    {updating ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Enregistrer</>}
                </button>
            </form>
        </div>
    )
}

// =====================================================================
// SETTINGS
// =====================================================================
function SettingsToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button type="button" onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    )
}

function SettingsPage() {
    const [updating, setUpdating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [message, setMessage] = useState({ type: '', text: '' })
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Preferences stored in localStorage
    const [prefs, setPrefs] = useState({
        darkMode: false,
        notifOrders: true,
        notifPromos: true,
        notifRestock: false,
        notifSms: false,
        language: 'fr',
        currency: 'XAF',
    })

    useEffect(() => {
        const saved = localStorage.getItem('mayombe_prefs')
        if (saved) {
            try { setPrefs(p => ({ ...p, ...JSON.parse(saved) })) } catch {}
        }
        // Sync dark mode from document
        setPrefs(p => ({ ...p, darkMode: document.documentElement.classList.contains('dark') }))
    }, [])

    const updatePref = (key: string, value: any) => {
        const next = { ...prefs, [key]: value }
        setPrefs(next)
        localStorage.setItem('mayombe_prefs', JSON.stringify(next))

        if (key === 'darkMode') {
            if (value) {
                document.documentElement.classList.add('dark')
                localStorage.setItem('theme', 'dark')
            } else {
                document.documentElement.classList.remove('dark')
                localStorage.setItem('theme', 'light')
            }
        }

        toast.success('Préférence mise à jour')
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 8) return setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 8 caractères.' })
        setUpdating(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) setMessage({ type: 'error', text: error.message })
            else { setMessage({ type: 'success', text: 'Mot de passe mis à jour !' }); setNewPassword('') }
        } catch { setMessage({ type: 'error', text: 'Erreur réseau' }) }
        finally { setUpdating(false) }
    }

    const sectionClass = "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6"
    const sectionTitle = "flex items-center gap-2 text-orange-500 font-black uppercase text-xs mb-5"
    const rowClass = "flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800 last:border-0"
    const rowLabelClass = "flex items-center gap-3"
    const rowIconClass = "w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500"

    return (
        <div className="p-4 md:p-8 max-w-2xl">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Paramètres</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Personnalisez votre expérience</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 border ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 text-green-600' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800 text-red-600'}`}>
                    {message.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                    <p className="text-xs font-black uppercase">{message.text}</p>
                </div>
            )}

            {/* APPARENCE */}
            <div className={sectionClass}>
                <div className={sectionTitle}>
                    {prefs.darkMode ? <Moon size={16} /> : <Sun size={16} />} Apparence
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><Moon size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Mode sombre</p>
                            <p className="text-[10px] text-slate-400 font-bold">Réduire la fatigue oculaire</p>
                        </div>
                    </div>
                    <SettingsToggle enabled={prefs.darkMode} onToggle={() => updatePref('darkMode', !prefs.darkMode)} />
                </div>
            </div>

            {/* NOTIFICATIONS */}
            <div className={sectionClass}>
                <div className={sectionTitle}>
                    <Bell size={16} /> Notifications
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><TruckIcon size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Suivi de commande</p>
                            <p className="text-[10px] text-slate-400 font-bold">Statut, expédition, livraison</p>
                        </div>
                    </div>
                    <SettingsToggle enabled={prefs.notifOrders} onToggle={() => updatePref('notifOrders', !prefs.notifOrders)} />
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><Tag size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Promotions</p>
                            <p className="text-[10px] text-slate-400 font-bold">Offres, réductions, flash sales</p>
                        </div>
                    </div>
                    <SettingsToggle enabled={prefs.notifPromos} onToggle={() => updatePref('notifPromos', !prefs.notifPromos)} />
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><Package size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Retour en stock</p>
                            <p className="text-[10px] text-slate-400 font-bold">Articles favoris de nouveau disponibles</p>
                        </div>
                    </div>
                    <SettingsToggle enabled={prefs.notifRestock} onToggle={() => updatePref('notifRestock', !prefs.notifRestock)} />
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><Smartphone size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Notifications SMS</p>
                            <p className="text-[10px] text-slate-400 font-bold">Recevoir les alertes par SMS</p>
                        </div>
                    </div>
                    <SettingsToggle enabled={prefs.notifSms} onToggle={() => updatePref('notifSms', !prefs.notifSms)} />
                </div>
            </div>

            {/* LANGUE & DEVISE */}
            <div className={sectionClass}>
                <div className={sectionTitle}>
                    <Globe size={16} /> Langue & Devise
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><Globe size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Langue</p>
                            <p className="text-[10px] text-slate-400 font-bold">Langue de l&apos;interface</p>
                        </div>
                    </div>
                    <select value={prefs.language} onChange={e => updatePref('language', e.target.value)}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white text-xs font-black uppercase outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer">
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="ln">Lingala</option>
                    </select>
                </div>
                <div className={rowClass}>
                    <div className={rowLabelClass}>
                        <div className={rowIconClass}><Volume2 size={16} /></div>
                        <div>
                            <p className="text-sm font-black dark:text-white">Devise</p>
                            <p className="text-[10px] text-slate-400 font-bold">Monnaie d&apos;affichage des prix</p>
                        </div>
                    </div>
                    <select value={prefs.currency} onChange={e => updatePref('currency', e.target.value)}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white text-xs font-black uppercase outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer">
                        <option value="XAF">FCFA (XAF)</option>
                        <option value="CDF">Franc Congolais (CDF)</option>
                        <option value="USD">Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                    </select>
                </div>
            </div>

            {/* SÉCURITÉ */}
            <form onSubmit={handleUpdatePassword} className={`${sectionClass} space-y-5`}>
                <div className={sectionTitle}>
                    <Lock size={16} /> Sécurité
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nouveau mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="w-full p-4 pl-12 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="Min. 8 caractères" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <button type="submit" disabled={updating || !newPassword} className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all disabled:opacity-50">
                    {updating ? <Loader2 size={16} className="animate-spin" /> : 'Mettre à jour'}
                </button>
            </form>

            {/* ZONE DE DANGER */}
            <div className="bg-red-50/50 dark:bg-red-950/10 p-6 rounded-3xl border border-dashed border-red-200 dark:border-red-900/30">
                <h3 className="text-red-600 font-black uppercase text-xs mb-3">Zone de danger</h3>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-4">
                    La suppression de votre compte est irréversible. Toutes vos données, commandes et favoris seront définitivement perdus.
                </p>
                <button className="text-red-600 text-[10px] font-black uppercase underline hover:no-underline">
                    Demander la suppression du compte
                </button>
            </div>
        </div>
    )
}
