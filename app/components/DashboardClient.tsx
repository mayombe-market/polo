'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createBrowserClient } from '@supabase/ssr'
import {
    LayoutDashboard, Package, Plus, ShoppingCart, BarChart3,
    Wallet, Store, Settings, ChevronLeft, ChevronRight,
    TrendingUp, Eye, Users, Copy, Check, Trash2,
    ArrowUpRight, Clock, MapPin, Phone, Loader2, Filter,
    DollarSign, Calendar, Download, AlertTriangle, Shield,
    Bell, Upload, X as XIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { generateInvoice } from '@/lib/generateInvoice'
import { playNewOrderSound } from '@/lib/notificationSound'
import { getVendorOrders, updateOrderStatus as serverUpdateStatus, deleteProduct as serverDeleteProduct } from '@/app/actions/orders'
import { LimitWarning, PricingSection, SubscriptionCheckout, getPlanMaxProducts, getPlanName } from './SellerSubscription'

const AddProductForm = dynamic(() => import('./AddProductForm').then(mod => mod.default || mod), {
    loading: () => <div className="p-10 text-center font-bold italic text-green-600">Chargement du formulaire...</div>,
    ssr: false
})

type Page = 'dashboard' | 'products' | 'add' | 'orders' | 'stats' | 'wallet' | 'shop' | 'settings'

const menuItems: { id: Page; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'add', label: 'Ajouter', icon: Plus },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
    { id: 'wallet', label: 'Portefeuille', icon: Wallet },
    { id: 'shop', label: 'Boutique', icon: Store },
    { id: 'settings', label: 'Paramètres', icon: Settings },
]

