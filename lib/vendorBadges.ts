export type VendorBadgeId = 'trusted' | 'well_rated' | 'verified' | 'new'

export type VendorBadge = {
    id: VendorBadgeId
    label: string
    emoji: string
    description: string
    color: string
    bg: string
    darkBg: string
}

export type VendorBadgeInput = {
    verification_status?: string | null
    confirmed_sales_count?: number | null
    averageRating?: number
    reviewCount?: number
    created_at?: string | null
}

const DEFINITIONS: VendorBadge[] = [
    {
        id: 'trusted',
        label: 'Vendeur de confiance',
        emoji: '🏆',
        description: '30+ ventes confirmées, note ≥ 4,5/5 et 10+ avis clients.',
        color: '#D97706',
        bg: '#FEF3C7',
        darkBg: 'rgba(217,119,6,0.15)',
    },
    {
        id: 'well_rated',
        label: 'Bien évalué',
        emoji: '⭐',
        description: 'Note moyenne ≥ 4,5/5 basée sur au moins 10 avis clients.',
        color: '#6366F1',
        bg: '#EEF2FF',
        darkBg: 'rgba(99,102,241,0.15)',
    },
    {
        id: 'verified',
        label: 'Vendeur vérifié',
        emoji: '✅',
        description: 'Identité et documents contrôlés par l\'équipe Mayombe Market.',
        color: '#059669',
        bg: '#ECFDF5',
        darkBg: 'rgba(5,150,105,0.15)',
    },
    {
        id: 'new',
        label: 'Nouveau vendeur',
        emoji: '🆕',
        description: 'Rejoint la plateforme récemment — aidez-le avec un premier avis !',
        color: '#2563EB',
        bg: '#EFF6FF',
        darkBg: 'rgba(37,99,235,0.15)',
    },
]

export function computeVendorBadges(input: VendorBadgeInput): VendorBadge[] {
    const {
        verification_status,
        confirmed_sales_count,
        averageRating = 0,
        reviewCount = 0,
        created_at,
    } = input

    const sales = confirmed_sales_count ?? 0
    const rating = averageRating ?? 0
    const reviews = reviewCount ?? 0

    const badges: VendorBadge[] = []

    const isTrusted = sales >= 30 && rating >= 4.5 && reviews >= 10
    const isWellRated = rating >= 4.5 && reviews >= 10

    if (isTrusted) {
        badges.push(DEFINITIONS.find(b => b.id === 'trusted')!)
    } else if (isWellRated) {
        badges.push(DEFINITIONS.find(b => b.id === 'well_rated')!)
    }

    if (verification_status === 'verified') {
        badges.push(DEFINITIONS.find(b => b.id === 'verified')!)
    }

    if (badges.length === 0) {
        const isNew = created_at
            ? Date.now() - new Date(created_at).getTime() < 90 * 24 * 60 * 60 * 1000
            : true
        if (isNew || sales < 5) {
            badges.push(DEFINITIONS.find(b => b.id === 'new')!)
        }
    }

    return badges
}

export function getTopBadge(input: VendorBadgeInput): VendorBadge | null {
    const b = computeVendorBadges(input)
    return b[0] ?? null
}

export { DEFINITIONS as BADGE_DEFINITIONS }
