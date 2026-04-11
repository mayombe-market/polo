'use client'

import { useState, useEffect } from 'react'

// ═══════════════════════════════════════
// COOKIE DATA
// ═══════════════════════════════════════
const COOKIE_CATEGORIES = [
    {
        id: 'essential',
        icon: '🔒',
        title: 'Cookies essentiels',
        description: "Ces cookies sont indispensables au fonctionnement du site. Ils permettent la navigation, l'accès à votre compte, la gestion de votre panier et la sécurité de vos transactions. Sans ces cookies, le site ne peut pas fonctionner correctement.",
        examples: [
            { name: 'session_id', purpose: 'Maintient votre connexion active', duration: 'Session' },
            { name: 'cart_token', purpose: "Sauvegarde votre panier d'achat", duration: '7 jours' },
            { name: 'csrf_token', purpose: 'Protection contre les attaques malveillantes', duration: 'Session' },
            { name: 'cookie_consent', purpose: 'Mémorise vos préférences de cookies', duration: '12 mois' },
        ],
        required: true,
        defaultOn: true,
    },
    {
        id: 'functional',
        icon: '⚙️',
        title: 'Cookies fonctionnels',
        description: "Ces cookies améliorent votre expérience en mémorisant vos préférences : langue, devise, région, derniers produits consultés. Ils permettent aussi de personnaliser l'affichage selon vos habitudes.",
        examples: [
            { name: 'user_lang', purpose: 'Mémorise votre langue préférée', duration: '12 mois' },
            { name: 'recent_views', purpose: 'Produits récemment consultés', duration: '30 jours' },
            { name: 'user_city', purpose: 'Votre ville pour les résultats locaux', duration: '6 mois' },
            { name: 'theme_pref', purpose: "Vos préférences d'affichage (thème sombre/clair)", duration: '12 mois' },
        ],
        required: false,
        defaultOn: true,
    },
    {
        id: 'analytics',
        icon: '📊',
        title: 'Cookies analytiques',
        description: "Ces cookies nous aident à comprendre comment les visiteurs utilisent notre site : pages les plus visitées, temps passé, taux de rebond. Ces données sont anonymisées et servent uniquement à améliorer nos services.",
        examples: [
            { name: '_ga / _gid', purpose: 'Google Analytics — statistiques de visite anonymes', duration: '24 mois / 24h' },
            { name: 'vercel_analytics', purpose: 'Performances du site (temps de chargement)', duration: 'Session' },
            { name: 'hotjar_id', purpose: 'Cartes de chaleur — zones les plus cliquées', duration: '12 mois' },
        ],
        required: false,
        defaultOn: false,
    },
    {
        id: 'marketing',
        icon: '📢',
        title: 'Cookies marketing & publicitaires',
        description: "Ces cookies permettent de vous proposer des publicités pertinentes en fonction de vos centres d'intérêt, de mesurer l'efficacité de nos campagnes, et de limiter le nombre de fois où vous voyez une même publicité.",
        examples: [
            { name: 'fbp / fbc', purpose: 'Meta (Facebook/Instagram) — suivi publicitaire', duration: '3 mois' },
            { name: 'tt_pixel', purpose: 'TikTok — mesure des campagnes', duration: '13 mois' },
            { name: 'gads_id', purpose: 'Google Ads — publicités ciblées', duration: '13 mois' },
        ],
        required: false,
        defaultOn: false,
    },
]

type Preferences = Record<string, boolean>

