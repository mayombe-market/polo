/**
 * Villes et quartiers pour livraison / profil (aligné checkout).
 */
export const DELIVERY_LOCATIONS: Record<string, string[]> = {
    Brazzaville: [
        'Bacongo',
        'Centre-ville',
        'Chine',
        'CHL',
        'Djiri',
        'Kintélé',
        'Kombé',
        'Madibou',
        'Makélékélé',
        'Masina',
        'Mfilou',
        'Moungali',
        'Mpissa',
        'Ngangouoni',
        'Ouenzé',
        'Plateau des 15 ans',
        'Poto-Poto',
        'Rex',
        'Talangaï',
    ],
    'Pointe-Noire': [
        'Loandjili',
        'Lumumba',
        'Mboungou-Mboukou',
        'Mongo-Mpoukou',
        'Mpaka',
        'Mvou-Mvou',
        'Ngoyo',
        'Nkouikou',
        'Ntombo',
        'Pointe-Noire Centre',
        'Tchibamba',
        'Thystère-Tchicaya',
        'Tié-Tié',
        'Vindoulou',
        'Von-Von',
    ],
}

export const DELIVERY_CITY_LIST = Object.keys(DELIVERY_LOCATIONS) as string[]
