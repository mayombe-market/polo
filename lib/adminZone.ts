/**
 * Zones admin : même logique métier côté client et serveur.
 * Super-admin = profil sans ville reconnue Brazzaville / Pointe-Noire (`profiles.city` vide ou invalide).
 */
import { normalizeToServiceCityCode, type ServiceCityCode } from '@/lib/deliveryLocation'

export type AdminZoneScope = 'all' | ServiceCityCode

export function getAdminScopeFromProfileCity(city: string | null | undefined): AdminZoneScope {
    const code = normalizeToServiceCityCode(city)
    if (!code) return 'all'
    return code
}

export function getOrderDeliveryZone(city: string | null | undefined): ServiceCityCode | null {
    return normalizeToServiceCityCode(city)
}

/** Abonnement : `orders.city` est factice — utiliser la ville du vendeur (`user_id`). */
export function isSubscriptionOrder(order: { order_type?: string | null }): boolean {
    return order.order_type === 'subscription'
}

/** Campagnes, vérifs vendeur : la zone suit la ville du profil vendeur. */
export function canZoneAdminActOnVendor(
    adminScope: AdminZoneScope,
    vendorCity: string | null | undefined
): boolean {
    if (adminScope === 'all') return true
    const z = normalizeToServiceCityCode(vendorCity)
    if (!z) return false
    return z === adminScope
}

export function vendorCityZoneCardClass(city: string | null | undefined): string {
    const z = normalizeToServiceCityCode(city)
    if (z === 'brazzaville') {
        return 'border-2 border-blue-400 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
    }
    if (z === 'pointe-noire') {
        return 'border-2 border-orange-400 dark:border-orange-600 bg-orange-50/70 dark:bg-orange-950/30'
    }
    return 'border-2 border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/50'
}
