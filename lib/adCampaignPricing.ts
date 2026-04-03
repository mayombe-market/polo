/** Grille tarifaire campagnes (FCFA) — alignée produit / durée */

export const HERO_PRICES_FCFA: Record<3 | 7 | 14 | 30, number> = {
    3: 5000,
    7: 15000,
    14: 20000,
    30: 30000,
}

export const TILE_PRICES_FCFA: Record<3 | 7 | 14 | 30, number> = {
    3: 1000,
    7: 5000,
    14: 10000,
    30: 15000,
}

export type AdDurationDays = 3 | 7 | 14 | 30

export type AdPlacement = 'hero' | 'tile'

export function isDurationDays(n: number): n is AdDurationDays {
    return n === 3 || n === 7 || n === 14 || n === 30
}

export function priceForCampaign(placement: AdPlacement, durationDays: AdDurationDays): number {
    return placement === 'hero' ? HERO_PRICES_FCFA[durationDays] : TILE_PRICES_FCFA[durationDays]
}

export const MAX_HERO_SLIDES = 7