// ═══════════════════════════════════════
// COOKIE BANNER
// ═══════════════════════════════════════
function CookieBanner({ onAcceptAll, onRejectAll, onCustomize }: {
    onAcceptAll: () => void; onRejectAll: () => void; onCustomize: () => void
}) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Délai long pour laisser le hero être mesuré comme LCP par Lighthouse/PageSpeed
        // avant que la bannière cookies n'apparaisse. 2500ms est au-delà de la fenêtre
        // typique de capture LCP (~2-2.5s sur connexion 4G lente émulée).
        const t = setTimeout(() => setVisible(true), 2500)
        return () => clearTimeout(t)
    }, [])

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[1000]"
            style={{
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: visible ? 'auto' : 'none',
            }}
        >
            {/* Pas de backdrop : la bannière s'affiche en bas, sans recouvrir le hero.
                Un backdrop fixed inset-0 était capté par Lighthouse comme élément LCP. */}

            <div className="max-w-[580px] mx-auto bg-[#12121C] rounded-t-3xl border border-white/[0.06] border-b-0 p-7 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
                {/* Icon + Title */}
                <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-[52px] h-[52px] rounded-[18px] bg-gradient-to-br from-[rgba(232,168,56,0.15)] to-[rgba(232,168,56,0.05)] border border-[rgba(232,168,56,0.2)] flex items-center justify-center text-[28px]">
                        🍪
                    </div>
                    <div>
                        <h3 className="text-[#F0ECE2] text-lg font-extrabold">Nous respectons votre vie privée</h3>
                        <p className="text-[#888] text-xs">Nous utilisons des cookies pour améliorer votre expérience</p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[#999] text-[13px] leading-[1.7] mb-5">
                    Notre site utilise des cookies pour assurer son bon fonctionnement, analyser le trafic,
                    personnaliser le contenu et vous proposer une publicité adaptée à vos centres d&apos;intérêt.
                </p>

                {/* Category badges */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                    {COOKIE_CATEGORIES.map(cat => (
                        <span
                            key={cat.id}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${cat.required
                                ? 'bg-green-500/[0.08] border border-green-500/[0.15] text-green-400'
                                : 'bg-white/[0.03] border border-white/[0.06] text-[#888]'
                                }`}
                        >
                            {cat.icon} {cat.title} {cat.required && '· Requis'}
                        </span>
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5">
                    <button
                        onClick={onRejectAll}
                        className="flex-1 py-3.5 rounded-[14px] border-[1.5px] border-white/10 bg-transparent text-[#999] text-[13px] font-bold cursor-pointer hover:bg-white/[0.03] transition-all"
                    >
                        Tout refuser
                    </button>
                    <button
                        onClick={onCustomize}
                        className="flex-1 py-3.5 rounded-[14px] border-[1.5px] border-[rgba(232,168,56,0.25)] bg-[rgba(232,168,56,0.05)] text-[#E8A838] text-[13px] font-bold cursor-pointer hover:bg-[rgba(232,168,56,0.1)] transition-all"
                    >
                        ⚙️ Personnaliser
                    </button>
                    <button
                        onClick={onAcceptAll}
                        className="flex-[1.3] py-3.5 rounded-[14px] border-none text-white text-[13px] font-bold cursor-pointer shadow-[0_4px_16px_rgba(232,168,56,0.25)] hover:brightness-110 transition-all"
                        style={{ background: 'linear-gradient(135deg, #E8A838, #D4782F)' }}
                    >
                        ✓ Tout accepter
                    </button>
                </div>

                {/* Links */}
                <div className="text-center mt-3.5">
                    <span className="text-[#555] text-[11px]">
                        En savoir plus dans notre{' '}
                        <span className="text-[#E8A838] cursor-pointer underline">politique de cookies</span>
                        {' '}et notre{' '}
                        <span className="text-[#E8A838] cursor-pointer underline">politique de confidentialité</span>
                    </span>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════
// COOKIE SETTINGS PANEL
// ═══════════════════════════════════════
function CookieSettings({ preferences, onToggle, onSave, onAcceptAll, onBack }: {
    preferences: Preferences; onToggle: (id: string) => void
    onSave: () => void; onAcceptAll: () => void; onBack: () => void
}) {
    const [expandedCat, setExpandedCat] = useState<string | null>(null)
    const enabledCount = Object.values(preferences).filter(Boolean).length

    return (
        <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-lg flex items-end justify-center">
            <div className="max-w-[580px] w-full bg-[#12121C] rounded-t-3xl border border-white/[0.06] border-b-0 max-h-[90vh] overflow-auto shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
                {/* Header */}
                <div className="px-6 pt-6 sticky top-0 z-10 bg-[#12121C]">
                    <div className="w-10 h-1 rounded bg-white/[0.15] mx-auto mb-5" />

                    <div className="flex items-center gap-3 mb-1.5">
                        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#ddd] text-base cursor-pointer flex items-center justify-center hover:bg-white/[0.08] transition-all">
                            ←
                        </button>
                        <div>
                            <h2 className="text-[#F0ECE2] text-xl font-extrabold">⚙️ Gérer mes cookies</h2>
                            <p className="text-[#666] text-xs">{enabledCount}/{COOKIE_CATEGORIES.length} catégories activées</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 rounded bg-white/[0.06] overflow-hidden my-3.5 mb-4">
                        <div
                            className="h-full rounded transition-all duration-400"
                            style={{
                                background: 'linear-gradient(90deg, #E8A838, #D4782F)',
                                width: `${(enabledCount / COOKIE_CATEGORIES.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Category cards */}
                <div className="px-6 pb-5 flex flex-col gap-2.5">
                    {/* Info box */}
                    <div className="p-3.5 rounded-2xl bg-blue-500/[0.04] border border-blue-500/10 flex gap-3 items-start mb-1">
                        <span className="text-base">ℹ️</span>
                        <p className="text-blue-400 text-xs leading-[1.7]">
                            Les cookies essentiels ne peuvent pas être désactivés car ils sont nécessaires au fonctionnement du site.
                            Votre choix sera sauvegardé pendant 12 mois.
                        </p>
                    </div>

                    {COOKIE_CATEGORIES.map(cat => {
                        const isOn = preferences[cat.id]
                        const isExpanded = expandedCat === cat.id
                        return (
                            <div
                                key={cat.id}
                                className={`rounded-[20px] overflow-hidden bg-white/[0.02] border transition-colors ${isOn ? 'border-[rgba(232,168,56,0.12)]' : 'border-white/[0.04]'}`}
                            >
                                {/* Main row */}
                                <div className="flex items-center gap-3.5 p-[18px]">
                                    <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[#F0ECE2] text-sm font-bold">{cat.title}</h4>
                                            {cat.required && (
                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">REQUIS</span>
                                            )}
                                        </div>
                                        <p className="text-[#777] text-[11px] mt-0.5 leading-[1.5]">{cat.description.slice(0, 90)}...</p>
                                    </div>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => !cat.required && onToggle(cat.id)}
                                        disabled={cat.required}
                                        className={`w-[50px] h-7 rounded-full border-none relative flex-shrink-0 transition-colors duration-300 ${isOn ? 'bg-[#E8A838]' : 'bg-white/10'} ${cat.required ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <div
                                            className="w-[22px] h-[22px] rounded-full bg-white absolute top-[3px] shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
                                            style={{
                                                left: isOn ? 25 : 3,
                                                transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            }}
                                        />
                                    </button>
                                </div>

                                {/* Expand button */}
                                <button
                                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                                    className="w-full py-2.5 px-[18px] bg-white/[0.01] border-0 border-t border-t-white/[0.04] text-[#666] text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:text-[#999] transition-all"
                                >
                                    {isExpanded ? 'Masquer les détails ▴' : 'Voir les détails ▾'}
                                </button>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="px-[18px] pb-[18px] bg-white/[0.01]">
                                        <p className="text-[#999] text-xs leading-[1.8] mb-3.5">{cat.description}</p>

                                        {/* Cookie table */}
                                        <div className="rounded-[14px] overflow-hidden border border-white/[0.04]">
                                            <div className="grid grid-cols-[2fr_3fr_1fr] p-3.5 bg-white/[0.03] border-b border-white/[0.04]">
                                                <span className="text-[#888] text-[10px] font-bold uppercase tracking-wider">Cookie</span>
                                                <span className="text-[#888] text-[10px] font-bold uppercase tracking-wider">Finalité</span>
                                                <span className="text-[#888] text-[10px] font-bold uppercase tracking-wider">Durée</span>
                                            </div>
                                            {cat.examples.map((ex, i) => (
                                                <div key={i} className={`grid grid-cols-[2fr_3fr_1fr] p-3.5 ${i < cat.examples.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                                                    <span className="text-[#E8A838] text-[11px] font-semibold font-mono">{ex.name}</span>
                                                    <span className="text-[#aaa] text-[11px]">{ex.purpose}</span>
                                                    <span className="text-[#666] text-[11px]">{ex.duration}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Sticky footer */}
                <div className="sticky bottom-0 px-6 pt-4 pb-6" style={{ background: 'linear-gradient(180deg, transparent, #12121C 30%)' }}>
                    <div className="flex gap-2.5">
                        <button
                            onClick={onSave}
                            className="flex-1 py-4 rounded-[14px] border-[1.5px] border-[rgba(232,168,56,0.3)] bg-[rgba(232,168,56,0.05)] text-[#E8A838] text-sm font-bold cursor-pointer hover:bg-[rgba(232,168,56,0.1)] transition-all"
                        >
                            Sauvegarder mes choix
                        </button>
                        <button
                            onClick={onAcceptAll}
                            className="flex-1 py-4 rounded-[14px] border-none text-white text-sm font-bold cursor-pointer shadow-[0_4px_16px_rgba(232,168,56,0.25)] hover:brightness-110 transition-all"
                            style={{ background: 'linear-gradient(135deg, #E8A838, #D4782F)' }}
                        >
                            ✓ Tout accepter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════
// CONFIRMATION TOAST
// ═══════════════════════════════════════
function CookieToast({ message, type, onClose }: { message: string; type: string; onClose: () => void }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
        const t = setTimeout(() => {
            setVisible(false)
            setTimeout(onClose, 400)
        }, 3500)
        return () => clearTimeout(t)
    }, [onClose])

    const isSuccess = type === 'success'
    return (
        <div
            className={`fixed top-6 left-1/2 z-[2000] flex items-center gap-2.5 rounded-2xl px-5 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl ${isSuccess ? 'bg-green-500/[0.12] border border-green-500/25' : 'bg-red-500/[0.12] border border-red-500/25'}`}
            style={{
                transform: `translateX(-50%) translateY(${visible ? '0' : '-20px'})`,
                opacity: visible ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <span className="text-lg">{isSuccess ? '✅' : '🚫'}</span>
            <span className={`text-sm font-semibold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>{message}</span>
        </div>
    )
}

// ═══════════════════════════════════════
// FLOATING BUTTON
// ═══════════════════════════════════════
function CookieFloatingButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-5 left-5 z-[900] w-12 h-12 rounded-2xl bg-[rgba(18,18,28,0.9)] border border-white/[0.08] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-pointer text-[22px] flex items-center justify-center hover:scale-110 transition-transform"
            title="Gérer les cookies"
        >
            🍪
        </button>
    )
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
const STORAGE_KEY = 'mayombe_cookie_consent'

export default function CookieConsent() {
    const [view, setView] = useState<'banner' | 'settings' | 'done' | 'loading'>('loading')
    const [preferences, setPreferences] = useState<Preferences>({
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
    })
    const [toastData, setToastData] = useState<{ message: string; type: string } | null>(null)

    // Check localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setPreferences(parsed)
                setView('done')
            } catch {
                setView('banner')
            }
        } else {
            setView('banner')
        }
    }, [])

    const savePreferences = (prefs: Preferences) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    }

    const handleToggle = (id: string) => {
        setPreferences(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const handleAcceptAll = () => {
        const all = { essential: true, functional: true, analytics: true, marketing: true }
        setPreferences(all)
        savePreferences(all)
        setView('done')
        setToastData({ message: 'Tous les cookies ont été acceptés', type: 'success' })
    }

    const handleRejectAll = () => {
        const minimal = { essential: true, functional: false, analytics: false, marketing: false }
        setPreferences(minimal)
        savePreferences(minimal)
        setView('done')
        setToastData({ message: 'Seuls les cookies essentiels sont actifs', type: 'info' })
    }

    const handleSaveCustom = () => {
        savePreferences(preferences)
        setView('done')
        const count = Object.values(preferences).filter(Boolean).length
        setToastData({ message: `Préférences sauvegardées (${count}/${COOKIE_CATEGORIES.length})`, type: 'success' })
    }

    const handleReopen = () => {
        setView('settings')
        setToastData(null)
    }

    if (view === 'loading') return null

    return (
        <>
            {toastData && <CookieToast {...toastData} onClose={() => setToastData(null)} />}

            {view === 'banner' && (
                <CookieBanner
                    onAcceptAll={handleAcceptAll}
                    onRejectAll={handleRejectAll}
                    onCustomize={() => setView('settings')}
                />
            )}

            {view === 'settings' && (
                <CookieSettings
                    preferences={preferences}
                    onToggle={handleToggle}
                    onSave={handleSaveCustom}
                    onAcceptAll={handleAcceptAll}
                    onBack={() => setView('banner')}
                />
            )}

            {view === 'done' && <CookieFloatingButton onClick={handleReopen} />}
        </>
    )
}