export default function DashboardClient({ products: initialProducts, profile, user, productCount }: any) {
    const [activePage, setActivePage] = useState<Page>('dashboard')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [followerCount, setFollowerCount] = useState(0)
    const [totalRevenue, setTotalRevenue] = useState(0)
    const [orders, setOrders] = useState<any[]>([])
    const [products, setProducts] = useState(initialProducts || [])
    const [copied, setCopied] = useState(false)
    const [ordersLoading, setOrdersLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [orderFilter, setOrderFilter] = useState('all')

    // ═══ Système d'abonnement & limites ═══
    const currentPlan = profile?.subscription_plan || 'free'
    const maxProducts = getPlanMaxProducts(currentPlan)
    const currentProductCount = products?.length || productCount || 0
    const isAtLimit = maxProducts !== -1 && currentProductCount >= maxProducts
    const isApproachingLimit = maxProducts !== -1 && currentProductCount >= maxProducts * 0.7

    const [showLimitWarning, setShowLimitWarning] = useState(false)
    const [showUpgradePricing, setShowUpgradePricing] = useState(false)
    const [showUpgradeCheckout, setShowUpgradeCheckout] = useState(false)
    const [upgradeBilling, setUpgradeBilling] = useState('monthly')
    const [upgradeSelectedPlan, setUpgradeSelectedPlan] = useState<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // ===== NOTIFICATION SOUND + BROWSER PUSH =====
    const audioCtxRef = useRef<AudioContext | null>(null)

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [])

    const playNotificationSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
            const ctx = audioCtxRef.current
            const now = ctx.currentTime
            const osc1 = ctx.createOscillator()
            const gain1 = ctx.createGain()
            osc1.type = 'sine'
            osc1.frequency.setValueAtTime(880, now)
            gain1.gain.setValueAtTime(0.3, now)
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
            osc1.connect(gain1).connect(ctx.destination)
            osc1.start(now)
            osc1.stop(now + 0.15)
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
        playNotificationSound()
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' })
        }
    }, [playNotificationSound])

    // Fetch followers + revenue + orders
    useEffect(() => {
        if (!user?.id) return
        const fetchData = async () => {
            try {
                const { count } = await supabase
                    .from('seller_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('seller_id', user.id)
                setFollowerCount(count || 0)
            } catch (err) { console.error("Erreur abonnés:", err) }

            try {
                const { data: allOrders } = await supabase
                    .from('orders')
                    .select('vendor_payout, total_amount, items, payout_status')
                    .eq('payout_status', 'paid')
                const vendorOrders = (allOrders || []).filter(order =>
                    order.items?.some((item: any) => item.seller_id === user.id)
                )
                const revenue = vendorOrders.reduce((acc: number, o: any) =>
                    acc + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0
                )
                setTotalRevenue(revenue)
            } catch (err) { console.error("Erreur revenus:", err) }

            try {
                const result = await getVendorOrders()
                setOrders(result.orders || [])
            } catch (err) { console.error("Erreur commandes:", err) }
            finally { setOrdersLoading(false) }
        }
        fetchData()
    }, [user?.id])

    // Real-time orders
    useEffect(() => {
        if (!user?.id) return
        const channel = supabase
            .channel('vendor-dashboard-orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                const newOrder = payload.new as any
                const vendorItems = newOrder.items?.filter((i: any) => i.seller_id === user.id) || []
                if (vendorItems.length > 0 && newOrder.status !== 'pending') {
                    setOrders(prev => [newOrder, ...prev])
                    const desc = `${newOrder.customer_name} - ${newOrder.total_amount?.toLocaleString('fr-FR')} FCFA`
                    playNewOrderSound()
                    toast.success('Nouvelle commande !', { description: desc })
                    sendNotification('Nouvelle commande !', desc)
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updated = payload.new as any
                const vendorItems = updated.items?.filter((i: any) => i.seller_id === user.id) || []
                if (vendorItems.length > 0) {
                    setOrders(prev => {
                        const exists = prev.find(o => o.id === updated.id)
                        if (exists) return prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)
                        if (updated.status !== 'pending') {
                            const desc = `${updated.customer_name} - ${updated.total_amount?.toLocaleString('fr-FR')} FCFA`
                            playNewOrderSound()
                            toast.success('Nouvelle commande confirmée !', { description: desc })
                            sendNotification('Commande confirmée !', desc)
                            return [updated, ...prev]
                        }
                        return prev
                    })
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user?.id])

    const copyLink = () => {
        const url = `${window.location.origin}/seller/${user?.id}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Supprimer ce produit ?')) return
        setDeleting(productId)
        try {
            const result = await serverDeleteProduct(productId)
            if (result.error) throw new Error(result.error)
            setProducts((prev: any[]) => prev.filter(p => p.id !== productId))
            toast.success('Produit supprimé')
        } catch (err: any) {
            toast.error(err.message || 'Erreur suppression')
        } finally { setDeleting(null) }
    }

    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdating(orderId)
        try {
            const result = await serverUpdateStatus(orderId, newStatus)
            if (result.error) throw new Error(result.error)
            const updateData: any = { status: newStatus }
            if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString()
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData } : o))
            toast.success('Statut mis à jour')
        } catch (err: any) {
            toast.error(err.message || 'Erreur mise à jour')
        } finally { setUpdating(null) }
    }

    const totalViews = products?.reduce((acc: number, p: any) => acc + (p.views_count || 0), 0) || 0
    const totalOrders = orders.length

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'delivered': return { label: 'Livrée', style: 'bg-green-100 text-green-700' }
            case 'shipped': return { label: 'Expédiée', style: 'bg-purple-100 text-purple-700' }
            case 'confirmed': return { label: 'Confirmée', style: 'bg-blue-100 text-blue-700' }
            default: return { label: 'En attente', style: 'bg-yellow-100 text-yellow-700' }
        }
    }

    const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            {/* ===== SIDEBAR DESKTOP ===== */}
            <aside className={`hidden md:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-300 sticky top-0 h-screen`}>
                <div className="p-6 flex items-center justify-between">
                    {sidebarOpen && (
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Mayombe</h1>
                            <p className="text-[8px] font-black uppercase text-orange-500 tracking-[0.2em]">Espace vendeur</p>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors"
                    >
                        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {menuItems.map(item => {
                        const Icon = item.icon
                        const isActive = activePage === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActivePage(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                {sidebarOpen && <span>{item.label}</span>}
                            </button>
                        )
                    })}
                </nav>

                {sidebarOpen && (
                    <div className="p-4 mx-3 mb-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-sm">
                                {(profile?.store_name || profile?.shop_name || 'V')[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black truncate dark:text-white">{profile?.store_name || profile?.shop_name || 'Ma boutique'}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Vendeur</p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* ===== MOBILE BOTTOM NAV ===== */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-50 flex justify-around py-2 px-1 safe-area-bottom">
                {menuItems.slice(0, 5).map(item => {
                    const Icon = item.icon
                    const isActive = activePage === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-orange-500' : 'text-slate-400'}`}
                        >
                            <Icon size={20} />
                            <span className="text-[8px] font-black uppercase">{item.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 pb-24 md:pb-0 overflow-y-auto">
                {activePage === 'dashboard' && (
                    <DashboardHome
                        user={user}
                        profile={profile}
                        orders={orders}
                        followerCount={followerCount}
                        totalRevenue={totalRevenue}
                        totalViews={totalViews}
                        totalOrders={totalOrders}
                        productCount={productCount}
                        copied={copied}
                        onCopyLink={copyLink}
                        onNavigate={(page: Page) => {
                            if (page === 'add' && isAtLimit) {
                                setShowLimitWarning(true)
                                return
                            }
                            setActivePage(page)
                        }}
                        getStatusDetails={getStatusDetails}
                        currentPlan={currentPlan}
                        maxProducts={maxProducts}
                        isApproachingLimit={isApproachingLimit}
                        isAtLimit={isAtLimit}
                        onUpgrade={() => setShowUpgradePricing(true)}
                    />
                )}

                {activePage === 'products' && (
                    <ProductsList
                        products={products}
                        onAdd={() => {
                            if (isAtLimit) {
                                setShowLimitWarning(true)
                            } else {
                                setActivePage('add')
                            }
                        }}
                        onDelete={handleDeleteProduct}
                        deleting={deleting}
                        isAtLimit={isAtLimit}
                        currentPlan={currentPlan}
                        maxProducts={maxProducts}
                        currentProductCount={currentProductCount}
                        onUpgrade={() => setShowUpgradePricing(true)}
                    />
                )}

                {activePage === 'add' && (
                    <div className="p-4 md:p-8 max-w-4xl mx-auto">
                        {/* Barre de limite de produits */}
                        {maxProducts !== -1 && (
                            <div className={`mb-6 p-4 rounded-2xl border ${
                                isAtLimit
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                                    : isApproachingLimit
                                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase text-slate-500">
                                        📦 Produits : {currentProductCount} / {maxProducts} (Plan {getPlanName(currentPlan)})
                                    </span>
                                    {isApproachingLimit && (
                                        <button
                                            onClick={() => setShowUpgradePricing(true)}
                                            className="text-[10px] font-black uppercase text-orange-500 hover:underline"
                                        >
                                            ⚡ Upgrader
                                        </button>
                                    )}
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            isAtLimit ? 'bg-red-500' : isApproachingLimit ? 'bg-orange-500' : 'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min((currentProductCount / maxProducts) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {isAtLimit ? (
                            /* Si limite atteinte → message + bouton upgrade */
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-red-200 dark:border-red-800/30">
                                <div className="text-6xl mb-4">🔒</div>
                                <h2 className="text-xl font-black uppercase italic text-red-500 mb-2">Limite de produits atteinte</h2>
                                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                                    Votre plan {getPlanName(currentPlan)} est limité à {maxProducts} produits.
                                    Passez au niveau supérieur pour continuer à publier.
                                </p>
                                <button
                                    onClick={() => setShowUpgradePricing(true)}
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-xl transition-all shadow-lg shadow-orange-500/20"
                                >
                                    🚀 Voir les plans supérieurs
                                </button>
                            </div>
                        ) : (
                            /* Sinon → formulaire normal */
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Nouveau Produit</h2>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Remplissez les informations</p>
                                </div>
                                <AddProductForm sellerId={user?.id} />
                            </>
                        )}
                    </div>
                )}

                {activePage === 'orders' && (
                    <OrdersPage
                        orders={orders}
                        ordersLoading={ordersLoading}
                        orderFilter={orderFilter}
                        setOrderFilter={setOrderFilter}
                        filteredOrders={filteredOrders}
                        updating={updating}
                        updateStatus={updateStatus}
                        getStatusDetails={getStatusDetails}
                        currentVendorId={user?.id}
                    />
                )}

                {activePage === 'shop' && (
                    <div className="p-4 md:p-8">
                        <div className="max-w-lg mx-auto text-center py-20">
                            <Store size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                            <h2 className="text-xl font-black uppercase italic dark:text-white mb-2">Ma Boutique</h2>
                            <p className="text-sm text-slate-400 mb-6">Voir votre profil public tel que vos clients le voient.</p>
                            <Link
                                href={`/seller/${user?.id}`}
                                className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-orange-600 transition-all"
                            >
                                <ArrowUpRight size={16} /> Voir ma boutique
                            </Link>
                        </div>
                    </div>
                )}

                {activePage === 'stats' && (
                    <StatsPage orders={orders} products={products} followerCount={followerCount} />
                )}

                {activePage === 'wallet' && (
                    <WalletPage orders={orders} currentVendorId={user?.id} />
                )}

                {activePage === 'settings' && (
                    <SettingsPage profile={profile} user={user} supabase={supabase} />
                )}
            </main>

            {/* ═══ MODAL : Limite atteinte ═══ */}
            {showLimitWarning && maxProducts !== -1 && (
                <LimitWarning
                    currentProducts={currentProductCount}
                    maxProducts={maxProducts}
                    currentPlan={getPlanName(currentPlan)}
                    onUpgrade={() => { setShowLimitWarning(false); setShowUpgradePricing(true) }}
                    onClose={() => setShowLimitWarning(false)}
                />
            )}

            {/* ═══ OVERLAY : Pricing upgrade ═══ */}
            {showUpgradePricing && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
                    overflowY: "auto",
                }}>
                    <div style={{
                        maxWidth: 560, margin: "0 auto", padding: "24px 16px",
                        minHeight: "100vh",
                        background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
                        fontFamily: "'DM Sans', -apple-system, sans-serif",
                    }}>
                        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                        <button
                            onClick={() => setShowUpgradePricing(false)}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: "none", border: "none", color: "#888",
                                fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0,
                            }}
                        >
                            ← Retour au dashboard
                        </button>
                        <PricingSection
                            currentPlan={currentPlan}
                            billing={upgradeBilling}
                            setBilling={setUpgradeBilling}
                            onSelectPlan={(plan: any) => {
                                setUpgradeSelectedPlan(plan)
                                setShowUpgradePricing(false)
                                setShowUpgradeCheckout(true)
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ═══ OVERLAY : Checkout upgrade ═══ */}
            {showUpgradeCheckout && upgradeSelectedPlan && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
                    overflowY: "auto",
                }}>
                    <div style={{
                        maxWidth: 560, margin: "0 auto", padding: "24px 16px",
                        minHeight: "100vh",
                        background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
                        fontFamily: "'DM Sans', -apple-system, sans-serif",
                    }}>
                        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                        <SubscriptionCheckout
                            plan={upgradeSelectedPlan}
                            billing={upgradeBilling}
                            onBack={() => { setShowUpgradeCheckout(false); setShowUpgradePricing(true) }}
                            onComplete={() => {
                                setShowUpgradeCheckout(false)
                                window.location.reload()
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// DASHBOARD HOME
// =====================================================================
function DashboardHome({ user, profile, orders, followerCount, totalRevenue, totalViews, totalOrders, productCount, copied, onCopyLink, onNavigate, getStatusDetails, currentPlan, maxProducts, isApproachingLimit, isAtLimit, onUpgrade }: any) {
    const stats = [
        { label: 'Revenus', value: `${totalRevenue.toLocaleString('fr-FR')} F`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: 'Commandes', value: totalOrders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Produits', value: maxProducts === -1 ? `${productCount || 0} ∞` : `${productCount || 0} / ${maxProducts}`, icon: Package, color: isAtLimit ? 'text-red-500' : 'text-orange-500', bg: isAtLimit ? 'bg-red-50 dark:bg-red-900/20' : 'bg-orange-50 dark:bg-orange-900/20' },
        { label: 'Vues', value: totalViews, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: 'Abonnés', value: followerCount, icon: Users, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    ]

    const recentOrders = orders.slice(0, 5)

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter dark:text-white">
                    Bonjour, {profile?.store_name || profile?.shop_name || 'Vendeur'} 👋
                </h1>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-slate-400 font-bold">Voici un résumé de votre activité.</p>
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                        currentPlan === 'premium' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : currentPlan === 'pro' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : currentPlan === 'starter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                        Plan {getPlanName(currentPlan)}
                    </span>
                </div>
            </div>

            {/* Upgrade banner — visible quand on approche de la limite */}
            {isApproachingLimit && (
                <div className={`rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isAtLimit
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                }`}>
                    <div>
                        <h3 className="font-black uppercase text-sm">
                            {isAtLimit ? '🔒 Limite de produits atteinte' : '⚡ Vous approchez de la limite'}
                        </h3>
                        <p className="text-white/80 text-xs font-bold mt-1">
                            {isAtLimit
                                ? `Votre plan ${getPlanName(currentPlan)} est limité à ${maxProducts} produits.`
                                : `${productCount || 0} / ${maxProducts} produits — Passez au niveau supérieur.`
                            }
                        </p>
                    </div>
                    <button
                        onClick={onUpgrade}
                        className="flex items-center gap-2 bg-white text-orange-600 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg whitespace-nowrap"
                    >
                        🚀 Upgrader mon plan
                    </button>
                </div>
            )}

            {/* Share banner */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-black uppercase text-sm">Partagez votre boutique</h3>
                    <p className="text-orange-100 text-xs font-bold mt-1">Attirez plus de clients sur vos réseaux.</p>
                </div>
                <button
                    onClick={onCopyLink}
                    className="flex items-center gap-2 bg-white text-orange-600 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copié !' : 'Copier le lien'}
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className={`w-10 h-10 ${stat.bg} rounded-2xl flex items-center justify-center mb-3`}>
                                <Icon size={20} className={stat.color} />
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color} mt-1`}>{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => onNavigate('add')} className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border transition-all text-left group ${
                    isAtLimit ? 'border-red-200 dark:border-red-800/30 hover:border-red-300' : 'border-slate-100 dark:border-slate-800 hover:border-orange-300'
                }`}>
                    <Plus size={24} className={`mb-2 group-hover:rotate-90 transition-transform ${isAtLimit ? 'text-red-400' : 'text-orange-500'}`} />
                    <h3 className="font-black text-sm dark:text-white uppercase">
                        {isAtLimit ? '🔒 Limite atteinte' : 'Ajouter produit'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                        {isAtLimit ? 'Upgradez votre plan' : 'Mettre en vente un article'}
                    </p>
                </button>
                <button onClick={() => onNavigate('orders')} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 transition-all text-left group">
                    <ShoppingCart size={24} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-black text-sm dark:text-white uppercase">Voir commandes</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{totalOrders} commande{totalOrders !== 1 ? 's' : ''}</p>
                </button>
                <Link href={`/seller/${user?.id}`} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-green-300 transition-all text-left group">
                    <Store size={24} className="text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-black text-sm dark:text-white uppercase">Ma boutique</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Voir mon profil public</p>
                </Link>
            </div>

            {/* Recent orders */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black uppercase text-sm dark:text-white">Commandes récentes</h3>
                    <button onClick={() => onNavigate('orders')} className="text-[10px] font-black uppercase text-orange-500 hover:underline">
                        Voir tout
                    </button>
                </div>
                {recentOrders.length > 0 ? (
                    <div className="space-y-3">
                        {recentOrders.map((order: any) => {
                            const statusInfo = getStatusDetails(order.status)
                            return (
                                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center">
                                            <Package size={16} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black dark:text-white">{order.customer_name || 'Client'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-green-600">{(order.vendor_payout || Math.round((order.total_amount || 0) * 0.9))?.toLocaleString('fr-FR')} F</p>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusInfo.style}`}>{statusInfo.label}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <Clock size={32} className="mx-auto text-slate-200 dark:text-slate-600 mb-3" />
                        <p className="text-xs font-black uppercase italic text-slate-400">Aucune commande pour le moment</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// =====================================================================
// PRODUCTS LIST
// =====================================================================
function ProductsList({ products, onAdd, onDelete, deleting, isAtLimit, currentPlan, maxProducts, currentProductCount, onUpgrade }: any) {
    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Mes Produits</h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">{products?.length || 0} article{(products?.length || 0) !== 1 ? 's' : ''} en vente</p>
                </div>
                <button
                    onClick={onAdd}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all shadow-lg ${
                        isAtLimit
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 shadow-none cursor-pointer'
                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
                    }`}
                >
                    <Plus size={16} /> {isAtLimit ? '🔒 Limite atteinte' : 'Nouveau produit'}
                </button>
            </div>

            {/* Barre de progression plan */}
            {maxProducts !== -1 && (
                <div className={`mb-8 p-4 rounded-2xl border ${
                    isAtLimit
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                            Plan {getPlanName(currentPlan)} — {currentProductCount} / {maxProducts} produits
                        </span>
                        {isAtLimit && (
                            <button onClick={onUpgrade} className="text-[10px] font-black uppercase text-orange-500 hover:underline">
                                ⚡ Upgrader
                            </button>
                        )}
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((currentProductCount / maxProducts) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {products && products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((p: any) => (
                        <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden group hover:shadow-lg transition-all">
                            <div className="relative aspect-[4/3] bg-slate-100">
                                <Image
                                    src={p.img || p.image_url || '/placeholder-image.jpg'}
                                    alt={p.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                        <Eye size={10} /> {p.views_count || 0}
                                    </span>
                                </div>
                                {p.has_stock && (
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${p.stock_quantity > 0
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            Stock: {p.stock_quantity || 0}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5">
                                <h3 className="font-black text-sm uppercase italic truncate dark:text-white">{p.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{p.category}</p>
                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-lg font-black text-green-600">
                                        {p.price?.toLocaleString('fr-FR')} <small className="text-[10px]">FCFA</small>
                                    </span>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/product/${p.id}`}
                                            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            <Eye size={14} />
                                        </Link>
                                        <button
                                            onClick={() => onDelete(p.id)}
                                            disabled={deleting === p.id}
                                            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            {deleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Package size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-sm font-black uppercase italic text-slate-400 mb-4">Aucun produit</p>
                    <button onClick={onAdd} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-orange-600 transition-all">
                        Ajouter mon premier produit
                    </button>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// ORDERS PAGE
// =====================================================================
function OrdersPage({ orders, ordersLoading, orderFilter, setOrderFilter, filteredOrders, updating, updateStatus, getStatusDetails, currentVendorId }: any) {
    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Commandes</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-6">
                {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'confirmed', label: 'Confirmées' },
                    { id: 'shipped', label: 'Expédiées' },
                    { id: 'delivered', label: 'Livrées' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setOrderFilter(f.id)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border ${orderFilter === f.id
                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {ordersLoading ? (
                <div className="py-20 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-orange-500 mb-3" />
                    <p className="text-xs font-black uppercase text-slate-400">Chargement des commandes...</p>
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="space-y-4">
                    {filteredOrders.map((order: any) => {
                        const statusInfo = getStatusDetails(order.status)
                        const vendorItems = order.items?.filter((i: any) => i.seller_id === currentVendorId) || order.items || []
                        return (
                            <div key={order.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <Package size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400">{formatOrderNumber(order)}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-full ${statusInfo.style}`}>
                                            {statusInfo.label}
                                        </span>
                                        {order.tracking_number && (
                                            <span className="px-3 py-1 text-[8px] font-black uppercase rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-mono tracking-wider">
                                                {order.tracking_number}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-2 mb-4">
                                    {vendorItems.map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                                            <Image src={item.img || '/placeholder-image.jpg'} alt={item.name || ''} width={40} height={40} className="w-10 h-10 object-cover rounded-xl" />
                                            <div className="flex-1">
                                                <h3 className="text-xs font-black uppercase italic dark:text-white leading-tight">{item.name}</h3>
                                                <p className="text-[10px] font-bold text-green-600">{item.price?.toLocaleString('fr-FR')} F x {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Client + Actions */}
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-xs font-black uppercase italic dark:text-white">{order.customer_name || 'Client'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                            <MapPin size={10} /> {order.city}, {order.district}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg font-black text-green-600">
                                            {(order.vendor_payout || Math.round((order.total_amount || 0) * 0.9))?.toLocaleString('fr-FR')} F
                                        </span>
                                        {order.status !== 'delivered' && (
                                            <button
                                                onClick={() => {
                                                    const next = order.status === 'confirmed' ? 'shipped' : order.status === 'shipped' ? 'delivered' : 'confirmed'
                                                    updateStatus(order.id, next)
                                                }}
                                                disabled={updating === order.id}
                                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 dark:hover:text-white transition-all"
                                            >
                                                {updating === order.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                                {order.status === 'confirmed' ? 'Expédier' : order.status === 'shipped' ? 'Livrée' : 'Confirmer'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => generateInvoice(order)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors"
                                            title="Télécharger le reçu PDF"
                                        >
                                            <Download size={16} />
                                        </button>
                                        {order.phone && (
                                            <a href={`tel:${order.phone}`} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-green-500 transition-colors">
                                                <Phone size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <Filter size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-xs font-black uppercase italic text-slate-400">Aucune commande dans cette catégorie</p>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// STATS PAGE
// =====================================================================
function StatsPage({ orders, products, followerCount }: { orders: any[]; products: any[]; followerCount: number }) {
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

    // Revenue by month (last 6 months)
    const monthlyData = (() => {
        const months: Record<string, number> = {}
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
            months[key] = 0
        }
        orders.forEach(o => {
            const d = new Date(o.created_at)
            const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
            if (key in months) {
                months[key] += (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9))
            }
        })
        return Object.entries(months).map(([month, revenue]) => ({ month, revenue }))
    })()
    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

    // Orders by status
    const statusCounts = {
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
    }
    const totalStatusOrders = Math.max(statusCounts.confirmed + statusCounts.shipped + statusCounts.delivered, 1)

    // Top products by views
    const topProducts = [...(products || [])].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5)

    // Conversion rate
    const totalViews = products?.reduce((acc: number, p: any) => acc + (p.views_count || 0), 0) || 0
    const conversionRate = totalViews > 0 ? ((orders.length / totalViews) * 100).toFixed(1) : '0.0'

    // Orders by day of week
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const ordersByDay = dayNames.map((name, i) => ({
        name,
        count: orders.filter(o => new Date(o.created_at).getDay() === i).length
    }))
    const maxDayCount = Math.max(...ordersByDay.map(d => d.count), 1)

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Statistiques</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Analysez les performances de votre boutique</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Taux de conversion', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Commandes totales', value: orders.length, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Vues totales', value: fmt(totalViews), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    { label: 'Abonnés', value: followerCount, icon: Users, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
                ].map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className={`w-10 h-10 ${stat.bg} rounded-2xl flex items-center justify-center mb-3`}>
                                <Icon size={20} className={stat.color} />
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color} mt-1`}>{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Revenue chart */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-black uppercase text-sm dark:text-white">Revenus mensuels</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">6 derniers mois (part vendeur 90%)</p>
                    </div>
                    <DollarSign size={20} className="text-green-500" />
                </div>
                <div className="flex items-end gap-3 h-48">
                    {monthlyData.map((d, i) => {
                        const height = maxRevenue > 0 ? Math.max((d.revenue / maxRevenue) * 100, 4) : 4
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-[9px] font-black text-slate-500">{d.revenue > 0 ? `${fmt(d.revenue)}F` : '-'}</span>
                                <div className="w-full relative flex justify-center" style={{ height: '160px' }}>
                                    <div
                                        className="w-full max-w-[40px] rounded-xl transition-all duration-700"
                                        style={{
                                            height: `${height}%`,
                                            background: d.revenue > 0 ? 'linear-gradient(180deg, #F59E0B, #E8A838)' : '#e5e7eb',
                                            position: 'absolute',
                                            bottom: 0,
                                        }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">{d.month}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders by status */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                    <h3 className="font-black uppercase text-sm dark:text-white mb-6">Répartition des commandes</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Confirmées', count: statusCounts.confirmed, color: 'bg-blue-500' },
                            { label: 'Expédiées', count: statusCounts.shipped, color: 'bg-purple-500' },
                            { label: 'Livrées', count: statusCounts.delivered, color: 'bg-green-500' },
                        ].map((s, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                                    <span className="text-slate-900 dark:text-white">{s.count}</span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${s.color} rounded-full transition-all duration-700`}
                                        style={{ width: `${(s.count / totalStatusOrders) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Orders by day of week */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                    <h3 className="font-black uppercase text-sm dark:text-white mb-6">Commandes par jour</h3>
                    <div className="flex items-end gap-2 h-36">
                        {ordersByDay.map((d, i) => {
                            const height = Math.max((d.count / maxDayCount) * 100, 8)
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                    <span className="text-[9px] font-black text-slate-500">{d.count || ''}</span>
                                    <div className="w-full flex justify-center" style={{ height: '100px', position: 'relative' }}>
                                        <div
                                            className="w-full max-w-[32px] rounded-lg transition-all duration-500"
                                            style={{
                                                height: `${height}%`,
                                                background: d.count > 0 ? 'linear-gradient(180deg, #3B82F6, #6366F1)' : '#e5e7eb',
                                                position: 'absolute',
                                                bottom: 0,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400">{d.name}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Top products */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-6">Top produits par vues</h3>
                {topProducts.length > 0 ? (
                    <div className="space-y-3">
                        {topProducts.map((p: any, i: number) => (
                            <div key={p.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <span className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-black text-sm">
                                    {i + 1}
                                </span>
                                <Image
                                    src={p.img || p.image_url || '/placeholder-image.jpg'}
                                    alt={p.name}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 rounded-xl object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black uppercase italic truncate dark:text-white">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{fmt(p.price || 0)} F</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-purple-600">{p.views_count || 0}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">vues</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center text-slate-400 text-xs font-bold italic">Aucun produit encore</div>
                )}
            </div>
        </div>
    )
}

// =====================================================================
// WALLET PAGE
// =====================================================================
function WalletPage({ orders, currentVendorId }: { orders: any[]; currentVendorId: string }) {
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

    const paidOrders = orders.filter(o => o.payout_status === 'paid')
    const pendingOrders = orders.filter(o => o.status === 'delivered' && o.payout_status === 'pending')
    const inProgressOrders = orders.filter(o => ['confirmed', 'shipped'].includes(o.status))

    const totalEarned = paidOrders.reduce((acc, o) => acc + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)
    const pendingAmount = pendingOrders.reduce((acc, o) => acc + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)
    const inProgressAmount = inProgressOrders.reduce((acc, o) => acc + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)

    // Transaction history (all orders sorted by date)
    const allTransactions = [...orders]
        .filter(o => o.status !== 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Portefeuille</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Suivez vos revenus et paiements</p>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white">
                    <DollarSign size={24} className="mb-3 opacity-80" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total encaissé</p>
                    <p className="text-3xl font-black mt-1">{fmt(totalEarned)} <span className="text-sm">F</span></p>
                    <p className="text-[10px] font-bold opacity-70 mt-1">{paidOrders.length} commande{paidOrders.length !== 1 ? 's' : ''} payée{paidOrders.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 text-white">
                    <Clock size={24} className="mb-3 opacity-80" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">En attente (48h)</p>
                    <p className="text-3xl font-black mt-1">{fmt(pendingAmount)} <span className="text-sm">F</span></p>
                    <p className="text-[10px] font-bold opacity-70 mt-1">{pendingOrders.length} commande{pendingOrders.length !== 1 ? 's' : ''} livrée{pendingOrders.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl p-6 text-white">
                    <Package size={24} className="mb-3 opacity-80" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">En cours</p>
                    <p className="text-3xl font-black mt-1">{fmt(inProgressAmount)} <span className="text-sm">F</span></p>
                    <p className="text-[10px] font-bold opacity-70 mt-1">{inProgressOrders.length} commande{inProgressOrders.length !== 1 ? 's' : ''} en route</p>
                </div>
            </div>

            {/* How it works */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-4">Comment ça marche</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { step: '1', title: 'Commande confirmée', desc: 'L\'admin confirme le paiement du client', icon: Shield },
                        { step: '2', title: 'Livraison + 48h', desc: 'Délai de sécurité après la livraison', icon: Clock },
                        { step: '3', title: 'Fonds libérés', desc: 'Vous recevez 90% du montant', icon: Wallet },
                    ].map((s, i) => {
                        const Icon = s.icon
                        return (
                            <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                                    <Icon size={18} className="text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black dark:text-white">{s.title}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Transaction history */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black uppercase text-sm dark:text-white">Historique des transactions</h3>
                    <span className="text-[10px] font-black uppercase text-slate-400">{allTransactions.length} transactions</span>
                </div>
                {allTransactions.length > 0 ? (
                    <div className="space-y-2">
                        {allTransactions.map((order: any) => {
                            const payout = order.vendor_payout || Math.round((order.total_amount || 0) * 0.9)
                            const isPaid = order.payout_status === 'paid'
                            const isDelivered = order.status === 'delivered'
                            return (
                                <div key={order.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-green-100 dark:bg-green-900/30' : isDelivered ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                        {isPaid ? <Check size={16} className="text-green-600" /> : isDelivered ? <Clock size={16} className="text-amber-600" /> : <Package size={16} className="text-blue-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black dark:text-white truncate">{order.customer_name || 'Client'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black ${isPaid ? 'text-green-600' : 'text-slate-500'}`}>
                                            {isPaid ? '+' : ''}{fmt(payout)} F
                                        </p>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : isDelivered ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {isPaid ? 'Versé' : isDelivered ? 'En attente 48h' : order.status === 'shipped' ? 'En livraison' : 'Confirmée'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <Wallet size={32} className="mx-auto text-slate-200 dark:text-slate-600 mb-3" />
                        <p className="text-xs font-black uppercase italic text-slate-400">Aucune transaction pour le moment</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// =====================================================================
// SETTINGS PAGE
// =====================================================================
function SettingsPage({ profile, user, supabase }: { profile: any; user: any; supabase: any }) {
    const [saving, setSaving] = useState(false)
    const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_url || null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [formData, setFormData] = useState({
        store_name: profile?.store_name || profile?.shop_name || '',
        bio: profile?.bio || '',
        phone: profile?.phone || '',
        city: profile?.city || 'brazzaville',
        return_policy: profile?.return_policy || 'Retours acceptés sous 7 jours après réception, article non utilisé.',
        shipping_info: profile?.shipping_info || 'Livraison à Brazzaville et Pointe-Noire. Délai : 1-3 jours.',
    })

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverFile(file)
        setCoverPreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            let cover_url = coverPreview

            if (coverFile) {
                const fileExt = coverFile.name.split('.').pop()
                const filePath = `covers/${user.id}-${Date.now()}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, coverFile, { upsert: true })

                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
                    cover_url = urlData.publicUrl
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    store_name: formData.store_name,
                    bio: formData.bio,
                    phone: formData.phone,
                    city: formData.city,
                    return_policy: formData.return_policy,
                    shipping_info: formData.shipping_info,
                    cover_url: cover_url || null,
                })
                .eq('id', user.id)

            if (error) {
                toast.error('Erreur : ' + error.message)
            } else {
                toast.success('Paramètres enregistrés !')
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur sauvegarde')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-3xl">
            <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Paramètres</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">Configurez votre boutique</p>
            </div>

            {/* Cover image */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-4">Image de couverture</h3>
                <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-orange-500">
                    {coverPreview && (
                        <>
                            <Image src={coverPreview} alt="Couverture" fill className="object-cover" />
                            <button
                                type="button"
                                onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                                className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all z-10"
                            >
                                <XIcon size={14} />
                            </button>
                        </>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/20 transition-all">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 text-white text-[10px] font-black uppercase">
                            <Upload size={14} />
                            {coverPreview ? 'Changer' : 'Ajouter une couverture'}
                        </div>
                        <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                </div>
            </div>

            {/* Shop info */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <h3 className="font-black uppercase text-sm dark:text-white">Informations boutique</h3>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nom de la boutique</label>
                    <input
                        value={formData.store_name}
                        onChange={e => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                        placeholder="Ex: Brazza Sneakers"
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Description</label>
                    <textarea
                        value={formData.bio}
                        onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Décrivez votre boutique..."
                        rows={3}
                        maxLength={200}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-right">{formData.bio.length}/200</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Téléphone</label>
                        <input
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="242064440000"
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Ville</label>
                        <select
                            value={formData.city}
                            onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm appearance-none"
                        >
                            <option value="brazzaville">Brazzaville</option>
                            <option value="pointe-noire">Pointe-Noire</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Policies */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <h3 className="font-black uppercase text-sm dark:text-white">Politiques de la boutique</h3>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Politique de retour</label>
                    <textarea
                        value={formData.return_policy}
                        onChange={e => setFormData(prev => ({ ...prev, return_policy: e.target.value }))}
                        rows={3}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm resize-none"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Informations de livraison</label>
                    <textarea
                        value={formData.shipping_info}
                        onChange={e => setFormData(prev => ({ ...prev, shipping_info: e.target.value }))}
                        rows={3}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm resize-none"
                    />
                </div>
            </div>

            {/* Notifications info */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-4">Notifications</h3>
                <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <Bell size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black dark:text-white">Notifications navigateur activées</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                            Vous recevez automatiquement des alertes sonores et visuelles quand une nouvelle commande arrive.
                            Assurez-vous d'autoriser les notifications dans votre navigateur.
                        </p>
                    </div>
                </div>
            </div>

            {/* Commission info */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-4">Commission & tarification</h3>
                <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                    <AlertTriangle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black dark:text-white">Commission de 10% par vente</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                            Mayombe Market prélève 10% du montant de chaque commande.
                            Vous recevez 90% du total une fois la commande livrée et validée (délai 48h de sécurité).
                        </p>
                    </div>
                </div>
            </div>

            {/* Save button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </button>
        </div>
    )
}
