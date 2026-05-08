'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PricingSection, SubscriptionCheckout } from '@/app/components/SellerSubscription'
import { ImmoPricingSection } from '@/app/components/ImmoSubscription'
import { HotelPricingSection } from '@/app/components/HotelSubscription'
import { DELIVERY_CITY_LIST } from '@/lib/deliveryZones'
import { translateAuthErrorMessage } from '@/lib/authErrorMessages'
import { SYSTEM_FONT_STACK } from '@/lib/systemFontStack'
import { LEGAL_SIGNUP } from '@/lib/legal/termsRoutes'

const COUNTRIES = [
    { code: 'CG', name: 'Congo-Brazzaville', flag: '🇨🇬', dial: '+242', maxDigits: 9, placeholder: 'XX XXX XXXX', enabled: true },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241', maxDigits: 8, placeholder: 'XX XX XX XX', enabled: false },
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237', maxDigits: 9, placeholder: 'XXX XXX XXX', enabled: false },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221', maxDigits: 9, placeholder: 'XX XXX XXXX', enabled: false },
] as const

export default function CompleteProfilePage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
    const [showCountryPicker, setShowCountryPicker] = useState(false)
    const [role, setRole] = useState<'buyer' | 'vendor'>('buyer')
    const [shopName, setShopName] = useState('')
    const [vendorConfirmed, setVendorConfirmed] = useState(false)
    const [city, setCity] = useState('')
    /** CGU générales — toujours requises */
    const [acceptGeneralTerms, setAcceptGeneralTerms] = useState(false)
    /** Conditions acheteur — si rôle acheteur */
    const [acceptClientTerms, setAcceptClientTerms] = useState(false)
    /** Conditions vendeur — si rôle vendeur (signature) */
    const [acceptVendorTerms, setAcceptVendorTerms] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [user, setUser] = useState<any>(null)
    const [sessionFailed, setSessionFailed] = useState(false)

    // ═══ Étape abonnement ═══
    const [profileStep, setProfileStep] = useState<'form' | 'subscription' | 'checkout'>('form')
    const [billing, setBilling] = useState('monthly')
    const [selectedPlan, setSelectedPlan] = useState<any>(null)

    // ═══ Type de vendeur (pré-sélectionné via ?type=immobilier ou ?type=hotel) ═══
    const [infoOpen, setInfoOpen] = useState<'ville' | 'phone' | null>(null)

    const [vendorType, setVendorType] = useState<'marketplace' | 'immobilier' | 'hotel' | 'patisserie' | 'restaurant'>(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search)
            if (p.get('type') === 'immobilier') return 'immobilier'
            if (p.get('type') === 'hotel') return 'hotel'
            if (p.get('type') === 'patisserie') return 'patisserie'
            if (p.get('type') === 'restaurant') return 'restaurant'
        }
        return 'marketplace'
    })

    const router = useRouter()
    const { user: authUser, loading: authLoading, supabase } = useAuth()
    const processedRef = useRef(false)

    // Gérer les tokens dans le hash URL (venant du callback)
    useEffect(() => {
        const hash = window.location.hash.substring(1)
        if (!hash) return

        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
            window.history.replaceState(null, '', window.location.pathname)
            supabase.auth.setSession({ access_token, refresh_token }).catch(() => {})
        }
    }, [supabase])

    // Réagir au user détecté par AuthProvider (une seule source de vérité)
    useEffect(() => {
        if (processedRef.current) return

        // Si on a le user → afficher le formulaire IMMÉDIATEMENT
        if (authUser?.id) {
            processedRef.current = true
            setUser(authUser)

            // Vérifier en arrière-plan si le profil est déjà complété (avec timeout)
            const checkProfile = async () => {
                try {
                    const result = await Promise.race([
                        supabase
                            .from('profiles')
                            .select('first_name, role, city')
                            .eq('id', authUser.id)
                            .maybeSingle(),
                        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
                    ])

                    const profile = result && 'data' in result ? result.data : null

                    if (profile?.first_name) {
                        const dest =
                            profile.role === 'vendor'
                                ? '/vendor/dashboard'
                                : profile.role === 'admin'
                                  ? '/admin'
                                  : profile.role === 'logistician'
                                    ? '/logistician/dashboard'
                                    : '/account/dashboard'
                        try {
                            router.replace(dest)
                        } catch {
                            /* navigation aborted */
                        }
                    }
                } catch {
                    /* profil non lisible : rester sur le formulaire */
                }
            }

            checkProfile()
            return
        }

        // Seulement si le chargement est terminé ET pas de user → échec
        if (!authLoading && !authUser?.id) {
            setSessionFailed(true)
        }
    }, [authUser, authLoading, supabase, router]) // eslint-disable-line react-hooks/exhaustive-deps

    const handlePhoneChange = (value: string) => {
        // N'accepter que les chiffres
        const digits = value.replace(/\D/g, '')
        if (digits.length <= selectedCountry.maxDigits) {
            setPhoneNumber(digits)
        }
    }

    const handleCountrySelect = (country: typeof COUNTRIES[number]) => {
        if (!country.enabled) return
        setSelectedCountry(country)
        setPhoneNumber('')
        setShowCountryPicker(false)
    }

    const isPhoneValid = phoneNumber.length === selectedCountry.maxDigits && selectedCountry.enabled

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (!user?.id) {
            setError('Votre session a expiré. Veuillez rafraîchir la page.')
            setLoading(false)
            return
        }

        if (!isPhoneValid) {
            setError(`Le numéro doit contenir exactement ${selectedCountry.maxDigits} chiffres.`)
            setLoading(false)
            return
        }

        if (!acceptGeneralTerms) {
            setError('Veuillez lire et accepter les conditions générales d’utilisation.')
            setLoading(false)
            return
        }

        if (role === 'buyer' && !acceptClientTerms) {
            setError('Veuillez accepter les conditions d’utilisation spécifiques aux acheteurs.')
            setLoading(false)
            return
        }

        if (role === 'vendor' && !acceptVendorTerms) {
            setError('Veuillez accepter les conditions d’utilisation vendeur (contrat).')
            setLoading(false)
            return
        }

        if (!city.trim()) {
            setError('Veuillez sélectionner votre ville.')
            setLoading(false)
            return
        }

        if (role === 'vendor' && (!vendorConfirmed || !shopName.trim())) {
            setError('Veuillez remplir le nom de votre boutique et confirmer votre statut de vendeur.')
            setLoading(false)
            return
        }

        try {
            const fullPhone = `${selectedCountry.dial}${phoneNumber}`

            // Lire le token directement depuis les cookies (supabase.auth.getSession() bloque)
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

            const rawCookie = document.cookie
                .split('; ')
                .find(c => c.startsWith(`sb-${projectRef}-auth-token=`))
                ?.split('=')
                .slice(1)
                .join('=')

            if (!rawCookie) throw new Error('Session expirée — cookie introuvable')

            // Décoder le cookie — format: "base64-<base64url encoded JSON>"
            let accessToken: string
            try {
                // Enlever le préfixe "base64-" si présent
                let encoded = rawCookie
                if (encoded.startsWith('base64-')) {
                    encoded = encoded.substring(7) // "base64-".length = 7
                }

                // base64url → base64 standard → decode
                const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
                const decoded = atob(b64)
                const session = JSON.parse(decoded)
                accessToken = session.access_token
            } catch (e1) {
                // Fallback: JSON direct ou URL-encoded
                try {
                    const session = JSON.parse(decodeURIComponent(rawCookie))
                    accessToken = session.access_token
                } catch {
                    throw new Error('Session expirée — cookie illisible')
                }
            }

            if (!accessToken) throw new Error('Session expirée — pas de token')

            const now = new Date().toISOString()
            const profileData = {
                id: user.id,
                email: user.email,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`,
                phone: fullPhone,
                city: city.trim(),
                country: selectedCountry.code,
                role,
                ...(role === 'vendor' ? {
                    shop_name: shopName.trim(),
                    subscription_plan: vendorType === 'immobilier' ? 'immo_free' : vendorType === 'hotel' ? 'hotel_free' : 'gratuit',
                    verification_status: 'pending',
                    vendor_type: vendorType,
                } : {}),
                terms_accepted_at: now,
                client_terms_accepted_at: role === 'buyer' ? now : null,
                vendor_terms_accepted_at: role === 'vendor' ? now : null,
                updated_at: now,
            }

            const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                    'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify(profileData),
            })

            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(`Erreur ${res.status}: ${errBody}`)
            }

            // Si vendeur → passer à l'étape abonnement
            if (role === 'vendor') {
                setLoading(false)
                setProfileStep('subscription')
                return
            }

            // Acheteur — aller vers le dashboard
            router.push('/account/dashboard')

        } catch (err: any) {
            setError(translateAuthErrorMessage(String(err?.message || '')))
        } finally {
            setLoading(false)
        }
    }

    // ═══ Sauvegarde du plan choisi ═══
    const saveSubscriptionPlan = async (planId: string) => {
        if (!user) return
        await supabase
            .from('profiles')
            .update({ subscription_plan: planId, updated_at: new Date().toISOString() })
            .eq('id', user.id)
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
                {sessionFailed ? (
                    <div className="text-center p-8 max-w-md">
                        <div className="text-5xl mb-4">🔒</div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                            Session introuvable
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Votre session a expiré ou n&apos;a pas pu être établie. Veuillez vous reconnecter.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all"
                        >
                            Retour à l&apos;accueil
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Chargement de votre session...</p>
                    </div>
                )}
            </div>
        )
    }

    // ═══════════════════════════════════════
    // ÉTAPE 2 : CHECKOUT ABONNEMENT
    // ═══════════════════════════════════════
    if (profileStep === 'checkout' && selectedPlan) {
        return (
            <div style={{
                minHeight: "100vh",
                background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
                fontFamily: SYSTEM_FONT_STACK,
                padding: "24px 16px",
                maxWidth: 560, margin: "0 auto",
            }}>
                <SubscriptionCheckout
                    plan={selectedPlan}
                    billing={billing}
                    onBack={() => setProfileStep('subscription')}
                    onComplete={() => {
                        router.push('/vendor/dashboard')
                    }}
                />
            </div>
        )
    }

    // ═══════════════════════════════════════
    // ÉTAPE 2 : CHOIX D'ABONNEMENT (après formulaire vendeur)
    // ═══════════════════════════════════════
    if (profileStep === 'subscription') {
        return (
            <div style={{
                minHeight: "100vh",
                background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
                fontFamily: SYSTEM_FONT_STACK,
                padding: "24px 16px",
                maxWidth: 560, margin: "0 auto",
            }}>

                {/* Bouton passer — tout en haut */}
                <div style={{ textAlign: "right", marginBottom: 12 }}>
                    <button
                        type="button"
                        onClick={() => router.push('/vendor/dashboard')}
                        style={{
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 10,
                            color: "#888",
                            fontSize: 13,
                            fontWeight: 600,
                            padding: "8px 16px",
                            cursor: "pointer",
                        }}
                    >
                        Passer pour l'instant →
                    </button>
                </div>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: vendorType === 'immobilier'
                            ? "linear-gradient(135deg, #3B82F6, #2563EB)"
                            : vendorType === 'hotel'
                                ? "linear-gradient(135deg, #F59E0B, #D97706)"
                                : vendorType === 'patisserie'
                                    ? "linear-gradient(135deg, #F43F5E, #E11D48)"
                                    : vendorType === 'restaurant'
                                        ? "linear-gradient(135deg, #F97316, #EA580C)"
                                        : "linear-gradient(135deg, #E8A838, #D4782F)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, margin: "0 auto 16px",
                        boxShadow: vendorType === 'immobilier'
                            ? "0 8px 24px rgba(59,130,246,0.3)"
                            : vendorType === 'hotel'
                                ? "0 8px 24px rgba(245,158,11,0.3)"
                                : vendorType === 'patisserie'
                                    ? "0 8px 24px rgba(244,63,94,0.3)"
                                    : vendorType === 'restaurant'
                                        ? "0 8px 24px rgba(249,115,22,0.3)"
                                        : "0 8px 24px rgba(232,168,56,0.3)",
                    }}>
                        {vendorType === 'immobilier' ? '🏠'
                            : vendorType === 'hotel' ? '🏨'
                            : vendorType === 'patisserie' ? '🎂'
                            : vendorType === 'restaurant' ? '🍽️'
                            : '🏪'}
                    </div>
                    <h1 style={{ color: "#F0ECE2", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
                        Bienvenue, {firstName} !
                    </h1>
                    <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
                        {vendorType === 'immobilier'
                            ? 'Choisissez votre plan pour publier vos annonces immobilières'
                            : vendorType === 'hotel'
                                ? "Choisissez votre plan pour publier vos chambres d'hôtel"
                                : vendorType === 'patisserie'
                                    ? 'Choisissez votre plan pour publier vos créations pâtissières'
                                    : vendorType === 'restaurant'
                                        ? 'Choisissez votre plan pour publier vos plats et menus'
                                        : 'Choisissez votre plan pour commencer à vendre sur Mayombe Market'}
                    </p>
                </div>

                {vendorType === 'immobilier' ? (
                    <ImmoPricingSection
                        currentPlan="immo_free"
                        billing={billing}
                        setBilling={setBilling}
                        onSelectPlan={(plan: any) => {
                            setSelectedPlan(plan)
                            setProfileStep('checkout')
                        }}
                        onSkip={async () => {
                            await saveSubscriptionPlan('immo_free')
                            router.push('/vendor/dashboard')
                        }}
                    />
                ) : vendorType === 'hotel' ? (
                    <HotelPricingSection
                        currentPlan="hotel_free"
                        billing={billing}
                        setBilling={setBilling}
                        onSelectPlan={(plan: any) => {
                            setSelectedPlan(plan)
                            setProfileStep('checkout')
                        }}
                        onSkip={async () => {
                            await saveSubscriptionPlan('hotel_free')
                            router.push('/vendor/dashboard')
                        }}
                    />
                ) : (
                    <PricingSection
                        currentPlan="free"
                        billing={billing}
                        setBilling={setBilling}
                        onSelectPlan={(plan: any) => {
                            setSelectedPlan(plan)
                            setProfileStep('checkout')
                        }}
                        onSkip={async () => {
                            await saveSubscriptionPlan('free')
                            router.push('/vendor/dashboard')
                        }}
                    />
                )}
            </div>
        )
    }

    // ═══════════════════════════════════════
    // ÉTAPE 1 : FORMULAIRE PROFIL
    // ═══════════════════════════════════════

    // Carte info réutilisable
    const InfoCard = ({ id, children }: { id: 'ville' | 'phone'; children: React.ReactNode }) =>
        infoOpen === id ? (
            <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-2xl text-sm text-blue-800 dark:text-blue-200 leading-relaxed shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                {children}
            </div>
        ) : null

    const InfoBtn = ({ id }: { id: 'ville' | 'phone' }) => (
        <button
            type="button"
            onClick={() => setInfoOpen(infoOpen === id ? null : id)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[11px] font-black transition-all shrink-0 ${
                infoOpen === id
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500'
            }`}
            aria-label="Plus d'informations"
        >
            ?
        </button>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 px-4 py-6 flex items-start justify-center">
            <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
                        <span className="text-3xl">🎉</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Email confirmé !
                    </h1>
                    <p className="text-green-100 text-sm">
                        Complétez votre profil pour continuer
                    </p>
                </div>

                {/* FORMULAIRE */}
                <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">

                    {/* NOM & PRÉNOM — colonne unique sur mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Prénom *
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Nom *
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* VILLE */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                Ville *
                            </label>
                            <InfoBtn id="ville" />
                        </div>
                        <InfoCard id="ville">
                            <p className="font-bold mb-1">📦 Pourquoi on vous demande votre ville ?</p>
                            <ul className="space-y-1.5 text-xs">
                                <li>• <strong>Calcul des frais de livraison</strong> — les tarifs varient selon que vous êtes à Brazzaville, Pointe-Noire ou ailleurs.</li>
                                <li>• <strong>Détection des envois inter-villes</strong> — si un vendeur est dans une autre ville, on vous prévient avant la commande.</li>
                                <li>• <strong>Afficher les vendeurs proches de chez vous</strong> — pour des livraisons plus rapides.</li>
                            </ul>
                            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">🔒 Votre ville n'est jamais partagée publiquement.</p>
                        </InfoCard>
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white text-sm"
                            required
                        >
                            <option value="">Choisissez votre ville</option>
                            {DELIVERY_CITY_LIST.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* TÉLÉPHONE AVEC SÉLECTEUR DE PAYS */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                Numéro de téléphone *
                            </label>
                            <InfoBtn id="phone" />
                        </div>
                        <InfoCard id="phone">
                            <p className="font-bold mb-1">📱 Pourquoi on vous demande votre numéro ?</p>
                            <ul className="space-y-1.5 text-xs">
                                <li>• <strong>Suivi de commande</strong> — le livreur vous contacte directement pour coordonner la livraison.</li>
                                <li>• <strong>Confirmation de commande</strong> — en cas de problème avec votre paiement ou votre adresse.</li>
                                <li>• <strong>Support client</strong> — notre équipe peut vous joindre rapidement si besoin.</li>
                            </ul>
                            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">🔒 Votre numéro n'est visible que des vendeurs avec qui vous passez commande.</p>
                        </InfoCard>
                        <div className="flex gap-2">
                            {/* Sélecteur de pays */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                                    className="flex items-center gap-2 p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all min-w-[140px]"
                                >
                                    <span className="text-xl">{selectedCountry.flag}</span>
                                    <span className="font-bold text-gray-800 dark:text-white text-sm">{selectedCountry.dial}</span>
                                    <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown des pays */}
                                {showCountryPicker && (
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                        {COUNTRIES.map((country) => (
                                            <button
                                                key={country.code}
                                                type="button"
                                                onClick={() => handleCountrySelect(country)}
                                                disabled={!country.enabled}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                                                    country.enabled
                                                        ? 'hover:bg-green-50 dark:hover:bg-slate-700 cursor-pointer'
                                                        : 'opacity-40 cursor-not-allowed'
                                                } ${selectedCountry.code === country.code ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                                            >
                                                <span className="text-xl">{country.flag}</span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{country.name}</p>
                                                    <p className="text-xs text-gray-500">{country.dial}</p>
                                                </div>
                                                {!country.enabled && (
                                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                                                        Bientôt
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Champ numéro */}
                            <input
                                type="tel"
                                inputMode="numeric"
                                value={phoneNumber}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                placeholder={selectedCountry.placeholder}
                                className={`flex-1 p-3 border rounded-xl outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-white transition-all text-sm ${
                                    phoneNumber && !isPhoneValid
                                        ? 'border-orange-300 focus:ring-orange-500'
                                        : phoneNumber && isPhoneValid
                                            ? 'border-green-300 focus:ring-green-500'
                                            : 'border-gray-200 dark:border-slate-700 focus:ring-green-500'
                                }`}
                                required
                            />
                        </div>
                        {/* Indicateur de progression */}
                        {phoneNumber && (
                            <p className={`text-xs mt-1.5 font-medium ${isPhoneValid ? 'text-green-600' : 'text-gray-400'}`}>
                                {isPhoneValid
                                    ? `${selectedCountry.dial}${phoneNumber}`
                                    : `${phoneNumber.length}/${selectedCountry.maxDigits} chiffres`
                                }
                            </p>
                        )}
                    </div>

                    {/* CHOIX DU RÔLE */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                            Je suis *
                        </label>
                        <div className="grid md:grid-cols-2 gap-4">

                            {/* ACHETEUR */}
                            <button
                                type="button"
                                onClick={() => {
                                    setRole('buyer')
                                    setVendorConfirmed(false)
                                    setShopName('')
                                    setAcceptVendorTerms(false)
                                }}
                                className={`p-6 border-2 rounded-2xl transition-all text-left ${role === 'buyer'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-3xl mb-3">🛍️</div>
                                <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                                    Acheteur
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Je veux acheter des produits
                                </p>
                            </button>

                            {/* VENDEUR — bordure bleue */}
                            <button
                                type="button"
                                onClick={() => {
                                    setRole('vendor')
                                    setAcceptClientTerms(false)
                                }}
                                className={`p-6 border-2 rounded-2xl transition-all text-left ${role === 'vendor'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-3xl mb-3">🏪</div>
                                <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                                    Vendeur
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Je veux vendre mes produits
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* SECTION VENDEUR — bordure bleue pour marquer la différence */}
                    {role === 'vendor' && (
                        <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800/30 rounded-2xl space-y-4 animate-in fade-in">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">ℹ️</span>
                                <div>
                                    <p className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                                        Devenir vendeur est un engagement
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        En tant que vendeur, vous vous engagez à respecter nos conditions de vente, à livrer vos commandes dans les délais et à maintenir un service de qualité. Votre compte vendeur sera validé par un administrateur.
                                    </p>
                                </div>
                            </div>

                            {/* TYPE DE VENDEUR */}
                            <div>
                                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">
                                    Que souhaitez-vous vendre ? *
                                </label>

                                {/* Rangée 1 : Marketplace + Immobilier */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setVendorType('marketplace')}
                                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                                            vendorType === 'marketplace'
                                                ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                                                : 'border-blue-200 dark:border-blue-800/30 hover:border-blue-400 bg-white dark:bg-slate-800'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">🛍️</div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200 text-sm">Marketplace</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Mode, beauté, high-tech…</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVendorType('immobilier')}
                                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                                            vendorType === 'immobilier'
                                                ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                                                : 'border-blue-200 dark:border-blue-800/30 hover:border-blue-400 bg-white dark:bg-slate-800'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">🏠</div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200 text-sm">Immobilier</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Maisons, terrains, bureaux…</p>
                                    </button>
                                </div>

                                {/* Rangée 2 : Pâtisserie + Restaurant + Hôtellerie */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setVendorType('patisserie')}
                                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                                            vendorType === 'patisserie'
                                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                                                : 'border-blue-200 dark:border-blue-800/30 hover:border-rose-400 bg-white dark:bg-slate-800'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">🎂</div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200 text-sm">Pâtisserie</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Gâteaux, viennoiseries…</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVendorType('restaurant')}
                                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                                            vendorType === 'restaurant'
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                                : 'border-blue-200 dark:border-blue-800/30 hover:border-orange-400 bg-white dark:bg-slate-800'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">🍽️</div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200 text-sm">Restaurant</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Plats, grillades, fast-food…</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVendorType('hotel')}
                                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                                            vendorType === 'hotel'
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                : 'border-blue-200 dark:border-blue-800/30 hover:border-amber-400 bg-white dark:bg-slate-800'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">🏨</div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200 text-sm">Hôtellerie</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Chambres, hôtels…</p>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
                                    {vendorType === 'immobilier' ? 'Nom de votre agence / société *'
                                        : vendorType === 'hotel' ? 'Nom de votre hôtel *'
                                        : vendorType === 'patisserie' ? 'Nom de votre pâtisserie *'
                                        : vendorType === 'restaurant' ? 'Nom de votre restaurant *'
                                        : 'Nom de votre boutique *'}
                                </label>
                                <input
                                    type="text"
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                    placeholder={
                                        vendorType === 'immobilier' ? 'Ex : Agence Brazza Immo, Particulier...'
                                            : vendorType === 'hotel' ? 'Ex : Hôtel Brazzaville Palace, La Résidence...'
                                            : vendorType === 'patisserie' ? 'Ex : Pâtisserie Mama Sucre, Douceurs du Congo...'
                                            : vendorType === 'restaurant' ? 'Ex : Chez Mama Africa, Brazza Grill...'
                                            : 'Ex : Boutique Élégance, Tech Store...'
                                    }
                                    className="w-full p-3 border-2 border-blue-200 dark:border-blue-800/30 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white"
                                    required={role === 'vendor'}
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={vendorConfirmed}
                                    onChange={(e) => setVendorConfirmed(e.target.checked)}
                                    className="w-5 h-5 accent-blue-500 rounded"
                                />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                    Je confirme vouloir être vendeur
                                </span>
                            </label>
                        </div>
                    )}

                    {/* ENGAGEMENTS JURIDIQUES — après le formulaire */}
                    <div className="space-y-4 p-5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Engagements juridiques
                        </p>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptGeneralTerms}
                                onChange={(e) => setAcceptGeneralTerms(e.target.checked)}
                                className="w-5 h-5 accent-green-500 rounded mt-0.5 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                J&apos;ai lu et j&apos;accepte les{' '}
                                <a
                                    href={LEGAL_SIGNUP.cgu}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 dark:text-green-400 underline font-semibold hover:text-green-700"
                                >
                                    conditions générales d&apos;utilisation
                                </a>{' '}
                                (document contractuel).
                            </span>
                        </label>

                        {role === 'buyer' && (
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={acceptClientTerms}
                                    onChange={(e) => setAcceptClientTerms(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-600 rounded mt-0.5 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    J&apos;ai lu et j&apos;accepte les{' '}
                                    <a
                                        href={LEGAL_SIGNUP.conditionsAcheteur}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700"
                                    >
                                        conditions d&apos;utilisation acheteur
                                    </a>
                                    .
                                </span>
                            </label>
                        )}

                        {role === 'vendor' && (
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={acceptVendorTerms}
                                    onChange={(e) => setAcceptVendorTerms(e.target.checked)}
                                    className="w-5 h-5 accent-blue-600 rounded mt-0.5 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    J&apos;ai lu et j&apos;accepte les{' '}
                                    <a
                                        href={LEGAL_SIGNUP.conditionsVendeur}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 underline font-semibold hover:text-blue-500"
                                    >
                                        conditions d&apos;utilisation vendeur
                                    </a>{' '}
                                    — engagement commercial et règles de la marketplace (signature électronique par
                                    case à cocher).
                                </span>
                            </label>
                        )}
                    </div>

                    {/* MESSAGE D'ERREUR */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 px-4 py-3 rounded-xl text-sm leading-snug">
                            {error}
                        </div>
                    )}

                    {/* BOUTON VALIDER */}
                    <button
                        type="submit"
                        disabled={
                            loading ||
                            !acceptGeneralTerms ||
                            (role === 'buyer' && !acceptClientTerms) ||
                            (role === 'vendor' && !acceptVendorTerms) ||
                            !city.trim() ||
                            (role === 'vendor' && (!vendorConfirmed || !shopName.trim())) ||
                            !isPhoneValid
                        }
                        className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Enregistrement...
                            </span>
                        ) : role === 'vendor' ? (
                            'Continuer — Choisir mon abonnement'
                        ) : (
                            'Valider mon profil'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
