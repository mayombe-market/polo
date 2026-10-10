/**
 * Utilitaires analytics côté client.
 *
 * - Capture des paramètres UTM depuis l'URL
 * - Détection de la source de trafic (Facebook, Google, WhatsApp…)
 * - Session anonyme persistée en sessionStorage
 * - Génération de liens avec UTM pour le partage social
 *
 * Aucune donnée personnelle n'est stockée.
 */

export type TrafficSource =
    | 'facebook'
    | 'tiktok'
    | 'instagram'
    | 'whatsapp'
    | 'google'
    | 'internal_search'
    | 'internal_nav'
    | 'direct'
    | 'unknown'

export interface AnalyticsContext {
    session_id: string
    source: TrafficSource
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
}

const SESSION_KEY = 'mmk_sid'
const UTM_KEY = 'mmk_utm'

function generateSessionId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function trySessionStorage(op: () => void) {
    try {
        op()
    } catch {
        // sessionStorage non accessible (mode privé, iframe restrictif, etc.)
    }
}

export function getOrCreateSessionId(): string {
    let sid: string | null = null
    trySessionStorage(() => { sid = sessionStorage.getItem(SESSION_KEY) })
    if (!sid) {
        sid = generateSessionId()
        trySessionStorage(() => sessionStorage.setItem(SESSION_KEY, sid!))
    }
    return sid
}

function classifySource(utmSource: string | null, referrer: string): TrafficSource {
    if (utmSource) {
        const s = utmSource.toLowerCase()
        if (s === 'facebook' || s === 'fb' || s.includes('facebook')) return 'facebook'
        if (s === 'tiktok' || s.includes('tiktok')) return 'tiktok'
        if (s === 'instagram' || s === 'ig' || s.includes('instagram')) return 'instagram'
        if (s === 'whatsapp' || s === 'wa' || s.includes('whatsapp')) return 'whatsapp'
        if (s === 'google' || s.includes('google')) return 'google'
        return 'unknown'
    }

    if (!referrer) return 'direct'

    try {
        const ref = new URL(referrer)
        const host = ref.hostname.toLowerCase()

        if (host.includes('facebook.com') || host.includes('fb.com') || host === 'l.facebook.com') return 'facebook'
        if (host.includes('tiktok.com') || host.includes('tiktok.app')) return 'tiktok'
        if (host.includes('instagram.com')) return 'instagram'
        if (host.includes('whatsapp.com') || host.includes('wa.me')) return 'whatsapp'
        if (host.includes('google.com') || host.includes('google.') || host.includes('bing.com') || host.includes('yahoo.com')) return 'google'

        if (host.includes('mayombe-market.com') || host === 'localhost' || host === '127.0.0.1') {
            const isSearch = ref.searchParams.has('q') || ref.pathname.includes('/search')
            return isSearch ? 'internal_search' : 'internal_nav'
        }

        return 'unknown'
    } catch {
        return 'unknown'
    }
}

export function captureAnalyticsContext(): AnalyticsContext {
    const sid = getOrCreateSessionId()

    let utmSource: string | null = null
    let utmMedium: string | null = null
    let utmCampaign: string | null = null

    trySessionStorage(() => {
        // Lire UTM depuis l'URL courante
        const params = new URLSearchParams(window.location.search)
        const fresh = params.get('utm_source')

        if (fresh) {
            utmSource = fresh
            utmMedium = params.get('utm_medium')
            utmCampaign = params.get('utm_campaign')
            // Persister pour le reste de la session
            sessionStorage.setItem(UTM_KEY, JSON.stringify({ utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign }))
        } else {
            const stored = sessionStorage.getItem(UTM_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                utmSource = parsed.utm_source ?? null
                utmMedium = parsed.utm_medium ?? null
                utmCampaign = parsed.utm_campaign ?? null
            }
        }
    })

    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    const source = classifySource(utmSource, referrer)

    return { session_id: sid, source, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign }
}

// ─── Libellés pour l'affichage dans le dashboard ─────────────────────────────

export const SOURCE_LABELS: Record<TrafficSource, string> = {
    facebook: 'Facebook',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    google: 'Google',
    internal_search: 'Recherche interne',
    internal_nav: 'Navigation interne',
    direct: 'Accès direct',
    unknown: 'Source inconnue',
}

export const SOURCE_COLORS: Record<TrafficSource, string> = {
    facebook: '#1877F2',
    tiktok: '#010101',
    instagram: '#E1306C',
    whatsapp: '#25D366',
    google: '#4285F4',
    internal_search: '#F59E0B',
    internal_nav: '#8B5CF6',
    direct: '#6B7280',
    unknown: '#D1D5DB',
}

// ─── Génération de liens UTM pour le partage social ──────────────────────────

export interface UtmLinkOptions {
    source: 'facebook' | 'tiktok' | 'instagram' | 'whatsapp'
    medium?: string
    campaign?: string
}

export function buildUtmUrl(baseUrl: string, opts: UtmLinkOptions): string {
    try {
        const url = new URL(baseUrl)
        url.searchParams.set('utm_source', opts.source)
        url.searchParams.set('utm_medium', opts.medium ?? 'social')
        if (opts.campaign) url.searchParams.set('utm_campaign', opts.campaign)
        return url.toString()
    } catch {
        const sep = baseUrl.includes('?') ? '&' : '?'
        const medium = opts.medium ?? 'social'
        const campaign = opts.campaign ? `&utm_campaign=${encodeURIComponent(opts.campaign)}` : ''
        return `${baseUrl}${sep}utm_source=${opts.source}&utm_medium=${medium}${campaign}`
    }
}

export function buildWhatsAppShareUrl(targetUrl: string, message?: string): string {
    const text = message ? `${message} ${targetUrl}` : targetUrl
    return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function buildFacebookShareUrl(targetUrl: string): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`
}
