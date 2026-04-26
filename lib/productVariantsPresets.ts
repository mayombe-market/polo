/** Couleurs : nom stocké en base + hex pour affichage swatch uniquement côté client. */
export const PRODUCT_VARIANT_COLORS = [
    { name: 'Noir', hex: '#171717' },
    { name: 'Blanc', hex: '#FFFFFF' },
    { name: 'Rouge', hex: '#EF4444' },
    { name: 'Bleu', hex: '#3B82F6' },
    { name: 'Vert', hex: '#22C55E' },
    { name: 'Jaune', hex: '#EAB308' },
    { name: 'Rose', hex: '#EC4899' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Gris', hex: '#6B7280' },
    { name: 'Marron', hex: '#92400E' },
    { name: 'Beige', hex: '#D2B48C' },
] as const

export type VariantColorName = (typeof PRODUCT_VARIANT_COLORS)[number]['name']

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const
export const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as const
/** Tailles bagues françaises (tour de doigt en mm) */
export const RING_SIZES = ['48', '50', '52', '54', '56', '58', '60', '62'] as const

export type SizeKind = 'none' | 'clothing' | 'shoes' | 'ring'

export function getVariantColorHex(name: string): string | undefined {
    const c = PRODUCT_VARIANT_COLORS.find((x) => x.name === name)
    return c?.hex
}
