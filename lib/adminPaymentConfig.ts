import { normalizeToServiceCityCode, type ServiceCityCode } from '@/lib/deliveryLocation'

/**
 * Numéros admin Mayombe Market pour les paiements Mobile Money / Airtel (affichage client).
 * Clés = ville de **traitement** = ville du **vendeur** (pas celle de l’acheteur).
 *
 * Remplacer les placeholders `XXX` pour Pointe-Noire une fois les numéros définitifs connus.
 */
export const ADMIN_PAYMENT_NUMBERS: Record<
    ServiceCityCode,
    { mobile_money: string; airtel_money: string }
> = {
    brazzaville: {
        mobile_money: '06 495 62 79',
        airtel_money: '05 559 93 53',
    },
    'pointe-noire': {
        mobile_money: '06 495 62 79',
        airtel_money: '05 559 93 53',
    },
}

/**
 * Numéro à afficher pour un mode de paiement donné, selon la ville du vendeur.
 * Si la ville n’est pas reconnue (ou vide) → Brazzaville par défaut.
 */
export function getAdminPaymentNumber(
    sellerCity: string | null | undefined,
    method: 'mobile_money' | 'airtel_money',
): string {
    const normalized = normalizeToServiceCityCode(sellerCity)
    const city: ServiceCityCode = normalized ?? 'brazzaville'
    const row = ADMIN_PAYMENT_NUMBERS[city] ?? ADMIN_PAYMENT_NUMBERS.brazzaville
    return row[method]
}

/**
 * Panier multi-vendeurs : si les vendeurs n’ont pas tous la même ville « service »,
 * on ne peut pas afficher un seul numéro pertinent → `ambiguous` et fallback Brazzaville côté numéro.
 */
export function getSellerCityForPayment(
    sellerIds: string[],
    sellerCities: Record<string, string | null>,
): { sellerCity: string | null; ambiguous: boolean } {
    if (sellerIds.length === 0) return { sellerCity: null, ambiguous: false }

    const citiesRaw = sellerIds
        .map((id) => sellerCities[id] ?? null)
        .filter((c): c is string => Boolean(c?.trim()))

    if (citiesRaw.length === 0) return { sellerCity: null, ambiguous: false }

    const canonSet = new Set(
        citiesRaw
            .map((c) => normalizeToServiceCityCode(c))
            .filter((c): c is ServiceCityCode => c != null),
    )

    if (canonSet.size > 1) {
        return { sellerCity: null, ambiguous: true }
    }

    return { sellerCity: citiesRaw[0], ambiguous: false }
}
