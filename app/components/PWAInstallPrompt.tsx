'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

type Platform = 'android' | 'ios' | null

declare global {
    interface Window {
        deferredInstallPrompt?: BeforeInstallPromptEvent
    }
}
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectPlatform(): Platform {
    if (typeof navigator === 'undefined') return null
    const ua = navigator.userAgent
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
    if (/android/i.test(ua)) return 'android'
    return null
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export default function PWAInstallPrompt() {
    const [visible, setVisible] = useState(false)
    const [platform, setPlatform] = useState<Platform>(null)
    const [iosGuide, setIosGuide] = useState(false)
    const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)

    useEffect(() => {
        if (isStandalone()) return

        // Try to retrieve a previously stored event
        if (window.deferredInstallPrompt) {
            setDeferredEvent(window.deferredInstallPrompt)
        }

        const handler = (e: Event) => {
            e.preventDefault()
            const promptEvent = e as BeforeInstallPromptEvent
            window.deferredInstallPrompt = promptEvent
            setDeferredEvent(promptEvent)
            setPlatform('android')
            try {
                const dismissed = sessionStorage.getItem('pwa_prompt_dismissed')
                if (!dismissed) setVisible(true)
            } catch {
                setVisible(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handler)

        const plat = detectPlatform()
        setPlatform(plat)

        if (plat === 'ios') {
            try {
                const dismissed = sessionStorage.getItem('pwa_prompt_dismissed')
                if (!dismissed) setTimeout(() => setVisible(true), 3000)
            } catch {
                setTimeout(() => setVisible(true), 3000)
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const dismiss = () => {
        setVisible(false)
        try { sessionStorage.setItem('pwa_prompt_dismissed', '1') } catch { /* noop */ }
    }

    const handleInstall = async () => {
        if (platform === 'ios') {
            setIosGuide(true)
            return
        }
        if (deferredEvent) {
            await deferredEvent.prompt()
            const { outcome } = await deferredEvent.userChoice
            if (outcome === 'accepted') {
                dismiss()
            }
        }
    }

    if (!visible) return null

    return (
        <>
            {/* Overlay iOS guide */}
            {iosGuide && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIosGuide(false)}>
                    <div
                        className="w-full max-w-sm rounded-3xl p-6 mb-2"
                        style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-orange-500 flex items-center justify-center">
                                <Smartphone size={18} className="text-white" />
                            </div>
                            <p className="text-white font-bold text-sm">Installer Mayombe Market</p>
                        </div>
                        <div className="space-y-3 text-sm text-white/70">
                            <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                                <p>Appuyez sur l&apos;icône <strong className="text-white">Partager</strong> en bas de votre navigateur Safari.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                                <p>Faites défiler et choisissez <strong className="text-white">&ldquo;Sur l&apos;écran d&apos;accueil&rdquo;</strong>.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                                <p>Confirmez en appuyant sur <strong className="text-white">&ldquo;Ajouter&rdquo;</strong>.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIosGuide(false)}
                            className="mt-5 w-full py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Banner principal */}
            <div className="fixed bottom-4 left-4 right-4 z-[100] flex justify-center pointer-events-none">
                <div
                    className="w-full max-w-sm rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto"
                    style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Download size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold leading-tight">Installer l&apos;appli</p>
                        <p className="text-white/50 text-[10px] leading-tight mt-0.5">Accès rapide depuis votre écran</p>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #22C55E, #F97316)' }}
                    >
                        Installer
                    </button>
                    <button onClick={dismiss} className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0">
                        <X size={16} />
                    </button>
                </div>
            </div>
        </>
    )
}
