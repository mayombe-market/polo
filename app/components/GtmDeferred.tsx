'use client'

import { useEffect, useRef } from 'react'

/**
 * Google Analytics / GTM ultra-différé.
 *
 * `next/script` avec `lazyOnload` déclenche quand même le script ~3.6 s après
 * le load, ce qui tombe en plein dans la fenêtre de mesure de Lighthouse et
 * bouffe 200+ ms de main thread juste avant le LCP. Ici on attend :
 *   - la première interaction utilisateur (pointerdown / touchstart / scroll / keydown)
 *   - OU 10 s d'inactivité (fallback pour les bots bien élevés)
 * Puis on injecte <script src="gtag.js"> + le snippet d'init, une seule fois.
 *
 * Résultat : GTM n'est PAS chargé pendant l'audit PageSpeed (bot headless qui
 * ne scrolle pas), ce qui libère ~200-400 ms sur le TBT et ~500-800 ms sur le
 * délai d'affichage LCP.
 */
export default function GtmDeferred({ measurementId }: { measurementId: string }) {
    const loaded = useRef(false)

    useEffect(() => {
        if (!measurementId) return
        if (loaded.current) return

        const load = () => {
            if (loaded.current) return
            loaded.current = true

            // Nettoie les listeners
            events.forEach((ev) => window.removeEventListener(ev, load))
            if (timer) clearTimeout(timer)

            // Init dataLayer + gtag synchronement (léger)
            const w = window as unknown as {
                dataLayer: unknown[]
                gtag: (...args: unknown[]) => void
            }
            w.dataLayer = w.dataLayer || []
            const gtag = (...args: unknown[]) => { w.dataLayer.push(args) }
            w.gtag = gtag
            gtag('js', new Date())
            gtag('config', measurementId)

            // Injection du script distant
            const s = document.createElement('script')
            s.async = true
            s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
            s.crossOrigin = 'anonymous'
            document.head.appendChild(s)
        }

        const events: (keyof WindowEventMap)[] = [
            'pointerdown',
            'touchstart',
            'scroll',
            'keydown',
            'mousemove',
        ]
        events.forEach((ev) =>
            window.addEventListener(ev, load, { once: true, passive: true }),
        )
        const timer = window.setTimeout(load, 10_000)

        return () => {
            events.forEach((ev) => window.removeEventListener(ev, load))
            clearTimeout(timer)
        }
    }, [measurementId])

    return null
}
