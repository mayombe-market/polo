import type { LegalArticle } from '@/lib/legal/types'

/**
 * Conditions spécifiques à l\u2019acheteur — acceptées à l\u2019inscription (complete-profile).
 * Complètent les CGU générales.
 */
export const CLIENT_TERMS_ARTICLES: LegalArticle[] = [
    {
        number: '01',
        title: 'Rôle et responsabilité de l\u2019acheteur',
        color: '#059669',
        content:
            'En tant qu\u2019acheteur sur Mayombe Market, vous utilisez la plateforme pour découvrir des produits, passer des commandes et interagir avec les vendeurs. Vous vous engagez à respecter les présentes conditions ainsi que les CGU générales de la Marketplace.',
        items: [
            'Vous déclarez être une personne physique majeure (18 ans minimum) ou agir avec l\u2019autorisation d\u2019un représentant légal.',
            'Vous êtes seul responsable des informations que vous fournissez lors de la création de votre compte et de vos commandes.',
        ],
    },
    {
        number: '02',
        title: 'Commandes',
        color: '#0D9488',
        items: [
            'Toute commande validée sur la Marketplace constitue un engagement ferme d\u2019achat aux conditions indiquées (prix, quantité, mode de livraison).',
            'Vous vous engagez à fournir des informations de livraison exactes et complètes (nom, téléphone, ville, quartier, point de repère).',
            'En cas d\u2019erreur ou d\u2019indisponibilité du produit après commande, Mayombe Market ou le vendeur peut annuler la commande et vous en informer.',
        ],
    },
    {
        number: '03',
        title: 'Paiement',
        color: '#10B981',
        items: [
            'Le paiement est dû au moment de la confirmation de commande, via les moyens de paiement proposés (MTN Mobile Money, Airtel Money ou tout autre moyen mis à disposition).',
            'Vous devez fournir un identifiant de transaction valide permettant la vérification du paiement par l\u2019administration de Mayombe Market.',
            'En cas de paiement invalide, incomplet ou frauduleux, la commande pourra être annulée sans préjudice des poursuites éventuelles.',
        ],
    },
    {
        number: '04',
        title: 'Livraison et réception',
        color: '#047857',
        items: [
            'Les délais de livraison sont indicatifs et dépendent de la ville de livraison, du mode choisi (standard ou express) et de la disponibilité des livreurs.',
            'Vous devez vérifier la conformité de votre commande à la réception. Toute réclamation doit être signalée dans les meilleurs délais via la Marketplace.',
            'La confirmation de réception sur votre espace acheteur déclenche le processus de libération des fonds au vendeur.',
        ],
    },
    {
        number: '05',
        title: 'Réclamations et litiges',
        color: '#0EA5E9',
        items: [
            'Les réclamations doivent être formulées de bonne foi, accompagnées d\u2019éléments de preuve utiles (photos, description du problème).',
            'Mayombe Market s\u2019engage à faciliter la résolution des litiges entre acheteurs et vendeurs dans un esprit d\u2019équité.',
            'Un comportement abusif, frauduleux ou des réclamations répétées de mauvaise foi peuvent entraîner la suspension ou la suppression de votre compte.',
        ],
    },
    {
        number: '06',
        title: 'Programme de fidélité',
        color: '#D97706',
        items: [
            'Vous pouvez bénéficier d\u2019un programme de fidélité vous permettant de cumuler des points en FCFA sur vos achats, sous réserve de son activation.',
            'Les points sont soumis à un seuil minimum d\u2019utilisation, une durée de validité et des conditions définies dans les règles du programme.',
            'Les points ne sont pas convertibles en espèces et ne sont pas transférables à un autre utilisateur.',
        ],
    },
    {
        number: '07',
        title: 'Données personnelles et communication',
        color: '#6366F1',
        items: [
            'Vous acceptez d\u2019être contacté par Mayombe Market ou les livreurs pour le suivi de vos commandes (appels, SMS, notifications in-app).',
            'Vous ne devez pas détourner les coordonnées des vendeurs ou livreurs pour contourner la Marketplace ou effectuer des transactions hors plateforme.',
            'Vos données personnelles sont traitées conformément à la Politique de Confidentialité de Mayombe Market.',
        ],
    },
    {
        number: '08',
        title: 'Contenu et avis',
        color: '#8B5CF6',
        items: [
            'Vous pouvez laisser des avis et évaluations sur les produits achetés. Ces avis doivent être honnêtes, respectueux et fondés sur votre expérience réelle.',
            'Les avis diffamatoires, injurieux, frauduleux ou sans rapport avec le produit pourront être supprimés sans préavis.',
            'En publiant un avis, vous accordez à Mayombe Market le droit de l\u2019afficher publiquement sur la Marketplace.',
        ],
    },
]
