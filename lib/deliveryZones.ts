/**
 * Villes et quartiers pour livraison / profil (aligné checkout).
 */
export const DELIVERY_LOCATIONS: Record<string, string[]> = {
    Brazzaville: ['Talangaï', 'Bacongo', 'Mfilou', 'Moungali', 'Ouenzé', 'Poto-Poto', 'Kintélé'],
    'Pointe-Noire': ['Loandjili', 'Lumumba', 'Von-Von', 'Thystère', 'Vindoulou', 'Tié-Tié'],
}

export const DELIVERY_CITY_LIST = Object.keys(DELIVERY_LOCATIONS) as string[]
