/**
 * Aligné sur la validation serveur de createOrder (profiles.city + phone ou whatsapp_number).
 */
export function isBuyerProfileCompleteForOrder(
    row: { city?: string | null; phone?: string | null; whatsapp_number?: string | null } | null | undefined
): boolean {
    if (!row) return false
    const city = row.city?.trim()
    const phone = row.phone?.trim() || row.whatsapp_number?.trim()
    return Boolean(city && phone)
}
