/**
 * Métadonnées « annonce hôtelière » stockées dans `products.listing_extras` (jsonb).
 * Discriminant : version === 'hotel_v1'
 */

export const HOTEL_CATEGORY = 'Hôtels'

export const HOTEL_ROOM_TYPES = [
    { id: 'standard',  label: 'Chambre Standard',  emoji: '🛏️' },
    { id: 'double',    label: 'Chambre Double',     emoji: '🛏️' },
    { id: 'triple',    label: 'Chambre Triple',     emoji: '🛏️' },
    { id: 'suite',     label: 'Suite',              emoji: '👑' },
    { id: 'familiale', label: 'Chambre Familiale',  emoji: '👨‍👩‍👧' },
    { id: 'vip',       label: 'VIP / Penthouse',    emoji: '🌟' },
] as const

export type HotelRoomType = typeof HOTEL_ROOM_TYPES[number]['id']

export const HOTEL_AMENITIES = [
    { id: 'wifi',              label: 'Wi-Fi',              emoji: '📶' },
    { id: 'clim',              label: 'Climatisation',      emoji: '❄️' },
    { id: 'tv',                label: 'Télévision',         emoji: '📺' },
    { id: 'piscine',           label: 'Piscine',            emoji: '🏊' },
    { id: 'petit_dejeuner',    label: 'Petit-déjeuner',     emoji: '🍳' },
    { id: 'parking',           label: 'Parking',            emoji: '🅿️' },
    { id: 'room_service',      label: 'Room service',       emoji: '🍽️' },
    { id: 'salle_de_bain',     label: 'Salle de bain privée', emoji: '🚿' },
    { id: 'eau_chaude',        label: 'Eau chaude',         emoji: '♨️' },
    { id: 'coffre',            label: 'Coffre-fort',        emoji: '🔒' },
    { id: 'bar',               label: 'Bar / Restaurant',   emoji: '🍸' },
    { id: 'salle_conference',  label: 'Salle de conférence', emoji: '🎤' },
] as const

export type HotelAmenityId = typeof HOTEL_AMENITIES[number]['id']

export interface HotelListingExtrasV1 {
    version: 'hotel_v1'
    roomType: HotelRoomType
    capacity: number
    pricePerNight: number
    city: string
    district?: string
    amenities: HotelAmenityId[]
    stars?: number          // 1–5
    hotelName?: string
    priceNegotiable?: boolean
    priceOnRequest?: boolean
}

export function isHotelListing(raw: unknown): raw is HotelListingExtrasV1 {
    if (raw == null || typeof raw !== 'object') return false
    return (raw as Record<string, unknown>).version === 'hotel_v1'
}

export function parseHotelExtras(raw: unknown): HotelListingExtrasV1 | null {
    if (!isHotelListing(raw)) return null
    const o = raw as unknown as Record<string, unknown>
    const validTypes = HOTEL_ROOM_TYPES.map(t => t.id)
    if (!validTypes.includes(o.roomType as HotelRoomType)) return null
    if (typeof o.city !== 'string') return null
    return {
        version: 'hotel_v1',
        roomType: o.roomType as HotelRoomType,
        capacity: typeof o.capacity === 'number' && o.capacity > 0 ? o.capacity : 2,
        pricePerNight: typeof o.pricePerNight === 'number' ? o.pricePerNight : 0,
        city: String(o.city).trim(),
        district: typeof o.district === 'string' ? o.district.trim() : undefined,
        amenities: Array.isArray(o.amenities) ? (o.amenities as string[]).filter(Boolean) as HotelAmenityId[] : [],
        stars: typeof o.stars === 'number' && o.stars >= 1 && o.stars <= 5 ? o.stars : undefined,
        hotelName: typeof o.hotelName === 'string' ? o.hotelName.trim() : undefined,
        priceNegotiable: Boolean(o.priceNegotiable),
        priceOnRequest: Boolean(o.priceOnRequest),
    }
}

export function buildHotelExtrasV1(input: Omit<HotelListingExtrasV1, 'version'>): HotelListingExtrasV1 {
    return { version: 'hotel_v1', ...input }
}

export function formatHotelPriceLabel(extras: HotelListingExtrasV1 | null): string {
    if (!extras) return 'Prix sur demande'
    if (extras.priceOnRequest) return 'Prix sur demande'
    if (extras.priceNegotiable && (!extras.pricePerNight || extras.pricePerNight < 100)) return 'Prix à négocier'
    if (!extras.pricePerNight || extras.pricePerNight < 100) return 'Prix sur demande'
    return `${new Intl.NumberFormat('fr-FR').format(extras.pricePerNight)} FCFA / nuit`
}

export function getRoomTypeLabel(id: HotelRoomType): string {
    return HOTEL_ROOM_TYPES.find(t => t.id === id)?.label ?? 'Chambre'
}

export function getAmenityLabel(id: string): string {
    return HOTEL_AMENITIES.find(a => a.id === id)?.label ?? id
}

export function getAmenityEmoji(id: string): string {
    return HOTEL_AMENITIES.find(a => a.id === id)?.emoji ?? '✓'
}
