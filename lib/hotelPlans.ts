// ═══════════════════════════════════════════════════════
// Plans Hôtellerie — Mayombe Market
// ═══════════════════════════════════════════════════════

export interface HotelPlanFeature {
    text: string
    icon: string
    included: boolean
    highlight?: boolean
}

export interface HotelPlan {
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
    maxRooms: number          // -1 = illimité
    listingDurationDays: number  // -1 = permanent
    maxPhotos: number
    badgeLabel: string | null
    youtubeLink: boolean
    phoneVisible: boolean
    boostsPerMonth: number
    statsLevel: number           // 0=aucun, 1=basique, 2=complet
    approvalRequired: boolean
    tagline: string
    features: HotelPlanFeature[]
}

export const HOTEL_PLANS: HotelPlan[] = [
    {
        id: 'hotel_free',
        name: 'Indépendant',
        icon: '🏨',
        emoji: '🏨',
        price: 0,
        yearlyPrice: 0,
        color: '#6B7280',
        gradient: 'linear-gradient(135deg, #6B7280, #4B5563)',
        shadowColor: 'rgba(107,114,128,0.25)',
        popular: false,
        maxRooms: 3,
        listingDurationDays: 30,
        maxPhotos: 5,
        badgeLabel: null,
        youtubeLink: false,
        phoneVisible: false,
        boostsPerMonth: 0,
        statsLevel: 0,
        approvalRequired: true,
        tagline: 'Pour les petits hôtels et chambres d\'hôtes',
        features: [
            { text: '3 chambres simultanées', icon: '🛏️', included: true },
            { text: '5 photos par chambre',   icon: '📷', included: true },
            { text: 'Annonce visible 30 jours', icon: '📅', included: true },
            { text: 'Modération admin requise', icon: '⏳', included: true },
            { text: 'Badge "Hôtel Pro"',       icon: '🏅', included: false },
            { text: 'Téléphone visible',        icon: '📞', included: false },
            { text: 'Lien vidéo YouTube',       icon: '🎥', included: false },
            { text: 'Publication directe',      icon: '⚡', included: false },
            { text: 'Statistiques',             icon: '📊', included: false },
            { text: 'Mise en avant / mois',     icon: '⬆️', included: false },
        ],
    },
    {
        id: 'hotel_pro',
        name: 'Hôtel Pro',
        icon: '🌟',
        emoji: '🌟',
        price: 8000,
        yearlyPrice: 76800,
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
        shadowColor: 'rgba(245,158,11,0.3)',
        popular: true,
        maxRooms: 20,
        listingDurationDays: 60,
        maxPhotos: 12,
        badgeLabel: 'Hôtel Pro',
        youtubeLink: true,
        phoneVisible: true,
        boostsPerMonth: 1,
        statsLevel: 1,
        approvalRequired: false,
        tagline: 'Pour les hôtels indépendants professionnels',
        features: [
            { text: '20 chambres simultanées', icon: '🛏️', included: true, highlight: true },
            { text: '12 photos par chambre',   icon: '📷', included: true },
            { text: 'Annonce visible 60 jours', icon: '📅', included: true },
            { text: 'Publication directe',     icon: '⚡', included: true, highlight: true },
            { text: 'Badge "Hôtel Pro" 🏅',   icon: '🏅', included: true, highlight: true },
            { text: 'Téléphone visible',       icon: '📞', included: true },
            { text: 'Lien vidéo YouTube',      icon: '🎥', included: true },
            { text: 'Statistiques basiques',   icon: '📊', included: true },
            { text: '1 mise en avant / mois',  icon: '⬆️', included: true },
            { text: 'Page hôtel dédiée',       icon: '🏗️', included: false },
        ],
    },
    {
        id: 'hotel_chain',
        name: 'Chaîne',
        icon: '⭐',
        emoji: '🏙️',
        price: 20000,
        yearlyPrice: 192000,
        color: '#8B5CF6',
        gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        shadowColor: 'rgba(139,92,246,0.3)',
        popular: false,
        maxRooms: -1,
        listingDurationDays: -1,
        maxPhotos: 20,
        badgeLabel: 'Hôtel Certifié',
        youtubeLink: true,
        phoneVisible: true,
        boostsPerMonth: 5,
        statsLevel: 2,
        approvalRequired: false,
        tagline: 'Pour les chaînes hôtelières et grands établissements',
        features: [
            { text: 'Chambres illimitées ∞',       icon: '🛏️', included: true, highlight: true },
            { text: '20 photos par chambre',        icon: '📷', included: true, highlight: true },
            { text: 'Annonces permanentes',         icon: '📅', included: true, highlight: true },
            { text: 'Publication directe',          icon: '⚡', included: true },
            { text: 'Badge "Hôtel Certifié" ⭐',   icon: '🏅', included: true, highlight: true },
            { text: 'Téléphone visible',            icon: '📞', included: true },
            { text: 'Lien vidéo YouTube',           icon: '🎥', included: true },
            { text: 'Statistiques complètes',       icon: '📊', included: true, highlight: true },
            { text: '5 mises en avant / mois',     icon: '⬆️', included: true, highlight: true },
            { text: 'Page hôtel dédiée',            icon: '🏗️', included: true, highlight: true },
        ],
    },
]

export function getHotelMaxRooms(plan: string): number {
    switch (plan) {
        case 'hotel_free': return 3
        case 'hotel_pro':  return 20
        case 'hotel_chain': return -1
        default: return 3
    }
}

export function getHotelListingDurationDays(plan: string): number {
    switch (plan) {
        case 'hotel_free': return 30
        case 'hotel_pro':  return 60
        case 'hotel_chain': return -1
        default: return 30
    }
}

export function getHotelBadgeLabel(plan: string): string | null {
    switch (plan) {
        case 'hotel_pro':   return 'Hôtel Pro'
        case 'hotel_chain': return 'Hôtel Certifié'
        default: return null
    }
}

export function getHotelMaxPhotos(plan: string): number {
    switch (plan) {
        case 'hotel_free': return 5
        case 'hotel_pro':  return 12
        case 'hotel_chain': return 20
        default: return 5
    }
}

export function getHotelBoosts(plan: string): number {
    switch (plan) {
        case 'hotel_pro':   return 1
        case 'hotel_chain': return 5
        default: return 0
    }
}

export function isHotelApprovalRequired(plan: string): boolean {
    return plan === 'hotel_free'
}

export function isHotelPlan(plan: string | null | undefined): boolean {
    return !!plan?.startsWith('hotel_')
}

export function getHotelPlanName(plan: string): string {
    switch (plan) {
        case 'hotel_free':  return 'Indépendant'
        case 'hotel_pro':   return 'Hôtel Pro'
        case 'hotel_chain': return 'Chaîne'
        default: return 'Indépendant'
    }
}
