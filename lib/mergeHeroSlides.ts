import { MAX_HERO_SLIDES } from '@/lib/adCampaignPricing'

/** Bannière admin (table ads) */
export type AdminAdRow = {
    id: string
    title?: string | null
    img?: string | null
    link_url?: string | null
    position?: number | null
    is_active?: boolean | null
}

/** Campagne vendeur active (hero) */
export type VendorHeroCampaignRow = {
    id: string
    title?: string | null
    description?: string | null
    image_url: string
    link_url: string
    display_order?: number | null
}

/** Format unifié pour le carrousel hero accueil */
export type UnifiedHeroSlide = {
    id: string
    source: 'admin' | 'campaign'
    title: string
    img: string
    link_url: string
    /** Sous-texte optionnel (description campagne) */
    subtitle?: string | null
}

/**
 * Admin d’abord (tri position), puis campagnes vendeur (display_order, created implicite par id).
 * Total plafonné à MAX_HERO_SLIDES.
 */
export function mergeHeroSlides(ads: AdminAdRow[], campaigns: VendorHeroCampaignRow[]): UnifiedHeroSlide[] {
    const adminSlides: UnifiedHeroSlide[] = (ads || [])
        .filter((a) => a.is_active !== false && a.img)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((a) => ({
            id: `admin-${a.id}`,
            source: 'admin' as const,
            title: a.title?.trim() || 'Nouvelle sélection',
            img: String(a.img),
            link_url: a.link_url?.trim() || '/search',
            subtitle: null,
        }))

    const campaignSlides: UnifiedHeroSlide[] = (campaigns || [])
        .filter((c) => c.image_url && c.link_url)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((c) => ({
            id: `campaign-${c.id}`,
            source: 'campaign' as const,
            title: c.title?.trim() || 'À découvrir',
            img: String(c.image_url),
            link_url: c.link_url.trim(),
            subtitle: c.description?.trim() || null,
        }))

    return [...adminSlides, ...campaignSlides].slice(0, MAX_HERO_SLIDES)
}
