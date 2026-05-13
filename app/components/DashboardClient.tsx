'use client'

/**
 * Dashboard vendeur — client lourd (navigation, commandes, produits, temps réel).
 *
 * Améliorations récentes (données async, fiabilité, pas de F5) :
 * - **Chargement non bloquant** : le shell (sidebar + zones) reste utilisable ; commandes / stats async
 *   affichent des états `loading` / `error` / `not_found` dédiés au lieu d’un écran vide silencieux.
 * - **Retries réseau (≥ 3 relances)** : `withRetry` depuis `@/lib/supabase-browser` (4 tentatives au total)
 *   sur `getVendorOrders`, `getSellerNegotiations`, et les requêtes Supabase directes (followers, CA).
 * - **Erreurs explicites** : message + bouton « Réessayer » (incrémente `sellerDataRetryKey`) sans recharger la page.
 * - **not_found** : pas d’utilisateur en props, ou session serveur sans rôle vendeur (`vendorId` absent après fetch).
 * - **Données à jour sans refresh complet** : après suppression produit / MAJ statut commande, `router.refresh()`
 *   resynchronise les props RSC ; `useEffect` ré-applique `initialProducts` quand le parent les renvoie.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getSupabaseBrowserClient, withRetry } from '@/lib/supabase-browser'
import {
    LayoutDashboard, Package, Plus, ShoppingCart, BarChart3,
    Wallet, Store, Settings, ChevronLeft, ChevronRight,
    TrendingUp, Eye, Users, Copy, Check, Trash2,
    ArrowUpRight, Clock, MapPin, Loader2, Filter,
    DollarSign, Calendar, Download, AlertTriangle, Shield,
    Bell, Upload, X as XIcon, MessageSquare, MessageCircle, Tag,
    Crown, Sparkles, Megaphone, Star, Send, Camera, Navigation, Pencil
} from 'lucide-react'
import { toast } from 'sonner'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { generateInvoice } from '@/lib/generateInvoice'
import { getVendorOrders, updateOrderStatus as serverUpdateStatus, deleteProduct as serverDeleteProduct, activatePromo, deactivatePromo, applyPendingPlan } from '@/app/actions/orders'
import { DAY_KEYS, DAY_LABELS, DEFAULT_SCHEDULE, computeIsOpen, type DayKey, type DaySchedule, type ShopSchedule } from '@/lib/shopSchedule'
import { isPromoActive } from '@/lib/promo'
import { getSellerNegotiations, respondToNegotiation } from '@/app/actions/negotiations'
import { getUnreadCount } from '@/app/actions/messages'
import { getNotifications, markAsRead, markAllAsRead, getUnreadNotifCount } from '@/app/actions/notifications'
import { updateProfile } from '@/app/actions/profile'
import { useRealtime } from '@/hooks/useRealtime'
import { SYSTEM_FONT_STACK } from '@/lib/systemFontStack'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import MessagesPanel from './MessagesPanel'
import VerificationBanner from './VerificationBanner'
import { LimitWarning, PricingSection, SubscriptionCheckout, getPlanMaxProducts, getPlanName, PLANS } from './SellerSubscription'
import { ImmoPricingSection, ImmoReactivationOverlay, ImmoUpgradeOverlay } from './ImmoSubscription'
import { HotelUpgradeOverlay, HotelReactivationOverlay } from './HotelSubscription'
import { getImmoMaxListings } from '@/lib/immoPlans'
import { getHotelMaxRooms } from '@/lib/hotelPlans'
import { requestHotelReview, getHotelReviewRequests, getHotelProductReviews, addHotelReply } from '@/app/actions/hotel-reviews'
import { getSubscriptionStatus, getDaysRemaining, getPendingPlan } from '@/lib/subscription'
import { SHOP_DESCRIPTION_MAX_LENGTH } from '@/lib/shopDescription'
import VendorPushPrompt from '@/app/components/VendorPushPrompt'
import { startAdminAlarm, stopAdminAlarm } from '@/lib/notificationSound'

const AddProductForm = dynamic(() => import('./AddProductForm').then(mod => mod.default || mod), {
    loading: () => <div className="p-10 text-center font-bold italic text-green-600">Chargement du formulaire...</div>,
    ssr: false
})

const PatisserieProductForm = dynamic(() => import('./PatisserieProductForm').then(mod => mod.default || mod), {
    loading: () => <div className="p-10 text-center font-bold italic text-rose-500">Chargement du formulaire…</div>,
    ssr: false
})

type Page = 'dashboard' | 'products' | 'add' | 'edit' | 'orders' | 'negotiations' | 'messages' | 'notifs' | 'stats' | 'wallet' | 'shop' | 'settings' | 'hotel_reviews'

const getMenuItems = (verificationStatus?: string, isHotelVendor?: boolean): { id: Page; label: string; icon: any }[] => {
    const items: { id: Page; label: string; icon: any }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'products', label: isHotelVendor ? 'Chambres' : 'Produits', icon: Package },
        { id: 'add', label: isHotelVendor ? 'Ajouter chambre' : 'Ajouter', icon: Plus },
        { id: 'orders', label: 'Commandes', icon: ShoppingCart },
        { id: 'negotiations', label: 'Négociations', icon: MessageSquare },
        ...(isHotelVendor ? [{ id: 'hotel_reviews' as Page, label: 'Avis clients', icon: Star }] : []),
        { id: 'messages', label: 'Messages', icon: MessageCircle },
        { id: 'notifs', label: 'Notifications', icon: Bell },
        { id: 'stats', label: 'Statistiques', icon: BarChart3 },
        { id: 'wallet', label: 'Portefeuille', icon: Wallet },
        { id: 'shop', label: 'Boutique', icon: Store },
        { id: 'settings', label: 'Paramètres', icon: Settings },
    ]
    return items
}

export default function DashboardClient({ products: initialProducts, profile, user, productCount }: any) {
    const router = useRouter()
    const [activePage, setActivePage] = useState<Page>('dashboard')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [followerCount, setFollowerCount] = useState(0)
    const [orders, setOrders] = useState<any[]>([])
    const [products, setProducts] = useState(initialProducts || [])
    const [copied, setCopied] = useState(false)
    const [ordersLoading, setOrdersLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [orderFilter, setOrderFilter] = useState('all')
    const [negotiations, setNegotiations] = useState<any[]>([])
    const [negotiationsLoading, setNegotiationsLoading] = useState(true)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [unreadNotifs, setUnreadNotifs] = useState(0)

    // ─── Alarme vendeur : boucle jusqu'à arrêt manuel ────────────────────────
    const [alarmOrders, setAlarmOrders] = useState<{ id: string; customer_name: string; label: string }[]>([])
    const alarmRef = useRef(false)

    const triggerVendorAlarm = useCallback((orderId: string, customerName: string, label: string) => {
        setAlarmOrders(prev => {
            if (prev.find(o => o.id === orderId)) return prev
            return [...prev, { id: orderId, customer_name: customerName, label }]
        })
        if (!alarmRef.current) {
            alarmRef.current = true
            startAdminAlarm()
        }
    }, [])

    const dismissVendorAlarm = useCallback(() => {
        stopAdminAlarm()
        alarmRef.current = false
        setAlarmOrders([])
    }, [])

    // Arrêter l'alarme si le vendeur quitte la page
    useEffect(() => {
        return () => { stopAdminAlarm(); alarmRef.current = false }
    }, [])

    /** `loading` → premier fetch ; `ready` → OK ; `error` → échec critique (commandes) ; `not_found` → pas de user ou pas vendeur côté session. */
    type SellerBootstrapPhase = 'loading' | 'ready' | 'error' | 'not_found'
    const [sellerBootstrapPhase, setSellerBootstrapPhase] = useState<SellerBootstrapPhase>('loading')
    const [sellerBootstrapMessage, setSellerBootstrapMessage] = useState<string>('')
    const [sellerDataRetryKey, setSellerDataRetryKey] = useState(0)
    /** Erreur dédiée négociations (ne bloque pas le reste du tableau de bord). */
    const [negotiationsError, setNegotiationsError] = useState<string | null>(null)

    /** Relance tous les fetchs vendeur sans `window.location.reload()` (incrémente la clé de l’effet). */
    const refetchSellerDashboard = useCallback(() => {
        setSellerDataRetryKey((k) => k + 1)
    }, [])

    // ═══ Type de vendeur (marketplace, immobilier ou hotel) ═══
    const isImmo = profile?.vendor_type === 'immobilier'
    const isHotel = profile?.vendor_type === 'hotel'

    // Menu dynamique selon le type de vendeur
    const menuItems = getMenuItems(profile?.verification_status, isHotel)

    // ═══ Système d'abonnement & limites ═══
    const currentPlan = profile?.subscription_plan || (isImmo ? 'immo_free' : isHotel ? 'hotel_free' : 'free')
    const maxProducts = isImmo
        ? getImmoMaxListings(currentPlan)
        : isHotel
            ? getHotelMaxRooms(currentPlan)
            : getPlanMaxProducts(currentPlan)
    const currentProductCount = products?.length || productCount || 0
    const isAtLimit = maxProducts !== -1 && currentProductCount >= maxProducts
    const isApproachingLimit = maxProducts !== -1 && currentProductCount >= maxProducts * 0.7

    // ═══ Expiration abonnement ═══
    const subscriptionStatus = getSubscriptionStatus(profile)
    const daysRemaining = getDaysRemaining(profile?.subscription_end_date)
    const isExpired = subscriptionStatus === 'expired'
    const isGrace = subscriptionStatus === 'grace'
    const totalDays = profile?.subscription_billing === 'yearly' ? 365 : 30

    // Plan différé (Option A : changement de plan en cours d'abonnement)
    const pendingPlan = getPendingPlan(profile)

    // Si l'abonnement actuel est expiré et qu'un plan différé existe → l'appliquer automatiquement
    useEffect(() => {
        if (!pendingPlan) return
        if (subscriptionStatus !== 'expired' && subscriptionStatus !== 'grace') return
        applyPendingPlan().then(({ applied }) => {
            if (applied) window.location.reload()
        }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /** Masquer le CTA upgrade si plan payant actif ou legacy */
    const planKey = String(currentPlan || '').toLowerCase()
    const isFreeTier = !planKey || planKey === 'free' || planKey === 'gratuit' || planKey === 'immo_free' || planKey === 'hotel_free'
    const vendorHasPaidCoverage =
        !isFreeTier && (subscriptionStatus === 'active' || subscriptionStatus === 'legacy')
    const showVendorPlanCta = !vendorHasPaidCoverage

    const vendorPlanBtnStyle = {
        background: 'linear-gradient(135deg, #E8A838 0%, #D4782F 100%)',
        boxShadow: '0 6px 20px rgba(232,168,56,0.35)',
    } as const

    const [showLimitWarning, setShowLimitWarning] = useState(false)
    const [showReactivation, setShowReactivation] = useState(false)
    const [showUpgradePricing, setShowUpgradePricing] = useState(false)
    const [showUpgradeCheckout, setShowUpgradeCheckout] = useState(false)
    const [upgradeBilling, setUpgradeBilling] = useState('monthly')
    const [upgradeSelectedPlan, setUpgradeSelectedPlan] = useState<any>(null)

    /** Ouvre le bon écran selon le statut : réactivation si plan expiré, grille si free. */
    const openUpgradeFlow = useCallback(() => {
        const paidMarketplacePlans = ['starter', 'pro', 'premium']
        const paidImmoPlan = ['immo_agent', 'immo_agence']
        const paidHotelPlans = ['hotel_pro', 'hotel_chain']
        const isPaidExpired = (isExpired || isGrace) && (
            paidMarketplacePlans.includes(currentPlan) ||
            paidImmoPlan.includes(currentPlan) ||
            paidHotelPlans.includes(currentPlan)
        )
        if (isPaidExpired) {
            setShowReactivation(true)
        } else {
            setShowUpgradePricing(true)
        }
    }, [isExpired, isGrace, currentPlan])

    /** Singleton navigateur — `useMemo` évite de recréer le client à chaque rendu. */
    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    // Lien depuis le header / CTA « Activer mon abonnement » : ?upgrade=1 → ouvrir les plans
    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        if (params.get('upgrade') !== '1') return
        openUpgradeFlow()
        params.delete('upgrade')
        const q = params.toString()
        const next = q ? `${window.location.pathname}?${q}` : window.location.pathname
        window.history.replaceState(null, '', next)
    }, [])

    // Liens /vendor/settings, /profile/edit, ?tab=settings → onglet Paramètres
    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab') as Page | null
        const allowed: Page[] = [
            'dashboard', 'products', 'add', 'orders', 'negotiations', 'messages',
            'notifs', 'stats', 'wallet', 'shop', 'settings',
        ]
        if (tab && allowed.includes(tab)) {
            setActivePage(tab)
        }
    }, [])

    // ===== NOTIFICATION SOUND + BROWSER PUSH =====
    const audioCtxRef = useRef<AudioContext | null>(null)

    // ─── Service Worker : navigation après clic sur notif push ──────────────
    // (L'abonnement push et la demande de permission sont gérés par VendorPushPrompt)
    useEffect(() => {
        const onSWMessage = (e: MessageEvent) => {
            if (e.data?.type === 'PUSH_NAVIGATE' && e.data?.url) {
                window.location.href = e.data.url
            }
        }
        navigator.serviceWorker?.addEventListener('message', onSWMessage)
        return () => navigator.serviceWorker?.removeEventListener('message', onSWMessage)
    }, [])

    // Son d'alerte vendeur — fort, triple bip sawtooth pour être entendu
    const playNotificationSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
            const ctx = audioCtxRef.current
            if (ctx.state === 'suspended') ctx.resume()
            const now = ctx.currentTime

            const comp = ctx.createDynamicsCompressor()
            comp.threshold.value = -6
            comp.knee.value = 0
            comp.ratio.value = 20
            comp.attack.value = 0.001
            comp.release.value = 0.05
            comp.connect(ctx.destination)

            // Triple bip fort : Do5 → Mi5 → Sol5
            const notes = [
                { freq: 1046, t: 0.00 },
                { freq: 1318, t: 0.22 },
                { freq: 1568, t: 0.44 },
                { freq: 1318, t: 0.66 },
                { freq: 1046, t: 0.88 },
            ]
            for (const { freq, t } of notes) {
                const osc  = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sawtooth'
                osc.frequency.value = freq
                const s = now + t
                gain.gain.setValueAtTime(0, s)
                gain.gain.linearRampToValueAtTime(1.0, s + 0.015)
                gain.gain.setValueAtTime(1.0, s + 0.14)
                gain.gain.linearRampToValueAtTime(0, s + 0.19)
                osc.connect(gain).connect(comp)
                osc.start(s)
                osc.stop(s + 0.21)
            }
        } catch {}
    }, [])

    const sendNotification = useCallback((title: string, body: string) => {
        playNotificationSound()
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' })
        }
    }, [playNotificationSound])

    /**
     * Chargement agrégé vendeur : chaque bloc réseau est **indépendant** pour ne pas figer l’UI
     * (échec abonnés ≠ écran commandes). `withRetry` garantit **4 tentatives** (1 + 3 relances) minimum.
     */
    const loadSellerDashboardData = useCallback(async () => {
        if (!user?.id) {
            setSellerBootstrapPhase('not_found')
            setSellerBootstrapMessage('Session utilisateur introuvable. Reconnectez-vous.')
            setOrdersLoading(false)
            setNegotiationsLoading(false)
            setNegotiationsError(null)
            return
        }

        setSellerBootstrapPhase('loading')
        setSellerBootstrapMessage('')
        setNegotiationsError(null)
        setOrdersLoading(true)
        setNegotiationsLoading(true)

        let vendorSessionOk = false

        try {
            await withRetry(async () => {
                const { count, error } = await supabase
                    .from('seller_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('seller_id', user.id)
                if (error) throw new Error(error.message)
                setFollowerCount(count || 0)
            }, { label: 'DashboardClient seller_follows', maxAttempts: 4 })
        } catch (err) {
            console.error('Erreur abonnés:', err)
            setFollowerCount(0)
        }


        try {
            const result = await withRetry(() => getVendorOrders(), { label: 'DashboardClient getVendorOrders', maxAttempts: 4 })
            setOrders(result.orders || [])
            if (!result.vendorId) {
                setSellerBootstrapPhase('not_found')
                setSellerBootstrapMessage(
                    'Ce compte n’est pas reconnu comme vendeur ou la session serveur a expiré. Reconnectez-vous ou rechargez la page depuis le menu.',
                )
            } else {
                vendorSessionOk = true
            }
        } catch (err: any) {
            setSellerBootstrapPhase('error')
            setSellerBootstrapMessage(err?.message || 'Impossible de charger les commandes après plusieurs tentatives.')
            setOrders([])
        } finally {
            setOrdersLoading(false)
        }

        try {
            const result = await withRetry(() => getSellerNegotiations(), { label: 'DashboardClient getSellerNegotiations', maxAttempts: 4 })
            setNegotiations(result.negotiations || [])
        } catch (err: any) {
            setNegotiations([])
            setNegotiationsError(err?.message || 'Échec du chargement des négociations après plusieurs tentatives.')
            console.error(err)
        } finally {
            setNegotiationsLoading(false)
        }

        try {
            const result = await withRetry(() => getUnreadCount(), { label: 'DashboardClient getUnreadCount', maxAttempts: 4 })
            setUnreadMessages(result.count || 0)
        } catch (err) {
            console.error('Erreur messages:', err)
        }

        try {
            const count = await withRetry(() => getUnreadNotifCount(), { label: 'DashboardClient getUnreadNotifCount', maxAttempts: 4 })
            setUnreadNotifs(count)
        } catch (err) {
            console.error('Erreur notifs:', err)
        }

        if (vendorSessionOk) {
            setSellerBootstrapPhase('ready')
            setSellerBootstrapMessage('')
        }
    }, [user?.id, sellerDataRetryKey, supabase])

    useEffect(() => {
        void loadSellerDashboardData()
    }, [loadSellerDashboardData])

    /** Quand le serveur renvoie une nouvelle liste (après `router.refresh()`), on fusionne sans F5 manuel. */
    useEffect(() => {
        setProducts(initialProducts || [])
    }, [initialProducts])

    // Filet de sécu : au retour sur l’onglet, même logique de **retry** que le chargement initial.
    useEffect(() => {
        if (!user?.id) return
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return
            void withRetry(() => getVendorOrders(), { label: 'DashboardClient visibility refetch', maxAttempts: 4 })
                .then((r) => setOrders(r.orders || []))
                .catch(() => {})
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [user?.id])

    // Real-time orders — order:insert
    // Les nouvelles commandes démarrent toujours en "pending" donc ce handler
    // met surtout à jour la liste si une commande arrive déjà confirmée (cas rare).
    // L'alarme vendeur est gérée UNIQUEMENT par le canal direct vendor-direct-{id}.
    useRealtime('order:insert', (payload) => {
        if (!user?.id) return
        const newOrder = payload.new as any
        const vendorItems = newOrder.items?.filter((i: any) => i.seller_id === user.id) || []
        if (vendorItems.length > 0 && newOrder.status !== 'pending') {
            setOrders(prev => [newOrder, ...prev])
        }
    }, [user?.id])

    // Real-time orders — order:update
    // Toast + mise à jour de la liste seulement.
    // L'alarme vendeur est gérée UNIQUEMENT par le canal direct vendor-direct-{id}.
    useRealtime('order:update', (payload) => {
        if (!user?.id) return
        const updated = payload.new as any
        const vendorItems = updated.items?.filter((i: any) => i.seller_id === user.id) || []
        if (vendorItems.length === 0) return

        const productNames = vendorItems.map((i: any) => i.name).join(', ')
        const deliveryLabel = updated.delivery_mode === 'express' ? '⚡ EXPRESS 3-6H' : '📦 Standard'

        if (updated.status === 'confirmed') {
            const desc = `${productNames} · ${deliveryLabel} · ${updated.total_amount?.toLocaleString('fr-FR')} FCFA`
            toast.success(`Commande confirmée — ${updated.customer_name} !`, { description: desc, duration: 10000 })
            sendNotification(`Commande confirmée — ${deliveryLabel}`, `${productNames} · ${updated.customer_name}`)
        }

        setOrders(prev => {
            const exists = prev.find(o => o.id === updated.id)
            if (exists) return prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)
            if (updated.status !== 'pending') return [updated, ...prev]
            return prev
        })
    }, [user?.id])

    // Real-time negotiations
    useRealtime('negotiation:insert', (payload) => {
        if (!user?.id) return
        const newNeg = payload.new as any
        setNegotiations(prev => [newNeg, ...prev])
        const desc = `${newNeg.buyer_name || 'Client'} propose ${newNeg.proposed_price?.toLocaleString('fr-FR')} FCFA`
        toast.success('Nouvelle offre de négociation !', { description: desc })
        sendNotification('Nouvelle offre !', desc)
    }, [user?.id])

    useRealtime('negotiation:update', (payload) => {
        const updated = payload.new as any
        setNegotiations(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n))
    })

    // Real-time messages
    useRealtime('message:insert', (payload) => {
        if (!user?.id) return
        const msg = payload.new as any
        if (msg.sender_id !== user.id) {
            setUnreadMessages(prev => prev + 1)
            toast.success('Nouveau message !', { description: msg.content?.slice(0, 50) })
            sendNotification('Nouveau message', msg.content?.slice(0, 50) || '')
        }
    }, [user?.id])

    // ─── Canal direct vendeur — alarme + badge (bypass RealtimeProvider) ──────
    // Les subscriptions orders n'ont PAS de filtre → pas besoin de REPLICA IDENTITY FULL.
    // La subscription notifications (filtrée) s'ajoute en bonus si REPLICA IDENTITY FULL est actif.
    useEffect(() => {
        if (!user?.id) return
        const vendorId = user.id
        const client = getSupabaseBrowserClient()

        const channel = client
            .channel(`vendor-direct-${vendorId}`)
            // Commande confirmée → alarme + badge
            // Pas de filtre sur orders → pas besoin de REPLICA IDENTITY FULL
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' } as any,
                (payload: any) => {
                    const o = payload.new
                    const items = (o?.items || []).filter((i: any) => i.seller_id === vendorId)
                    if (items.length > 0 && o.status === 'confirmed') {
                        const label = items.map((i: any) => i.name).join(', ')
                        triggerVendorAlarm(o.id || String(Date.now()), o.customer_name || '?', label)
                        setUnreadNotifs(prev => prev + 1)
                    }
                })
            .subscribe()

        return () => { client.removeChannel(channel) }
    }, [user?.id, triggerVendorAlarm])

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
            /** Soft refresh Next.js : met à jour les props RSC (`initialProducts`, compteurs) sans rechargement complet du document. */
            router.refresh()
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
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || 'Erreur mise à jour')
        } finally { setUpdating(null) }
    }

    const totalViews = products?.reduce((acc: number, p: any) => acc + (p.views_count || 0), 0) || 0
    const totalOrders = orders.length
    const totalRevenue = useMemo(() =>
        orders
            .filter((o: any) => o.payout_status === 'paid')
            .reduce((acc: number, o: any) => acc + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)
    , [orders])
    const pendingNegotiationsCount = negotiations.filter(n => n.status === 'en_attente').length

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'delivered': return { label: 'Livrée', style: 'bg-green-100 text-green-700' }
            case 'shipped': return { label: 'Colis prêt', style: 'bg-purple-100 text-purple-700' }
            case 'confirmed': return { label: 'À préparer', style: 'bg-orange-100 text-orange-700' }
            default: return { label: 'En attente', style: 'bg-yellow-100 text-yellow-700' }
        }
    }

    const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">

            {/* ===== ACTIVATION NOTIFICATIONS PUSH ===== */}
            <VendorPushPrompt />

            {/* ===== BANNIÈRE ALARME NOUVELLE COMMANDE ===== */}
            {alarmOrders.length > 0 && (
                <button
                    onClick={() => { dismissVendorAlarm(); setActivePage('orders') }}
                    className="fixed top-0 left-0 right-0 z-[99999] w-full flex items-center justify-between gap-3 px-5 py-4 bg-red-600 text-white shadow-2xl animate-pulse cursor-pointer border-b-4 border-red-800"
                    style={{ animation: 'pulse 0.6s ease-in-out infinite' }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🛒</span>
                        <div className="text-left">
                            <p className="font-black text-sm uppercase tracking-wide leading-tight">
                                {alarmOrders.length > 1
                                    ? `${alarmOrders.length} nouvelles commandes !`
                                    : `Nouvelle commande — ${alarmOrders[0].customer_name}`}
                            </p>
                            <p className="text-[11px] text-red-200 font-bold truncate max-w-[220px] sm:max-w-none">
                                {alarmOrders[0].label}
                                {alarmOrders.length > 1 && ` + ${alarmOrders.length - 1} autre${alarmOrders.length > 2 ? 's' : ''}`}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 bg-white text-red-600 font-black text-[10px] uppercase px-3 py-2 rounded-xl">
                        ✋ Arrêter
                    </div>
                </button>
            )}

            {/* Décalage du contenu quand la bannière est visible */}
            {alarmOrders.length > 0 && <div className="fixed top-0 left-0 right-0 h-[68px] z-[99998] pointer-events-none" />}

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
                        const badge = item.id === 'negotiations' && pendingNegotiationsCount > 0
                            ? pendingNegotiationsCount
                            : item.id === 'messages' && unreadMessages > 0
                                ? unreadMessages
                                : item.id === 'notifs' && unreadNotifs > 0
                                    ? unreadNotifs
                                    : null
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
                    <Link
                        href="/vendor/ad-campaigns"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    >
                        <Megaphone size={20} />
                        {sidebarOpen && <span>Campagnes pub</span>}
                    </Link>
                </nav>

                {showVendorPlanCta && (
                    <div className="px-3 pb-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => openUpgradeFlow()}
                            title={sidebarOpen ? undefined : 'Activer mon abonnement'}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-white text-[9px] font-black uppercase tracking-wide shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={vendorPlanBtnStyle}
                        >
                            <span className="inline-flex items-center gap-0.5 flex-shrink-0">
                                <Crown size={sidebarOpen ? 16 : 18} strokeWidth={2.5} />
                                {sidebarOpen && <Sparkles size={13} className="opacity-90" strokeWidth={2.5} />}
                            </span>
                            {sidebarOpen && <span className="leading-tight text-left">Activer mon abonnement</span>}
                        </button>
                    </div>
                )}

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
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-50 flex overflow-x-auto no-scrollbar gap-1 py-2 px-2 safe-area-bottom">
                {menuItems.map(item => {
                    const Icon = item.icon
                    const isActive = activePage === item.id
                    const badge = item.id === 'messages' && unreadMessages > 0
                        ? unreadMessages
                        : item.id === 'notifs' && unreadNotifs > 0
                        ? unreadNotifs
                        : null
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`relative flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-xl transition-all flex-shrink-0 ${isActive ? 'text-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'text-slate-400'}`}
                        >
                            <Icon size={18} />
                            <span className="text-[7px] font-black uppercase whitespace-nowrap">{item.label}</span>
                            {badge && (
                                <span className="absolute -top-1 -right-0.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {badge > 9 ? '9+' : badge}
                                </span>
                            )}
                        </button>
                    )
                })}
                <Link
                    href="/vendor/ad-campaigns"
                    className="relative flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-xl transition-all flex-shrink-0 text-slate-400 hover:text-orange-500"
                >
                    <Megaphone size={18} />
                    <span className="text-[7px] font-black uppercase whitespace-nowrap">Pubs</span>
                </Link>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 pb-24 md:pb-0 overflow-y-auto">
                {/* CTA abonnement — mobile (menu en bas : bandeau sous le header de page) */}
                {showVendorPlanCta && (
                    <div className="md:hidden px-3 pt-3 pb-1">
                        <button
                            type="button"
                            onClick={() => openUpgradeFlow()}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-white text-[10px] font-black uppercase tracking-wide shadow-lg transition-transform active:scale-[0.98]"
                            style={vendorPlanBtnStyle}
                        >
                            <span className="inline-flex items-center gap-0.5 flex-shrink-0">
                                <Crown size={17} strokeWidth={2.5} />
                                <Sparkles size={14} className="opacity-90" strokeWidth={2.5} />
                            </span>
                            Activer mon abonnement
                        </button>
                    </div>
                )}

                {/* Bannière vérification */}
                <VerificationBanner verificationStatus={profile?.verification_status} />

                {/* Bannière plan différé */}
                {pendingPlan && subscriptionStatus === 'active' && (() => {
                    const planNames: Record<string, string> = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }
                    const planEmojis: Record<string, string> = { starter: '🚀', pro: '⭐', premium: '👑' }
                    const endDate = new Date(profile?.subscription_end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    return (
                        <div className="mx-4 md:mx-8 mt-4 flex items-center gap-3 rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm">
                            <span className="text-xl">{planEmojis[pendingPlan.plan] || '📅'}</span>
                            <p className="text-blue-800 dark:text-blue-200 font-semibold">
                                Votre plan <strong>{planNames[pendingPlan.plan] || pendingPlan.plan}</strong> démarrera automatiquement le <strong>{endDate}</strong> à la fin de votre abonnement actuel.
                            </p>
                        </div>
                    )
                })()}

                {/* État global données vendeur : visible sur toutes les pages sans bloquer la navigation latérale. */}
                {sellerBootstrapPhase === 'error' && (
                    <div
                        role="alert"
                        className="mx-4 md:mx-8 mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm"
                    >
                        <div className="flex items-start gap-2 flex-1 text-red-800 dark:text-red-200">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="font-bold">{sellerBootstrapMessage || 'Erreur lors du chargement des données vendeur.'}</span>
                        </div>
                        <button
                            type="button"
                            onClick={refetchSellerDashboard}
                            className="shrink-0 rounded-xl bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wide hover:bg-red-700 transition-colors"
                        >
                            Réessayer
                        </button>
                    </div>
                )}
                {sellerBootstrapPhase === 'not_found' && (
                    <div
                        role="status"
                        className="mx-4 md:mx-8 mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
                    >
                        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-black uppercase text-[10px] tracking-wide text-amber-700 dark:text-amber-300 mb-1">Accès ou session</p>
                            <p className="font-bold">{sellerBootstrapMessage}</p>
                        </div>
                        <button
                            type="button"
                            onClick={refetchSellerDashboard}
                            className="shrink-0 rounded-xl bg-amber-600 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-amber-700 transition-colors"
                        >
                            Réessayer
                        </button>
                    </div>
                )}

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
                            if (page === 'add' && (isAtLimit || isExpired)) {
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
                        isExpired={isExpired}
                        isGrace={isGrace}
                        subscriptionStatus={subscriptionStatus}
                        daysRemaining={daysRemaining}
                        totalDays={totalDays}
                        onUpgrade={() => openUpgradeFlow()}
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
                        onEdit={(product: any) => {
                            setEditingProduct(product)
                            setActivePage('edit')
                        }}
                        onDelete={handleDeleteProduct}
                        deleting={deleting}
                        isAtLimit={isAtLimit}
                        currentPlan={currentPlan}
                        maxProducts={maxProducts}
                        currentProductCount={currentProductCount}
                        onUpgrade={() => openUpgradeFlow()}
                        onProductsChange={setProducts}
                        isPatisserie={profile?.vendor_type === 'patisserie'}
                    />
                )}

                {activePage === 'add' && (
                    <div className="p-4 md:p-8 max-w-4xl mx-auto">
                        {/* Gate abonnement — pas encore de plan choisi */}
                        {!profile?.subscription_plan ? (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-orange-200 dark:border-orange-800/30">
                                <div className="text-6xl mb-4">📦</div>
                                <h2 className="text-xl font-black uppercase italic text-orange-500 mb-2">Abonnement requis</h2>
                                <p className="text-sm text-slate-500 mb-2 max-w-md mx-auto">
                                    Vous pouvez explorer votre dashboard librement.
                                </p>
                                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                                    Pour publier des produits et commencer à vendre, choisissez d'abord votre abonnement.
                                </p>
                                <button
                                    onClick={() => openUpgradeFlow()}
                                    className="inline-block text-white px-8 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-xl transition-all shadow-lg no-underline"
                                    style={{ background: 'linear-gradient(135deg, #E8A838, #D4782F)', boxShadow: '0 8px 24px rgba(232,168,56,0.3)' }}
                                >
                                    🚀 Choisir mon abonnement
                                </button>
                            </div>
                        ) : /* Gate vérification */
                        profile?.verification_status !== 'verified' ? (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-amber-200 dark:border-amber-800/30">
                                <div className="text-6xl mb-4">🔒</div>
                                <h2 className="text-xl font-black uppercase italic text-amber-500 mb-2">Vérification requise</h2>
                                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                                    Votre compte doit être vérifié avant de pouvoir publier des produits.
                                    Soumettez vos documents pour activer la publication.
                                </p>
                                <a
                                    href="/vendor/verification"
                                    className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-xl transition-all shadow-lg shadow-amber-500/20 no-underline"
                                >
                                    🛡️ Vérifier mon compte
                                </a>
                            </div>
                        ) : (<>
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
                                            onClick={() => openUpgradeFlow()}
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

                        {isExpired ? (
                            /* Si abonnement expiré → message + bouton renouveler */
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-red-200 dark:border-red-800/30">
                                <div className="text-6xl mb-4">🔴</div>
                                <h2 className="text-xl font-black uppercase italic text-red-500 mb-2">Abonnement expiré</h2>
                                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                                    Votre abonnement {getPlanName(currentPlan)} a expiré. Vos produits sont masqués du site.
                                    Renouvelez pour les réactiver et continuer à publier.
                                </p>
                                <button
                                    onClick={() => openUpgradeFlow()}
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-xl transition-all shadow-lg shadow-red-500/20"
                                >
                                    🔄 Renouveler mon abonnement
                                </button>
                            </div>
                        ) : isAtLimit ? (
                            /* Si limite atteinte → message + bouton upgrade */
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-red-200 dark:border-red-800/30">
                                <div className="text-6xl mb-4">🔒</div>
                                <h2 className="text-xl font-black uppercase italic text-red-500 mb-2">Limite de produits atteinte</h2>
                                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                                    Votre plan {getPlanName(currentPlan)} est limité à {maxProducts} produits.
                                    Passez au niveau supérieur pour continuer à publier.
                                </p>
                                <button
                                    onClick={() => openUpgradeFlow()}
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-xl transition-all shadow-lg shadow-orange-500/20"
                                >
                                    🚀 Voir les plans supérieurs
                                </button>
                            </div>
                        ) : profile?.vendor_type === 'patisserie' ? (
                            /* Pâtissier → formulaire spécialisé avec options/combos */
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">🎂 Nouveau produit</h2>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Ajoutez un produit à votre menu</p>
                                </div>
                                <PatisserieProductForm
                                    sellerId={user?.id}
                                    onSuccess={() => { setActivePage('products'); router.refresh() }}
                                    onCancel={() => setActivePage('products')}
                                />
                            </>
                        ) : (
                            /* Vendeur marketplace → formulaire normal */
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Nouveau Produit</h2>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Remplissez les informations</p>
                                </div>
                                <AddProductForm
                                    sellerId={user?.id}
                                    isVendorAccount={profile?.role === 'vendor'}
                                    verificationStatus={profile?.verification_status}
                                    vendorType={profile?.vendor_type}
                                    vendorPages={profile?.vendor_pages}
                                />
                            </>
                        )}
                        </>)}
                    </div>
                )}

                {activePage === 'edit' && editingProduct && profile?.vendor_type === 'patisserie' && (
                    <div className="p-4 md:p-8 max-w-2xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">✏️ Modifier le produit</h2>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1 truncate">{editingProduct.name}</p>
                        </div>
                        <PatisserieProductForm
                            sellerId={user?.id}
                            initialProduct={editingProduct}
                            onSuccess={(updated) => {
                                // Mettre à jour le produit dans la liste locale
                                setProducts((prev: any[]) => prev.map((p: any) => p.id === updated.id ? { ...p, ...updated } : p))
                                setEditingProduct(null)
                                setActivePage('products')
                                router.refresh()
                            }}
                            onCancel={() => { setEditingProduct(null); setActivePage('products') }}
                        />
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
                        ordersBlockState={
                            !user?.id
                                ? 'not_found'
                                : ordersLoading
                                  ? 'loading'
                                  : sellerBootstrapPhase === 'error'
                                    ? 'error'
                                    : sellerBootstrapPhase === 'not_found'
                                      ? 'not_found'
                                      : 'ready'
                        }
                        ordersBlockMessage={sellerBootstrapMessage}
                        onRetryOrders={refetchSellerDashboard}
                    />
                )}

                {activePage === 'negotiations' && (
                    <NegotiationsPage
                        negotiations={negotiations}
                        negotiationsLoading={negotiationsLoading}
                        negotiationsError={negotiationsError}
                        onRetryNegotiations={refetchSellerDashboard}
                        onRespond={async (negotiationId: string, response: 'accepte' | 'refuse') => {
                            const result = await respondToNegotiation({ negotiationId, response })
                            if (result.error) {
                                toast.error(result.error)
                            } else {
                                setNegotiations(prev => prev.map(n => n.id === negotiationId ? { ...n, status: response } : n))
                                toast.success(response === 'accepte' ? 'Offre acceptée !' : 'Offre refusée')
                            }
                        }}
                    />
                )}

                {activePage === 'messages' && (
                    <MessagesPanel userId={user?.id} />
                )}

                {activePage === 'notifs' && (
                    <VendorNotificationsPage userId={user?.id} onUnreadChange={setUnreadNotifs} />
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

                {activePage === 'hotel_reviews' && isHotel && (
                    <HotelReviewsPage hotelId={user?.id} products={products} profile={profile} />
                )}

                {activePage === 'settings' && (
                    <SettingsPage profile={profile} user={user} supabase={supabase} currentPlan={currentPlan} />
                )}
            </main>

            {/* ═══ MODAL : Limite atteinte ═══ */}
            {showLimitWarning && maxProducts !== -1 && (
                <LimitWarning
                    currentProducts={currentProductCount}
                    maxProducts={maxProducts}
                    currentPlan={getPlanName(currentPlan)}
                    onUpgrade={() => { setShowLimitWarning(false); openUpgradeFlow() }}
                    onClose={() => setShowLimitWarning(false)}
                />
            )}

            {/* ═══ OVERLAY : Réactivation rapide (immobilier) ═══ */}
            {showReactivation && isImmo && (
                <ImmoReactivationOverlay
                    currentPlan={currentPlan}
                    onClose={() => setShowReactivation(false)}
                    onChangeFormula={() => {
                        setShowReactivation(false)
                        setShowUpgradePricing(true)
                    }}
                />
            )}

            {/* ═══ OVERLAY : Réactivation rapide (hôtellerie) ═══ */}
            {showReactivation && isHotel && (
                <HotelReactivationOverlay
                    currentPlan={currentPlan}
                    onClose={() => setShowReactivation(false)}
                    onChangeFormula={() => {
                        setShowReactivation(false)
                        setShowUpgradePricing(true)
                    }}
                />
            )}

            {/* ═══ OVERLAY : Réactivation rapide (marketplace) ═══ */}
            {showReactivation && !isImmo && !isHotel && (() => {
                const planObj = PLANS.find(p => p.id === currentPlan)
                if (!planObj) return null
                const price = upgradeBilling === 'yearly' ? planObj.yearlyPrice : planObj.price
                const billingLabel = upgradeBilling === 'yearly' ? '/ an' : '/ mois'
                const savings = Math.round(((planObj.price * 12 - planObj.yearlyPrice) / (planObj.price * 12)) * 100)
                return (
                    <div style={{
                        position: "fixed", inset: 0, zIndex: 1000,
                        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
                        overflowY: "auto",
                    }}>
                        <div style={{
                            maxWidth: 480, margin: "0 auto", padding: "28px 16px",
                            minHeight: "100vh",
                            background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
                            fontFamily: SYSTEM_FONT_STACK,
                        }}>
                            {/* Retour */}
                            <button
                                onClick={() => setShowReactivation(false)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    background: "none", border: "none", color: "#888",
                                    fontSize: 13, cursor: "pointer", marginBottom: 24, padding: 0,
                                }}
                            >
                                ← Retour au dashboard
                            </button>

                            {/* Titre */}
                            <div style={{ textAlign: "center", marginBottom: 28 }}>
                                <div style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 64, height: 64, borderRadius: 20,
                                    background: planObj.gradient,
                                    fontSize: 32, marginBottom: 16,
                                    boxShadow: `0 8px 24px ${planObj.shadowColor}`,
                                }}>
                                    {planObj.emoji}
                                </div>
                                <h2 style={{ color: "#F0ECE2", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
                                    Réactiver votre abonnement
                                </h2>
                                <p style={{ color: "#888", fontSize: 14, margin: 0 }}>
                                    Retrouvez votre plan <span style={{ color: planObj.color, fontWeight: 700 }}>{planObj.name}</span> et remettez vos produits en ligne.
                                </p>
                            </div>

                            {/* Toggle mensuel / annuel */}
                            <div style={{
                                display: "flex", justifyContent: "center", gap: 0,
                                background: "#1A1A28", borderRadius: 14, padding: 4,
                                marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)",
                            }}>
                                {(['monthly', 'yearly'] as const).map(b => (
                                    <button
                                        key={b}
                                        onClick={() => setUpgradeBilling(b)}
                                        style={{
                                            flex: 1, padding: "10px 0", borderRadius: 10,
                                            background: upgradeBilling === b ? planObj.color : "transparent",
                                            color: upgradeBilling === b ? "#fff" : "#888",
                                            fontWeight: 700, fontSize: 13, border: "none",
                                            cursor: "pointer", transition: "all 0.2s",
                                        }}
                                    >
                                        {b === 'monthly' ? 'Mensuel' : `Annuel`}
                                        {b === 'yearly' && (
                                            <span style={{
                                                marginLeft: 6, fontSize: 10, fontWeight: 800,
                                                background: upgradeBilling === 'yearly' ? "rgba(255,255,255,0.25)" : "#2A2A3A",
                                                color: upgradeBilling === 'yearly' ? "#fff" : "#4ADE80",
                                                padding: "1px 6px", borderRadius: 6,
                                            }}>
                                                -{savings}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Carte plan */}
                            <div style={{
                                background: "#12121C", borderRadius: 24,
                                border: `1.5px solid ${planObj.color}40`,
                                padding: "24px 20px", marginBottom: 20,
                                boxShadow: `0 8px 32px ${planObj.shadowColor}`,
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                    <div>
                                        <span style={{ color: planObj.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                                            Votre plan
                                        </span>
                                        <h3 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 900, margin: "4px 0 0" }}>
                                            {planObj.icon} {planObj.name}
                                        </h3>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ color: planObj.color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                                            {new Intl.NumberFormat("fr-FR").format(price)} F
                                        </div>
                                        <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{billingLabel}</div>
                                    </div>
                                </div>
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                                    {planObj.features.filter(f => f.included).slice(0, 4).map((f, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                            <span style={{ fontSize: 14 }}>{f.icon}</span>
                                            <span style={{ color: "#C0BAA8", fontSize: 13 }}>{f.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bouton réactiver */}
                            <button
                                onClick={() => {
                                    setUpgradeSelectedPlan(planObj)
                                    setShowReactivation(false)
                                    setShowUpgradeCheckout(true)
                                }}
                                style={{
                                    width: "100%", padding: "16px",
                                    background: planObj.gradient,
                                    color: "#fff", fontWeight: 800, fontSize: 16,
                                    borderRadius: 16, border: "none", cursor: "pointer",
                                    boxShadow: `0 8px 24px ${planObj.shadowColor}`,
                                    marginBottom: 16,
                                }}
                            >
                                Réactiver mon abonnement {planObj.name} {planObj.icon}
                            </button>

                            {/* Lien changer de formule */}
                            <div style={{ textAlign: "center" }}>
                                <button
                                    onClick={() => {
                                        setShowReactivation(false)
                                        setShowUpgradePricing(true)
                                    }}
                                    style={{
                                        background: "none", border: "none",
                                        color: "#888", fontSize: 13, cursor: "pointer",
                                        textDecoration: "underline", textUnderlineOffset: 3,
                                    }}
                                >
                                    Changer de formule →
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ═══ OVERLAY : Pricing upgrade (immobilier) ═══ */}
            {showUpgradePricing && isImmo && (
                <ImmoUpgradeOverlay
                    currentPlan={currentPlan}
                    onClose={() => setShowUpgradePricing(false)}
                />
            )}

            {/* ═══ OVERLAY : Pricing upgrade (hôtellerie) ═══ */}
            {showUpgradePricing && isHotel && (
                <HotelUpgradeOverlay
                    currentPlan={currentPlan}
                    onClose={() => setShowUpgradePricing(false)}
                />
            )}

            {/* ═══ OVERLAY : Pricing upgrade (marketplace) ═══ */}
            {showUpgradePricing && !isImmo && !isHotel && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
                    overflowY: "auto",
                }}>
                    <div style={{
                        maxWidth: 560, margin: "0 auto", padding: "24px 16px",
                        minHeight: "100vh",
                        background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
                        fontFamily: SYSTEM_FONT_STACK,
                    }}>
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
                        fontFamily: SYSTEM_FONT_STACK,
                    }}>
                        <SubscriptionCheckout
                            plan={upgradeSelectedPlan}
                            billing={upgradeBilling}
                            onBack={() => { setShowUpgradeCheckout(false); setShowUpgradePricing(true) }}
                            onComplete={() => {
                                setShowUpgradeCheckout(false)
                                // Recharger la page proprement pour avoir le nouveau plan
                                window.location.href = '/vendor/dashboard'
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
function DashboardHome({ user, profile, orders, followerCount, totalRevenue, totalViews, totalOrders, productCount, copied, onCopyLink, onNavigate, getStatusDetails, currentPlan, maxProducts, isApproachingLimit, isAtLimit, isExpired, isGrace, subscriptionStatus, daysRemaining, totalDays, onUpgrade }: any) {
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

            {/* ═══ Bandeau expiration abonnement ═══ */}
            {currentPlan !== 'free' && subscriptionStatus !== 'legacy' && subscriptionStatus !== 'free' && (
                <div className={`rounded-3xl p-5 ${
                    isExpired
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                        : isGrace
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            : daysRemaining <= 5
                                ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
                                : 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                }`}>
                    {isExpired ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-black uppercase text-sm">🔴 Abonnement expiré — Vos produits sont masqués</h3>
                                <p className="text-white/80 text-xs font-bold mt-1">
                                    Vos {productCount || 0} produit(s) ne sont plus visibles sur le site. Renouvelez pour les réactiver.
                                </p>
                            </div>
                            <button
                                onClick={onUpgrade}
                                className="flex items-center gap-2 bg-white text-red-600 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg whitespace-nowrap"
                            >
                                🔄 Renouveler maintenant
                            </button>
                        </div>
                    ) : isGrace ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-black uppercase text-sm">⚠️ Abonnement expiré — Période de grâce</h3>
                                <p className="text-white/80 text-xs font-bold mt-1">
                                    Vos produits seront masqués dans {Math.max(0, daysRemaining + 3)} jour(s). Renouvelez maintenant pour éviter l'interruption.
                                </p>
                            </div>
                            <button
                                onClick={onUpgrade}
                                className="flex items-center gap-2 bg-white text-red-500 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg whitespace-nowrap"
                            >
                                🔄 Renouveler
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-black uppercase ${
                                    daysRemaining <= 5 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                }`}>
                                    📦 Plan {getPlanName(currentPlan)} · {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                                </span>
                                {daysRemaining <= 5 && (
                                    <button
                                        onClick={onUpgrade}
                                        className="text-[10px] font-black text-red-500 dark:text-red-400 hover:underline uppercase"
                                    >
                                        Renouveler
                                    </button>
                                )}
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        daysRemaining <= 5 ? 'bg-red-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100))}%` }}
                                />
                            </div>
                            {daysRemaining <= 5 && (
                                <p className={`text-[10px] font-bold mt-2 ${
                                    daysRemaining <= 5 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'
                                }`}>
                                    ⚠️ Pensez à renouveler votre abonnement !
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Upgrade banner — visible quand on approche de la limite */}
            {isApproachingLimit && !isExpired && (
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
// VENDOR NOTIFICATIONS PAGE
// =====================================================================
function VendorNotificationsPage({ userId, onUnreadChange }: { userId?: string; onUnreadChange?: (n: number) => void }) {
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const typeIcons: Record<string, { icon: any; color: string }> = {
        order_confirmed: { icon: ShoppingCart, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
        order_delivered: { icon: Package, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
        new_negotiation: { icon: Tag, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
        negotiation_response: { icon: DollarSign, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
        new_message: { icon: MessageCircle, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    }

    useEffect(() => {
        getNotifications(50).then(result => {
            setNotifs(result.notifications || [])
            setLoading(false)
        })
    }, [])

    useRealtime('notification:insert', (payload) => {
        setNotifs(prev => [payload.new as any, ...prev])
    })

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
        onUnreadChange?.(0)
    }

    const handleClickNotif = async (notif: any) => {
        if (!notif.is_read) {
            markAsRead(notif.id).catch(() => {})
            setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
            onUnreadChange?.((await getUnreadNotifCount()) || 0)
        }
        if (notif.link) router.push(notif.link)
    }

    const unreadCount = notifs.filter(n => !n.is_read).length

    if (loading) {
        return <div className="p-4 md:p-8 flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Notifications</h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">{unreadCount} non lue{unreadCount !== 1 ? 's' : ''}</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-black uppercase text-orange-500 hover:underline">
                        Tout marquer comme lu
                    </button>
                )}
            </div>

            {notifs.length > 0 ? (
                <div className="space-y-2">
                    {notifs.map(n => {
                        const info = typeIcons[n.type] || { icon: Bell, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' }
                        const Icon = info.icon
                        const date = new Date(n.created_at)
                        return (
                            <button
                                key={n.id}
                                onClick={() => handleClickNotif(n)}
                                className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.is_read ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'border-transparent'}`}
                            >
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${info.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-bold truncate ${!n.is_read ? 'dark:text-white' : 'text-slate-500'}`}>{n.title}</p>
                                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </button>
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
// PRODUCTS LIST
// =====================================================================
function ProductsList({ products, onAdd, onEdit, onDelete, deleting, isAtLimit, currentPlan, maxProducts, currentProductCount, onUpgrade, onProductsChange, isPatisserie }: any) {
    const [promoProduct, setPromoProduct] = useState<any>(null)
    const [promoPercentage, setPromoPercentage] = useState(10)
    const [promoDays, setPromoDays] = useState(3)
    const [activatingPromo, setActivatingPromo] = useState(false)
    const [deactivatingPromo, setDeactivatingPromo] = useState<string | null>(null)

    const handleActivatePromo = async () => {
        if (!promoProduct) return
        setActivatingPromo(true)
        try {
            const result = await activatePromo(promoProduct.id, promoPercentage, promoDays)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Promo -${promoPercentage}% activée pour ${promoDays} jour${promoDays > 1 ? 's' : ''}`)
                // Update local state
                onProductsChange?.((prev: any[]) => prev.map((p: any) =>
                    p.id === promoProduct.id
                        ? { ...p, promo_percentage: promoPercentage, promo_start_date: new Date().toISOString(), promo_end_date: new Date(Date.now() + promoDays * 86400000).toISOString() }
                        : p
                ))
                setPromoProduct(null)
            }
        } catch {
            toast.error('Erreur lors de l\'activation de la promo')
        } finally {
            setActivatingPromo(false)
        }
    }

    const handleDeactivatePromo = async (productId: string) => {
        setDeactivatingPromo(productId)
        try {
            const result = await deactivatePromo(productId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Promo désactivée')
                onProductsChange?.((prev: any[]) => prev.map((p: any) =>
                    p.id === productId
                        ? { ...p, promo_percentage: null, promo_start_date: null, promo_end_date: null }
                        : p
                ))
            }
        } catch {
            toast.error('Erreur lors de la désactivation')
        } finally {
            setDeactivatingPromo(null)
        }
    }

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
                    <Plus size={16} /> {isAtLimit ? 'Limite atteinte' : 'Nouveau produit'}
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
                                Upgrader
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
                    {products.map((p: any) => {
                        const hasPromo = isPromoActive(p)
                        return (
                        <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden group hover:shadow-lg transition-all">
                            <div className="relative aspect-[4/3] bg-slate-100">
                                <CloudinaryImage
                                    src={p.img || p.image_url || '/placeholder-image.svg'}
                                    alt={p.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                        <Eye size={10} /> {p.views_count || 0}
                                    </span>
                                    {hasPromo && (
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse">
                                            -{p.promo_percentage}%
                                        </span>
                                    )}
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
                                        {/* Bouton Promo */}
                                        {hasPromo ? (
                                            <button
                                                onClick={() => handleDeactivatePromo(p.id)}
                                                disabled={deactivatingPromo === p.id}
                                                className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 hover:text-orange-600 transition-colors"
                                                title="Désactiver la promo"
                                            >
                                                {deactivatingPromo === p.id ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setPromoProduct(p); setPromoPercentage(10); setPromoDays(3) }}
                                                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors"
                                                title="Activer une promo"
                                            >
                                                <Tag size={14} />
                                            </button>
                                        )}
                                        {/* Bouton Modifier (pâtisserie uniquement) */}
                                        {isPatisserie && (
                                            <button
                                                onClick={() => onEdit?.(p)}
                                                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                                                title="Modifier le produit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
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
                        )
                    })}
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

            {/* Modal Promo */}
            {promoProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPromoProduct(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-black uppercase text-sm tracking-tight dark:text-white">Activer une promo</h3>
                            <button onClick={() => setPromoProduct(null)} className="text-slate-400 hover:text-slate-600">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 truncate">{promoProduct.name}</p>

                        {/* Pourcentage */}
                        <div className="mb-5">
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Réduction</label>
                            <div className="flex gap-2 flex-wrap">
                                {[5, 10, 15, 20, 25, 30, 40, 50].map(pct => (
                                    <button
                                        key={pct}
                                        onClick={() => setPromoPercentage(pct)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                                            promoPercentage === pct
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        -{pct}%
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                Prix promo : <span className="font-black text-red-500">{Math.round(promoProduct.price * (1 - promoPercentage / 100)).toLocaleString('fr-FR')} FCFA</span>
                                <span className="text-slate-300 ml-2 line-through">{promoProduct.price?.toLocaleString('fr-FR')} FCFA</span>
                            </p>
                        </div>

                        {/* Durée */}
                        <div className="mb-6">
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Durée</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 5, 7].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setPromoDays(d)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                                            promoDays === d
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {d}j
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleActivatePromo}
                            disabled={activatingPromo}
                            className="w-full bg-red-500 text-white py-3 rounded-2xl font-black uppercase text-xs hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {activatingPromo ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                            Activer -{promoPercentage}% pendant {promoDays} jour{promoDays > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// ORDERS PAGE
// =====================================================================
function OrdersPage({
    orders,
    ordersLoading,
    orderFilter,
    setOrderFilter,
    filteredOrders,
    updating,
    updateStatus,
    getStatusDetails,
    currentVendorId,
    /** Agrège loading / erreur réseau / accès vendeur refusé — évite un spinner infini ou une liste vide trompeuse. */
    ordersBlockState = 'ready',
    ordersBlockMessage = '',
    onRetryOrders,
}: any) {
    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Commandes</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
            </div>

            {/* Filters — masqués tant que les données commandes ne sont pas exploitables (UX plus claire). */}
            {ordersBlockState === 'ready' && (
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
            )}

            {ordersBlockState === 'loading' || ordersLoading ? (
                <div className="py-20 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-orange-500 mb-3" />
                    <p className="text-xs font-black uppercase text-slate-400">Chargement des commandes...</p>
                </div>
            ) : ordersBlockState === 'error' ? (
                <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/40 px-6">
                    <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
                    <p className="text-xs font-black uppercase text-red-600 dark:text-red-400 mb-2">Erreur réseau ou serveur</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">{ordersBlockMessage || 'Les commandes n’ont pas pu être chargées.'}</p>
                    {onRetryOrders && (
                        <button
                            type="button"
                            onClick={onRetryOrders}
                            className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] hover:bg-orange-600 transition-colors"
                        >
                            Réessayer
                        </button>
                    )}
                </div>
            ) : ordersBlockState === 'not_found' ? (
                <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-amber-100 dark:border-amber-900/40 px-6">
                    <Shield size={40} className="mx-auto text-amber-400 mb-4" />
                    <p className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 mb-2">Accès commandes indisponible</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
                        {ordersBlockMessage || 'Votre session ne permet pas de charger les commandes vendeur.'}
                    </p>
                    {onRetryOrders && (
                        <button
                            type="button"
                            onClick={onRetryOrders}
                            className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] hover:bg-amber-700 transition-colors"
                        >
                            Réessayer
                        </button>
                    )}
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
                                        {order.delivery_mode === 'express' ? (
                                            <span className="px-3 py-1 text-[9px] font-black uppercase rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse">
                                                ⚡ EXPRESS 3-6H
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 text-[9px] font-black uppercase rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                                📦 Standard 6-48H
                                            </span>
                                        )}
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
                                            <CloudinaryImage src={item.img || '/placeholder-image.svg'} alt={item.name || ''} width={40} height={40} className="w-10 h-10 object-cover rounded-xl" />
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
                                        {order.status === 'confirmed' && (
                                            <button
                                                onClick={() => updateStatus(order.id, 'shipped')}
                                                disabled={updating === order.id}
                                                className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-orange-600 transition-all"
                                            >
                                                {updating === order.id ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                                                Colis prêt ✓
                                            </button>
                                        )}
                                        <button
                                            onClick={() => generateInvoice(order)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors"
                                            title="Télécharger le reçu PDF"
                                        >
                                            <Download size={16} />
                                        </button>
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
                        <p className="text-[10px] text-slate-400 font-bold mt-1">6 derniers mois (part vendeur)</p>
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
                                <CloudinaryImage
                                    src={p.img || p.image_url || '/placeholder-image.svg'}
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
                        { step: '3', title: 'Fonds libérés', desc: 'Vous recevez votre part du montant', icon: Wallet },
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
function SettingsPage({ profile, user, supabase, currentPlan }: { profile: any; user: any; supabase: any; currentPlan: string }) {
    const [saving, setSaving] = useState(false)
    const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_url || null)
    const [coverFile, setCoverFile] = useState<File | null>(null)

    // Avatar state
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    // Horaires structurés (planning automatique)
    const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(() => {
        const saved = profile?.shop_schedule
        if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
            return { ...DEFAULT_SCHEDULE, ...(saved as ShopSchedule) }
        }
        return { ...DEFAULT_SCHEDULE }
    })

    const toggleDay = (key: DayKey) =>
        setSchedule(prev => ({ ...prev, [key]: { ...prev[key], closed: !prev[key].closed } }))
    const updateDayTime = (key: DayKey, field: 'open' | 'close', val: string) =>
        setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))

    // GPS state
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
        profile?.latitude && profile?.longitude
            ? { lat: profile.latitude, lng: profile.longitude }
            : null
    )
    const [savingGps, setSavingGps] = useState(false)

    const handleRequestGps = () => {
        if (!navigator.geolocation) {
            toast.error('GPS non disponible sur ce navigateur.')
            return
        }
        setGpsStatus('requesting')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                setGpsStatus('granted')
            },
            () => {
                setGpsStatus('denied')
                toast.error('Position refusée. Autorisez la géolocalisation dans votre navigateur.')
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleSaveGps = async () => {
        if (!gpsCoords) return
        setSavingGps(true)
        try {
            const result = await updateProfile({ latitude: gpsCoords.lat, longitude: gpsCoords.lng })
            if (!result.success) {
                toast.error('Erreur : ' + (result as any).error)
            } else {
                toast.success('Position GPS enregistrée !')
                setGpsStatus('idle')
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur sauvegarde GPS')
        } finally {
            setSavingGps(false)
        }
    }

    const isPatisserie = profile?.vendor_type === 'patisserie'

    const [formData, setFormData] = useState({
        store_name: profile?.store_name || profile?.shop_name || '',
        shop_description: profile?.shop_description || '',
        bio: profile?.bio || '',
        phone: profile?.phone || '',
        city: profile?.city || 'brazzaville',
        return_policy: profile?.return_policy || 'Retours acceptés sous 7 jours après réception, article non utilisé.',
        shipping_info: profile?.shipping_info || 'Livraison à Brazzaville et Pointe-Noire. Délai : 1-3 jours.',
        // Champs pâtisserie
        opening_hours_text: profile?.opening_hours_text || '',
        delivery_time: profile?.delivery_time || '30-60 min',
        min_order: profile?.min_order ?? 0,
        delivery_fee: profile?.delivery_fee ?? 0,
        is_open: profile?.is_open !== false,
    })

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverFile(file)
        setCoverPreview(URL.createObjectURL(file))
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    const uploadAvatarViaApi = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async () => {
                try {
                    const base64 = reader.result as string
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ image: base64 }),
                    })
                    const body = await res.json()
                    if (!res.ok) throw new Error(body.error || 'Erreur upload')
                    resolve(body.url ?? body.secure_url ?? '')
                } catch (e: any) { reject(e) }
            }
            reader.onerror = () => reject(new Error('Lecture fichier échouée'))
            reader.readAsDataURL(file)
        })
    }

    const handleSave = async () => {
        if (!formData.city?.trim()) {
            toast.error('La ville est obligatoire.')
            return
        }
        setSaving(true)
        try {
            let cover_url = coverPreview
            let avatar_url = avatarPreview

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

            if (avatarFile) {
                setUploadingAvatar(true)
                try {
                    avatar_url = await uploadAvatarViaApi(avatarFile)
                } catch {
                    toast.error('Erreur upload photo de profil')
                } finally {
                    setUploadingAvatar(false)
                }
            }

            const result = await updateProfile({
                store_name: formData.store_name,
                shop_description: formData.shop_description,
                bio: formData.bio,
                phone: formData.phone,
                city: formData.city,
                return_policy: formData.return_policy,
                shipping_info: formData.shipping_info,
                cover_url: cover_url || null,
                avatar_url: avatar_url || null,
                ...(isPatisserie ? {
                    is_open: formData.is_open,
                    delivery_time: formData.delivery_time,
                    min_order: Number(formData.min_order),
                    delivery_fee: Number(formData.delivery_fee),
                    shop_schedule: schedule,
                } : {}),
            })

            if (!result.success) {
                toast.error('Erreur : ' + result.error)
            } else {
                toast.success('Paramètres mis à jour !')
                setAvatarFile(null)
                setCoverFile(null)
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

            {/* Avatar / Photo de profil */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-4">Photo de profil</h3>
                <div className="flex items-center gap-5">
                    {/* Aperçu avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
                            {avatarPreview
                                ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                : <span className="text-2xl font-black text-white">
                                    {(profile?.store_name || profile?.shop_name || 'V').charAt(0).toUpperCase()}
                                  </span>
                            }
                        </div>
                        {/* Badge caméra */}
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-md transition-colors"
                        >
                            <Camera size={13} className="text-white" />
                        </button>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold dark:text-white">
                            {avatarFile ? avatarFile.name : avatarPreview ? 'Photo actuelle' : 'Aucune photo'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Apparaît sur ta page boutique et tes produits</p>
                        <div className="flex gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black transition-colors"
                            >
                                {avatarPreview ? 'Changer' : 'Ajouter une photo'}
                            </button>
                            {avatarPreview && (
                                <button
                                    type="button"
                                    onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl text-xs font-black transition-colors"
                                >
                                    Supprimer
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                />
            </div>

            {/* Cover image */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-black uppercase text-sm dark:text-white mb-4">Image de couverture</h3>
                <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-orange-500">
                    {coverPreview && (
                        <>
                            <img src={coverPreview} alt="Couverture" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
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

            {/* Textes boutique (ce que les clients voient en premier sur ta page) */}
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
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                        Slogan / accroche ({SHOP_DESCRIPTION_MAX_LENGTH} car. max)
                    </label>
                    <textarea
                        value={formData.shop_description}
                        maxLength={SHOP_DESCRIPTION_MAX_LENGTH}
                        rows={2}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                shop_description: e.target.value.slice(0, SHOP_DESCRIPTION_MAX_LENGTH),
                            }))
                        }
                        placeholder="Une ligne sous le nom de ta boutique…"
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm resize-none min-h-[4.5rem]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                        {formData.shop_description.length}/{SHOP_DESCRIPTION_MAX_LENGTH}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                        Affiché <strong>sous le nom</strong> sur ta page boutique <strong>et</strong> sur les <strong>fiches produit</strong>.
                    </p>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Description (200 car. max)</label>
                    <textarea
                        value={formData.bio}
                        onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Décrivez votre boutique plus en détail…"
                        rows={3}
                        maxLength={200}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-right">{formData.bio.length}/200</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                        Affichée <strong>en dessous du slogan</strong> sur ta page boutique publique uniquement (pas sur les fiches produit).
                    </p>
                </div>
            </div>

            {/* Coordonnées + politiques + infos : regroupés en bas comme avant */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <h3 className="font-black uppercase text-sm dark:text-white">Coordonnées</h3>
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
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Ville *</label>
                        <select
                            required
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

            {/* ─── Section spécifique Pâtisserie ─── */}
            {isPatisserie && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900/30 p-6 space-y-5">
                    <div>
                        <h3 className="font-black uppercase text-sm dark:text-white flex items-center gap-2">
                            <span className="text-rose-500">🎂</span> Paramètres pâtisserie
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Infos affichées sur votre page boutique pâtisserie</p>
                    </div>

                    {/* Fermeture d'urgence (override manuel) */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${formData.is_open ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <div>
                            <p className="text-sm font-black dark:text-white flex items-center gap-2">
                                <span>{formData.is_open ? '🟢' : '🔴'}</span>
                                {formData.is_open ? 'Ouverture automatique activée' : 'Fermeture d\'urgence active'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {formData.is_open
                                    ? 'La boutique suit les horaires ci-dessous'
                                    : 'Boutique fermée manuellement — clients bloqués même si dans les horaires'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, is_open: !prev.is_open }))}
                            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${formData.is_open ? 'bg-green-500' : 'bg-red-400'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${formData.is_open ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Planning d'ouverture jour par jour */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                            <Clock size={10} /> Horaires automatiques
                        </label>

                        {/* Preview : ouvert maintenant ou pas */}
                        <div className={`mb-3 px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 ${computeIsOpen(schedule, formData.is_open) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            <span>{computeIsOpen(schedule, formData.is_open) ? '● Ouvert maintenant' : '● Fermé maintenant'}</span>
                            <span className="opacity-60">(selon planning + override)</span>
                        </div>

                        <div className="space-y-1.5">
                            {DAY_KEYS.map(key => {
                                const day = schedule[key]
                                return (
                                    <div key={key} className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl transition-colors ${day.closed ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}>
                                        {/* Nom du jour */}
                                        <span className={`w-20 text-[11px] font-black ${day.closed ? 'text-slate-400' : 'text-slate-700 dark:text-white'}`}>
                                            {DAY_LABELS[key]}
                                        </span>
                                        {/* Toggle ouvert/fermé */}
                                        <button
                                            type="button"
                                            onClick={() => toggleDay(key)}
                                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${!day.closed ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${!day.closed ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                        {/* Plages horaires ou label Fermé */}
                                        {day.closed ? (
                                            <span className="text-[10px] text-slate-400 font-bold ml-1">Fermé</span>
                                        ) : (
                                            <div className="flex items-center gap-1.5 ml-1">
                                                <input
                                                    type="time"
                                                    value={day.open}
                                                    onChange={e => updateDayTime(key, 'open', e.target.value)}
                                                    className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-rose-300 w-[5.5rem]"
                                                />
                                                <span className="text-slate-400 text-[10px]">→</span>
                                                <input
                                                    type="time"
                                                    value={day.close}
                                                    onChange={e => updateDayTime(key, 'close', e.target.value)}
                                                    className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-rose-300 w-[5.5rem]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Délai livraison + Commande min + Frais livraison */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Délai livraison</label>
                            <input
                                value={formData.delivery_time}
                                onChange={e => setFormData(prev => ({ ...prev, delivery_time: e.target.value }))}
                                placeholder="30-60 min"
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-rose-400 transition-all font-bold text-sm text-base sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Commande min (FCFA)</label>
                            <input
                                type="number"
                                min={0}
                                value={formData.min_order}
                                onChange={e => setFormData(prev => ({ ...prev, min_order: Number(e.target.value) }))}
                                placeholder="0"
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-rose-400 transition-all font-bold text-sm text-base sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Frais livraison (FCFA)</label>
                            <input
                                type="number"
                                min={0}
                                value={formData.delivery_fee}
                                onChange={e => setFormData(prev => ({ ...prev, delivery_fee: Number(e.target.value) }))}
                                placeholder="0"
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-rose-400 transition-all font-bold text-sm text-base sm:text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Position GPS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                <div>
                    <h3 className="font-black uppercase text-sm dark:text-white">Position GPS de votre boutique</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Utilisée pour calculer automatiquement les frais de livraison pâtisserie.
                    </p>
                </div>

                {/* Coords actuelles */}
                {gpsCoords && gpsStatus !== 'granted' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                        <Navigation size={16} className="text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-green-700 dark:text-green-400">Position enregistrée</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Nouvelles coords en attente de sauvegarde */}
                {gpsStatus === 'granted' && gpsCoords && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                        <Navigation size={16} className="text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-blue-700 dark:text-blue-400">Nouvelle position détectée</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                            </p>
                        </div>
                        <button
                            onClick={handleSaveGps}
                            disabled={savingGps}
                            className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all disabled:opacity-50 flex-shrink-0"
                        >
                            {savingGps ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            {savingGps ? 'Enregistrement…' : 'Sauvegarder'}
                        </button>
                    </div>
                )}

                {/* Bouton demander la position */}
                <button
                    onClick={handleRequestGps}
                    disabled={gpsStatus === 'requesting'}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-black uppercase hover:border-orange-400 hover:text-orange-500 transition-all w-full justify-center disabled:opacity-50"
                >
                    {gpsStatus === 'requesting'
                        ? <><Loader2 size={14} className="animate-spin" /> Localisation en cours…</>
                        : <><Navigation size={14} /> {gpsCoords ? 'Mettre à jour ma position' : 'Définir ma position GPS'}</>
                    }
                </button>

                {gpsStatus === 'denied' && (
                    <p className="text-[10px] text-red-500 font-bold text-center">
                        Accès refusé — autorisez la géolocalisation dans les paramètres de votre navigateur, puis réessayez.
                    </p>
                )}
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
                        <p className="text-xs font-black dark:text-white">
                            Commission de {currentPlan === 'premium' ? '4' : currentPlan === 'pro' ? '7' : '10'}% par vente
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                            Mayombe Market prélève {currentPlan === 'premium' ? '4' : currentPlan === 'pro' ? '7' : '10'}% du montant de chaque commande.
                            Vous recevez {currentPlan === 'premium' ? '96' : currentPlan === 'pro' ? '93' : '90'}% du total une fois la commande livrée et validée (délai 48h de sécurité).
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

// =====================================================================
// NEGOTIATIONS PAGE
// =====================================================================
function NegotiationsPage({ negotiations, negotiationsLoading, negotiationsError, onRetryNegotiations, onRespond }: {
    negotiations: any[]
    negotiationsLoading: boolean
    negotiationsError?: string | null
    onRetryNegotiations?: () => void
    onRespond: (negotiationId: string, response: 'accepte' | 'refuse') => Promise<void>
}) {
    const [filter, setFilter] = useState('all')
    const [responding, setResponding] = useState<string | null>(null)

    const filtered = filter === 'all' ? negotiations
        : negotiations.filter(n => n.status === filter)

    const counts = {
        all: negotiations.length,
        en_attente: negotiations.filter(n => n.status === 'en_attente').length,
        accepte: negotiations.filter(n => n.status === 'accepte').length,
        refuse: negotiations.filter(n => n.status === 'refuse').length,
    }

    const handleRespond = async (id: string, response: 'accepte' | 'refuse') => {
        setResponding(id)
        await onRespond(id, response)
        setResponding(null)
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'accepte': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'refuse': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'accepte': return 'Acceptée'
            case 'refuse': return 'Refusée'
            default: return 'En attente'
        }
    }

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Négociations</h2>
                <p className="text-sm text-slate-400 font-bold mt-1">
                    {counts.en_attente > 0 ? `${counts.en_attente} offre${counts.en_attente > 1 ? 's' : ''} en attente` : 'Gérez les offres de vos clients'}
                </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-6">
                {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'en_attente', label: 'En attente' },
                    { id: 'accepte', label: 'Acceptées' },
                    { id: 'refuse', label: 'Refusées' },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border flex items-center gap-2 ${filter === f.id
                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                            }`}
                    >
                        {f.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${filter === f.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {counts[f.id as keyof typeof counts]}
                        </span>
                    </button>
                ))}
            </div>

            {negotiationsError && !negotiationsLoading && (
                <div
                    role="alert"
                    className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3"
                >
                    <p className="text-sm font-bold text-red-800 dark:text-red-200 flex-1">{negotiationsError}</p>
                    {onRetryNegotiations && (
                        <button
                            type="button"
                            onClick={onRetryNegotiations}
                            className="shrink-0 rounded-xl bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-red-700 transition-colors"
                        >
                            Réessayer
                        </button>
                    )}
                </div>
            )}

            {negotiationsLoading ? (
                <div className="py-20 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-orange-500 mb-3" />
                    <p className="text-xs font-black uppercase text-slate-400">Chargement des négociations...</p>
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((neg: any) => {
                        const productImg = neg.products?.img || neg.products?.image_url || '/placeholder-image.svg'
                        const productName = neg.products?.name || 'Produit'
                        const discount = Math.round((1 - neg.proposed_price / neg.initial_price) * 100)

                        return (
                            <div key={neg.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-md transition-all">
                                <div className="flex items-start gap-4">
                                    {/* Product image */}
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                        <CloudinaryImage src={productImg} alt={productName} width={64} height={64} className="w-full h-full object-cover" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Product name + status */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <p className="text-sm font-black uppercase italic dark:text-white truncate">{productName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                    De {neg.buyer_name || 'Client'} — {new Date(neg.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full flex-shrink-0 ${getStatusStyle(neg.status)}`}>
                                                {getStatusLabel(neg.status)}
                                            </span>
                                        </div>

                                        {/* Price comparison */}
                                        <div className="flex items-center gap-4 mb-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400">Prix initial</p>
                                                <p className="text-sm font-black text-slate-500 line-through">{neg.initial_price?.toLocaleString('fr-FR')} F</p>
                                            </div>
                                            <div className="text-orange-500 font-black text-lg">→</div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-orange-500">Offre (-{discount}%)</p>
                                                <p className="text-lg font-black text-orange-500">{neg.proposed_price?.toLocaleString('fr-FR')} F</p>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        {neg.status === 'en_attente' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRespond(neg.id, 'accepte')}
                                                    disabled={responding === neg.id}
                                                    className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] hover:bg-green-600 transition-all disabled:opacity-50"
                                                >
                                                    {responding === neg.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                                    Accepter
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(neg.id, 'refuse')}
                                                    disabled={responding === neg.id}
                                                    className="flex items-center gap-2 bg-white dark:bg-slate-800 text-red-500 border border-red-200 dark:border-red-800 px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] hover:bg-red-50 dark:hover:bg-red-950/20 transition-all disabled:opacity-50"
                                                >
                                                    Refuser
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <MessageSquare size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
                    <p className="text-xs font-black uppercase italic text-slate-400">Aucune négociation dans cette catégorie</p>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════
// HotelReviewsPage
// Section avis clients pour les hôteliers.
// ════════════════════════════════════════════════════════════
function HotelReviewsPage({ hotelId, products, profile }: { hotelId: string; products: any[]; profile: any }) {
    const [tab, setTab] = useState<'ask' | 'requests' | 'received'>('ask')
    const [guestEmail, setGuestEmail] = useState('')
    const [guestName, setGuestName] = useState('')
    const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')
    const [sending, setSending] = useState(false)
    const [sentOk, setSentOk] = useState(false)

    const [requests, setRequests] = useState<any[]>([])
    const [requestsLoading, setRequestsLoading] = useState(false)

    const [receivedReviews, setReceivedReviews] = useState<any[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)

    const [replyingId, setReplyingId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [savingReply, setSavingReply] = useState(false)

    const hotelName = profile?.shop_name || 'Votre hôtel'

    useEffect(() => {
        if (tab === 'requests' && hotelId) {
            setRequestsLoading(true)
            getHotelReviewRequests(hotelId).then(res => {
                setRequests(res.data || [])
                setRequestsLoading(false)
            })
        }
        if (tab === 'received' && hotelId) {
            setReviewsLoading(true)
            getHotelProductReviews(hotelId).then(res => {
                setReceivedReviews(res.data || [])
                setReviewsLoading(false)
            })
        }
    }, [tab, hotelId])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!guestEmail || !selectedProductId) return
        setSending(true)
        const selectedProduct = products.find(p => p.id === selectedProductId)
        const res = await requestHotelReview({
            hotelId,
            productId: selectedProductId,
            productName: selectedProduct?.name || 'Chambre',
            hotelName,
            guestEmail,
            guestName: guestName || undefined,
        })
        setSending(false)
        if (res.success) {
            setSentOk(true)
            setGuestEmail('')
            setGuestName('')
            setTimeout(() => setSentOk(false), 4000)
        } else {
            toast.error(res.error || 'Erreur lors de l\'envoi')
        }
    }

    const handleReply = async (reviewId: string) => {
        if (!replyText.trim()) return
        setSavingReply(true)
        const res = await addHotelReply({ reviewId, hotelId, reply: replyText })
        setSavingReply(false)
        if (res.success) {
            setReceivedReviews(prev => prev.map(r =>
                r.id === reviewId ? { ...r, hotel_reply: replyText, hotel_reply_at: new Date().toISOString() } : r
            ))
            setReplyingId(null)
            setReplyText('')
            toast.success('Réponse publiée')
        } else {
            toast.error(res.error || 'Erreur')
        }
    }

    const statusLabel: Record<string, { label: string; color: string }> = {
        pending:   { label: 'En attente', color: '#F59E0B' },
        completed: { label: 'Avis reçu', color: '#22C55E' },
        expired:   { label: 'Expiré', color: '#888' },
    }

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                    <Star size={20} className="text-amber-500" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white">Avis clients</h1>
                    <p className="text-xs text-slate-400">Invitez vos clients à noter leur séjour</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                {([
                    { id: 'ask', label: '✉️ Demander un avis' },
                    { id: 'requests', label: '📋 Demandes envoyées' },
                    { id: 'received', label: '⭐ Avis reçus' },
                ] as { id: typeof tab; label: string }[]).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            tab === t.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Demander un avis ── */}
            {tab === 'ask' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        À la sortie du client, entrez ses coordonnées ci-dessous. Il recevra un email avec un lien unique pour noter son séjour.
                    </p>

                    {sentOk && (
                        <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200/60 dark:border-green-800/40 text-green-700 dark:text-green-400 text-sm font-semibold flex items-center gap-2">
                            <Check size={16} /> Email envoyé avec succès !
                        </div>
                    )}

                    <form onSubmit={handleSend} className="space-y-4">
                        {/* Chambre */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">Chambre / Annonce</label>
                            <select
                                value={selectedProductId}
                                onChange={e => setSelectedProductId(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                required
                            >
                                {products.length === 0 && <option value="">Aucune chambre publiée</option>}
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Nom */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">Nom du client <span className="font-normal normal-case text-slate-300">(optionnel)</span></label>
                            <input
                                type="text"
                                value={guestName}
                                onChange={e => setGuestName(e.target.value)}
                                placeholder="Ex : Jean Mbemba"
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">Email du client <span className="text-red-400">*</span></label>
                            <input
                                type="email"
                                value={guestEmail}
                                onChange={e => setGuestEmail(e.target.value)}
                                placeholder="client@exemple.com"
                                required
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending || products.length === 0}
                            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> Envoyer la demande d&apos;avis</>}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Tab: Demandes envoyées ── */}
            {tab === 'requests' && (
                <div>
                    {requestsLoading ? (
                        <div className="py-20 text-center"><Loader2 size={28} className="animate-spin mx-auto text-amber-400" /></div>
                    ) : requests.length === 0 ? (
                        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-black uppercase italic text-slate-400">Aucune demande envoyée pour l&apos;instant</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(req => {
                                const s = statusLabel[req.status] || { label: req.status, color: '#888' }
                                const room = (req.products as any)?.name || '—'
                                return (
                                    <div key={req.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{req.guest_name || req.guest_email}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{req.guest_email} · {room}</p>
                                            <p className="text-[10px] text-slate-300 mt-0.5">
                                                {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                                            style={{ background: `${s.color}18`, color: s.color }}>
                                            {s.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Avis reçus ── */}
            {tab === 'received' && (
                <div>
                    {reviewsLoading ? (
                        <div className="py-20 text-center"><Loader2 size={28} className="animate-spin mx-auto text-amber-400" /></div>
                    ) : receivedReviews.length === 0 ? (
                        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-black uppercase italic text-slate-400">Aucun avis reçu pour l&apos;instant</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {receivedReviews.map(rev => {
                                const room = (rev.products as any)?.name || '—'
                                return (
                                    <div key={rev.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                        {/* En-tête */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{rev.user_name}</p>
                                                <p className="text-[11px] text-amber-500 font-medium">{room}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="flex gap-0.5 justify-end mb-0.5">
                                                    {[1,2,3,4,5].map(s => (
                                                        <span key={s} className={`text-[13px] ${s <= rev.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>★</span>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Commentaire */}
                                        {rev.content && (
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{rev.content}</p>
                                        )}

                                        {/* Réponse existante */}
                                        {rev.hotel_reply && (
                                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 mb-3">
                                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">🏨 Votre réponse</p>
                                                <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{rev.hotel_reply}</p>
                                            </div>
                                        )}

                                        {/* Formulaire réponse */}
                                        {!rev.hotel_reply && replyingId !== rev.id && (
                                            <button
                                                onClick={() => { setReplyingId(rev.id); setReplyText('') }}
                                                className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                                            >
                                                <MessageCircle size={13} /> Répondre à cet avis
                                            </button>
                                        )}

                                        {replyingId === rev.id && (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    placeholder="Merci pour votre séjour ! Nous sommes ravis que..."
                                                    rows={3}
                                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleReply(rev.id)}
                                                        disabled={savingReply || !replyText.trim()}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
                                                    >
                                                        {savingReply ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Publier</>}
                                                    </button>
                                                    <button
                                                        onClick={() => setReplyingId(null)}
                                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
