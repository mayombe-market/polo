// ═══════════════════════════════════════════════════════
// Plans Immobilier — Mayombe Market
// Partagé serveur + client
// ═══════════════════════════════════════════════════════

export interface ImmoPlanFeature {
    text: string
    icon: string
    included: boolean
    highlight?: boolean
}

export interface ImmoPlan {
    id: string
    name: string
    icon: string
    emoji: string
    price: number
    yearlyPrice: number
    color: string
    gradient: string
    shadowColor: string
    popular: boolean
    maxListings: number          // -1 = illimité
    listingDurationDays: number  // -1 = permanent
    maxPhotos: number
    badgeLabel: string | null
    youtubeLink: boolean
    phoneVisible: boolean
    boostsPerMonth: number
    statsLevel: number           // 0 = aucun, 1 = basique, 2 = complet
    approvalRequired: boolean
    tagline: string
    features: ImmoPlanFeature[]
}

export const IMMO_PLANS: ImmoPlan[] = [
    {
        id: 'immo_free',
        name: 'Particulier',
        icon: '🏠',
        emoji: '🏠',
        price: 0,
        yearlyPrice: 0,
        color: '#6B7280',
        gradient: 'linear-gradient(135deg, #6B7280, #4B5563)',
        shadowColor: 'rgba(107,114,128,0.25)',
        popular: false,
        maxListings: 3,
        listingDurationDays: 30,
        maxPhotos: 5,
        badgeLabel: null,
        youtubeLink: false,
        phoneVisible: false,
        boostsPerMonth: 0,
        statsLevel: 0,
        approvalRequired: true,
        tagline: 'Pour vendre ou louer votre bien personnel',
        features: [
            { text: '3 annonces simultanées', icon: '📋', included: true },
            { text: '5 photos par annonce', icon: '📷', included: true },
            { text: 'Annonce visible 30 jours', icon: '📅', included: true },
            { text: 'Modération admin requise', icon: '⏳', included: true },
            { text: 'Badge "Agent"', icon: '🏅', included: false },
            { text: 'Téléphone visible', icon: '📞', included: false },
            { text: 'Lien vidéo YouTube', icon: '🎥', included: false },
            { text: 'Publication directe', icon: '⚡', included: false },
            { text: 'Statistiques', icon: '📊', included: false },
            { text: 'Mise en avant / mois', icon: '⬆️', included: false },
        ],
    },
    {
        id: 'immo_agent',
        name: 'Agent',
        icon: '🏢',
        emoji: '🔑',
        price: 20000,
        yearlyPrice: 200000,
        color: '#3B82F6',
        gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        shadowColor: 'rgba(59,130,246,0.25)',
        popular: true,
        maxListings: 15,
        listingDurationDays: 60,
        maxPhotos: 12,
        badgeLabel: 'Agent',
        youtubeLink: true,
        phoneVisible: true,
        boostsPerMonth: 1,
        statsLevel: 1,
        approvalRequired: false,
        tagline: 'Pour les agents immobiliers indépendants',
        features: [
            { text: '15 annonces simultanées', icon: '📋', included: true, highlight: true },
            { text: '12 photos par annonce', icon: '📷', included: true },
            { text: 'Annonce visible 60 jours', icon: '📅', included: true },
            { text: 'Publication directe', icon: '⚡', included: true, highlight: true },
            { text: 'Badge "Agent" 🏅', icon: '🏅', included: true, highlight: true },
            { text: 'Téléphone visible', icon: '📞', included: true },
            { text: 'Lien vidéo YouTube', icon: '🎥', included: true },
            { text: 'Statistiques basiques', icon: '📊', included: true },
            { text: '1 mise en avant / mois', icon: '⬆️', included: true },
            { text: 'Page agence dédiée', icon: '🏗️', included: false },
        ],
    },
    {
        id: 'immo_agence',
        name: 'Agence',
        icon: '🏗️',
        emoji: '🏙️',
        price: 50000,
        yearlyPrice: 500000,
        color: '#A855F7',
        gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)',
        shadowColor: 'rgba(168,85,247,0.3)',
        popular: false,
        maxListings: -1,
        listingDurationDays: -1,
        maxPhotos: 20,
        badgeLabel: 'Agence certifiée',
        youtubeLink: true,
        phoneVisible: true,
        boostsPerMonth: 5,
        statsLevel: 2,
        approvalRequired: false,
        tagline: 'Pour les agences immobilières professionnelles',
        features: [
            { text: 'Annonces illimitées ∞', icon: '📋', included: true, highlight: true },
            { text: '20 photos par annonce', icon: '📷', included: true, highlight: true },
            { text: 'Annonces permanentes', icon: '📅', included: true, highlight: true },
            { text: 'Publication directe', icon: '⚡', included: true },
            { text: 'Badge "Agence certifiée" 🥇', icon: '🏅', included: true, highlight: true },
            { text: 'Téléphone visible', icon: '📞', included: true },
            { text: 'Lien vidéo YouTube', icon: '🎥', included: true },
            { text: 'Statistiques complètes', icon: '📊', included: true, highlight: true },
            { text: '5 mises en avant / mois', icon: '⬆️', included: true, highlight: true },
            { text: 'Page agence dédiée', icon: '🏗️', included: true, highlight: true },
        ],
    },
]

/** Nombre maximum d'annonces simultanées selon le plan. -1 = illimité. */
export function getImmoMaxListings(plan: string): number {
    switch (plan) {
        case 'immo_free': return 3
        case 'immo_agent': return 15
        case 'immo_agence': return -1
        default: return 3
    }
}

/** Durée d'une annonce en jours. -1 = permanente tant que l'abonnement est actif. */
export function getImmoListingDurationDays(plan: string): number {
    switch (plan) {
        case 'immo_free': return 30
        case 'immo_agent': return 60
        case 'immo_agence': return -1
        default: return 30
    }
}

/** Badge affiché sur les annonces immobilières. null = aucun badge. */
export function getImmoBadgeLabel(plan: string): string | null {
    switch (plan) {
        case 'immo_agent': return 'Agent'
        case 'immo_agence': return 'Agence certifiée'
        default: return null
    }
}

/** Nombre maximum de photos par annonce. */
export function getImmoMaxPhotos(plan: string): number {
    switch (plan) {
        case 'immo_free': return 5
        case 'immo_agent': return 12
        case 'immo_agence': return 20
        default: return 5
    }
}

/** Nombre de mises en avant (boosts) par mois. */
export function getImmoBoosts(plan: string): number {
    switch (plan) {
        case 'immo_agent': return 1
        case 'immo_agence': return 5
        default: return 0
    }
}

/** Vrai si l'annonce doit être modérée par un admin avant publication. */
export function isImmoApprovalRequired(plan: string): boolean {
    return plan === 'immo_free'
}

/** Vrai si le plan est un plan immobilier (commence par "immo_"). */
export function isImmoPlan(plan: string | null | undefined): boolean {
    return !!plan?.startsWith('immo_')
}

/** Nom lisible du plan immobilier. */
export function getImmoPlanName(plan: string): string {
    switch (plan) {
        case 'immo_free': return 'Particulier'
        case 'immo_agent': return 'Agent'
        case 'immo_agence': return 'Agence'
        default: return 'Particulier'
    }
}
