'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { PricingSection, SubscriptionCheckout } from '@/app/components/SellerSubscription'

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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [user, setUser] = useState<any>(null)

    // ═══ Étape abonnement ═══
    const [profileStep, setProfileStep] = useState<'form' | 'subscription' | 'checkout'>('form')
    const [billing, setBilling] = useState('monthly')
    const [selectedPlan, setSelectedPlan] = useState<any>(null)

    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            setUser(user)

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profile && profile.first_name) {
                router.push('/')
            }
        }

        checkUser()
    }, [supabase, router])

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

        if (!isPhoneValid) {
            setError(`Le numéro doit contenir exactement ${selectedCountry.maxDigits} chiffres.`)
            setLoading(false)
            return
        }

        if (role === 'vendor' && (!vendorConfirmed || !shopName.trim())) {
            setError('Veuillez remplir le nom de votre boutique et confirmer votre statut de vendeur.')
            setLoading(false)
            return
        }

        try {
            if (!user) throw new Error('Non connecté')

            const fullPhone = `${selectedCountry.dial}${phoneNumber}`

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    phone: fullPhone,
                    country: selectedCountry.code,
                    role,
                    ...(role === 'vendor' ? { shop_name: shopName.trim(), subscription_plan: 'free' } : {}),
                    updated_at: new Date().toISOString(),
                })

            if (profileError) throw profileError

            // Si vendeur → passer à l'étape abonnement
            if (role === 'vendor') {
                setLoading(false)
                setProfileStep('subscription')
                return
            }

            router.push('/')

        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue')
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
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
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
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                padding: "24px 16px",
                maxWidth: 560, margin: "0 auto",
            }}>
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                <SubscriptionCheckout
                    plan={selectedPlan}
                    billing={billing}
                    onBack={() => setProfileStep('subscription')}
                    onComplete={() => {
                        router.push('/')
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
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                padding: "24px 16px",
                maxWidth: 560, margin: "0 auto",
            }}>
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, margin: "0 auto 16px",
                        boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
                    }}>🏪</div>
                    <h1 style={{ color: "#F0ECE2", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
                        Bienvenue, {firstName} !
                    </h1>
                    <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
                        Choisissez votre plan pour commencer à vendre sur Mayombe Market
                    </p>
                </div>

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
                        router.push('/')
                    }}
                />
            </div>
        )
    }

    // ═══════════════════════════════════════
    // ÉTAPE 1 : FORMULAIRE PROFIL
    // ═══════════════════════════════════════
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-center">
                    <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-4xl">🎉</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Email confirmé !
                    </h1>
                    <p className="text-green-100">
                        Complétez votre profil pour continuer
                    </p>
                </div>

                {/* FORMULAIRE */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* NOM & PRÉNOM */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Prénom *
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white"
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
                                className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    {/* TÉLÉPHONE AVEC SÉLECTEUR DE PAYS */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Numéro de téléphone *
                        </label>
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
                                value={phoneNumber}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                placeholder={selectedCountry.placeholder}
                                className={`flex-1 p-3 border rounded-xl outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-white transition-all ${
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
                                onClick={() => { setRole('buyer'); setVendorConfirmed(false); setShopName('') }}
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
                                onClick={() => setRole('vendor')}
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

                            <div>
                                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
                                    Nom de votre boutique *
                                </label>
                                <input
                                    type="text"
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                    placeholder="Ex: Boutique Élégance, Tech Store..."
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
                                    Je confirme vouloir être vendeur et j&apos;accepte les conditions
                                </span>
                            </label>
                        </div>
                    )}

                    {/* MESSAGE D'ERREUR */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* BOUTON VALIDER */}
                    <button
                        type="submit"
                        disabled={loading || (role === 'vendor' && (!vendorConfirmed || !shopName.trim())) || !isPhoneValid}
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
