/** Lien wa.me pour numéros Congo (+242) à partir du profil vendeur. */
export function buildWhatsAppUrl(
    phone: string | null | undefined,
    whatsapp: string | null | undefined,
    message: string,
): string | null {
    const raw = (whatsapp || phone || '').trim()
    if (!raw) return null
    let digits = raw.replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('242')) {
        // ok
    } else if (digits.startsWith('0')) {
        digits = `242${digits.slice(1)}`
    } else if (digits.length <= 9) {
        digits = `242${digits}`
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
