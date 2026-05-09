'use client'

/**
 * VendorPushPrompt
 *
 * Gère tout le cycle d'activation des notifications push pour les vendeurs :
 *  - Permission jamais demandée  → modale d'activation
 *  - Permission refusée          → guide de réactivation dans les paramètres
 *  - iOS Safari sans PWA         → guide d'installation sur l'écran d'accueil
 *  - Permission accordée         → abonnement push silencieux, rien affiché
 *
 * Skip persisté 7 jours en localStorage ; ré-apparaît ensuite pour rappel.
 */

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, Smartphone } from 'lucide-react'
import { savePushSubscription } from '@/app/actions/push'

// ─── Utilitaire VAPID ────────────────────────────────────────────────────────

function urlBase64ToUint8Array(b64: string): Uint8Array {
    const padding = '='.repeat((4 - (b64.length % 4)) % 4)
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(base64)
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// ─── Abonnement push (appelé après accord de permission) ─────────────────────

async function doSubscribePush(): Promise<boolean> {
    try {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return false
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        const sub = existing || await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as string,
        })
        const res = await savePushSubscription(sub.toJSON() as PushSubscriptionJSON)
        return 'success' in res
    } catch {
        return false
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Stage =
    | 'checking'        // initialisation (évite le flash SSR)
    | 'granted'         // déjà OK → abonnement silencieux, rien à afficher
    | 'ask_permission'  // jamais demandé → modale d'activation
    | 'denied'          // bloqué → guide paramètres navigateur
    | 'needs_pwa'       // iOS Safari sans PWA → guide installation
    | 'not_supported'   // navigateur trop ancien, rien à faire

const SKIP_KEY = 'push_skip_ts'
const SKIP_TTL = 7 * 24 * 60 * 60 * 1000 // 7 jours

function isSkipped(): boolean {
    try {
        const ts = localStorage.getItem(SKIP_KEY)
        if (!ts) return false
        return Date.now() - parseInt(ts, 10) < SKIP_TTL
    } catch {
        return false
    }
}

function setSkippedNow() {
    try { localStorage.setItem(SKIP_KEY, String(Date.now())) } catch { /* noop */ }
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function VendorPushPrompt() {
    const [stage, setStage] = useState<Stage>('checking')
    const [dismissed, setDismissed] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // iOS detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        const isStandalone =
            (window.navigator as any).standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches

        const hasPushAPI =
            'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window

        if (!hasPushAPI) {
            if (isIOS && !isStandalone) {
                setStage('needs_pwa')
            } else {
                setStage('not_supported')
            }
            return
        }

        const perm = Notification.permission
        if (perm === 'granted') {
            setStage('granted')
            void doSubscribePush() // abonnement silencieux
        } else if (perm === 'denied') {
            setStage('denied')
        } else {
            setStage('ask_permission')
        }
    }, [])

    const handleRequest = useCallback(async () => {
        setLoading(true)
        try {
            const perm = await Notification.requestPermission()
            if (perm === 'granted') {
                await doSubscribePush()
                setStage('granted')
            } else {
                setStage('denied')
            }
        } finally {
            setLoading(false)
        }
    }, [])

    const handleSkip = useCallback(() => {
        setSkippedNow()
        setDismissed(true)
    }, [])

    const handleRecheck = useCallback(async () => {
        if (Notification.permission === 'granted') {
            await doSubscribePush()
            setStage('granted')
        }
    }, [])

    // Rien à afficher
    if (stage === 'checking' || stage === 'granted' || stage === 'not_supported') return null
    if (dismissed) return null
    if (isSkipped()) return null

    // ── iOS : installer la PWA d'abord ────────────────────────────────────────
    if (stage === 'needs_pwa') {
        return (
            <Overlay>
                <IconHeader
                    icon={<Smartphone className="text-orange-500" size={26} />}
                    bg="bg-orange-100 dark:bg-orange-900/30"
                    title="Installer l'app Mayombe"
                    subtitle="Requis pour recevoir les commandes sur iPhone"
                />

                <p className="text-slate-600 dark:text-slate-300 text-sm mb-5">
                    Sur iPhone, les alertes push nécessitent que le site soit installé
                    sur votre écran d'accueil. C'est gratuit et rapide.
                </p>

                <div className="space-y-3 mb-6">
                    <Step n={1}>
                        Appuyez sur <strong>Partager</strong>{' '}
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded text-[10px] font-black">↑</span>{' '}
                        en bas de Safari
                    </Step>
                    <Step n={2}>
                        Sélectionnez <strong>« Sur l'écran d'accueil »</strong>
                    </Step>
                    <Step n={3}>
                        Appuyez sur <strong>« Ajouter »</strong> en haut à droite
                    </Step>
                    <Step n={4}>
                        Ouvrez <strong>Mayombe Market</strong> depuis l'écran d'accueil
                        et reconnectez-vous
                    </Step>
                    <Step n={5}>
                        Acceptez les notifications quand le site le demande
                    </Step>
                </div>

                <SkipLink onClick={handleSkip} />
            </Overlay>
        )
    }

    // ── Demander la permission ────────────────────────────────────────────────
    if (stage === 'ask_permission') {
        return (
            <Overlay>
                <IconHeader
                    icon={
                        <Bell
                            className="text-green-600 dark:text-green-400"
                            size={26}
                            style={{ animation: 'swing 1s ease-in-out infinite' }}
                        />
                    }
                    bg="bg-green-100 dark:bg-green-900/30"
                    title="Activez les notifications"
                    subtitle="Pour ne manquer aucune commande"
                />

                <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                    Recevez une alerte immédiate dès qu'une commande est confirmée —
                    même si vous n'êtes pas sur la page.
                </p>

                <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5 mb-6">
                    <li>🔔 Alarme sonore dans le navigateur</li>
                    <li>📲 Notification sur téléphone verrouillé</li>
                    <li>⚡ Réactivité immédiate avec vos clients</li>
                </ul>

                <button
                    onClick={handleRequest}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white font-black text-sm py-3.5 rounded-xl transition-colors mb-3 shadow-lg shadow-green-200 dark:shadow-green-900/30"
                >
                    {loading ? 'Activation en cours…' : '🔔 Activer les notifications'}
                </button>

                <SkipLink onClick={handleSkip} />
            </Overlay>
        )
    }

    // ── Permission refusée → guide réactivation ───────────────────────────────
    if (stage === 'denied') {
        return (
            <Overlay>
                <IconHeader
                    icon={<BellOff className="text-red-500" size={26} />}
                    bg="bg-red-100 dark:bg-red-900/30"
                    title="Notifications bloquées"
                    subtitle="Réactivez-les pour recevoir vos commandes"
                />

                <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                    Vous avez refusé les notifications. Suivez les étapes ci-dessous
                    pour les réactiver dans les paramètres de votre navigateur.
                </p>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-4 mb-6 text-sm">
                    <div>
                        <p className="font-black text-slate-800 dark:text-slate-200 mb-1">
                            🤖 Android (Chrome)
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                            Menu ⋮ → Paramètres → Paramètres du site → Notifications →
                            Trouver <em>mayombe-market.com</em> → Autoriser
                        </p>
                    </div>
                    <div>
                        <p className="font-black text-slate-800 dark:text-slate-200 mb-1">
                            🍎 iPhone (Safari)
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                            Réglages → Applications → Safari → Sites web → Notifications →
                            <em>mayombe-market.com</em> → Autoriser
                        </p>
                    </div>
                    <div>
                        <p className="font-black text-slate-800 dark:text-slate-200 mb-1">
                            💻 Ordinateur (Chrome)
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                            Cliquez sur 🔒 dans la barre d'adresse → Notifications → Autoriser
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleRecheck}
                    className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm py-3.5 rounded-xl transition-colors mb-3"
                >
                    ✅ J'ai réactivé — Vérifier
                </button>

                <SkipLink onClick={handleSkip} />
            </Overlay>
        )
    }

    return null
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function Overlay({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[99997] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                {children}
            </div>
        </div>
    )
}

function IconHeader({
    icon, bg, title, subtitle,
}: {
    icon: React.ReactNode
    bg: string
    title: string
    subtitle: string
}) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div>
                <h2 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
                    {title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
        </div>
    )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-orange-500 text-white text-xs font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">
                {n}
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
        </div>
    )
}

function SkipLink({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-500 transition-colors py-1.5"
        >
            Ignorer pour l'instant (non recommandé)
        </button>
    )
}
