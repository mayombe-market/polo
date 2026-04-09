import type { LegalArticle } from '@/lib/legal/types'

/** Conditions spécifiques à l’acheteur (contrat d’inscription). */
export const CLIENT_TERMS_ARTICLES: LegalArticle[] = [
    {
        number: '01',
        title: 'Rôle d’acheteur',
        color: '#059669',
        content:
            'En tant qu’acheteur sur Mayombe Market, vous utilisez la plateforme pour découvrir des produits, passer des commandes et interagir avec les vendeurs dans le respect des présentes règles et des CGU générales.',
    },
    {
        number: '02',
        title: 'Commandes et paiement',
        color: '#0d9488',
        items: [
            'Vous vous engagez à fournir des informations de livraison exactes et à honorer les modalités de paiement choisies.',
            'Toute commande validée vaut engagement de paiement selon les délais et moyens indiqués sur la plateforme.',
            'Les litiges de paiement sont traités selon la procédure indiquée par Mayombe Market et les vendeurs.',
        ],
    },
    {
        number: '03',
        title: 'Réception et réclamations',
        color: '#10b981',
        items: [
            'Vous vérifiez la conformité des articles à la réception dans les délais communiqués.',
            'Les réclamations doivent être formulées de bonne foi, avec les éléments de preuve utiles (photos, description).',
            'Un comportement abusif ou frauduleux peut entraîner la suspension du compte.',
        ],
    },
    {
        number: '04',
        title: 'Données et communication',
        color: '#047857',
        items: [
            'Vous acceptez d’être contacté pour le suivi de commande dans le cadre du service.',
            'Vous ne devez pas détourner la messagerie ou les coordonnées pour contourner les règles de la marketplace.',
        ],
    },
]
