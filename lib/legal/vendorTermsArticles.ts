import type { LegalArticle } from '@/lib/legal/types'

/**
 * Conditions contractuelles vendeur — acceptées à l\u2019inscription (complete-profile).
 * Complètent les CGU générales. Signature électronique par case à cocher.
 */
export const VENDOR_TERMS_ARTICLES: LegalArticle[] = [
    {
        number: '01',
        title: 'Engagement commercial',
        color: '#2563EB',
        content:
            'En ouvrant une boutique sur Mayombe Market, vous vous engagez à proposer des produits conformes à la loi congolaise, décrits avec honnêteté, et à assumer la relation commerciale avec les acheteurs dans le cadre de la Marketplace.',
        items: [
            'Vous déclarez être majeur (18 ans minimum) et disposer de la capacité juridique pour exercer une activité commerciale en République du Congo.',
            'Vous êtes seul responsable de la légalité, la qualité et la conformité des produits que vous proposez à la vente.',
        ],
    },
    {
        number: '02',
        title: 'Identité et vérification',
        color: '#1D4ED8',
        items: [
            'Vous vous engagez à fournir des informations d\u2019identité exactes et à jour (nom, prénom, numéro de téléphone, ville, nom de boutique).',
            'Mayombe Market peut vous demander à tout moment des documents justificatifs (pièce d\u2019identité, registre de commerce, etc.) à des fins de vérification.',
            'Le défaut de fourniture des documents demandés peut entraîner la suspension de votre boutique.',
        ],
    },
    {
        number: '03',
        title: 'Catalogue, descriptions et prix',
        color: '#4F46E5',
        items: [
            'Vos photos doivent être claires, réelles et fidèles au produit livré. Les images trompeuses ou volées sont strictement interdites.',
            'Les descriptions doivent être honnêtes, détaillées et conformes au produit réel.',
            'Les prix doivent être clairs, incluant toutes taxes applicables, sans frais cachés.',
            'Vous devez maintenir vos stocks à jour. La vente de produits indisponibles est interdite.',
            'Vous devez respecter les catégories et les règles de publication définies par Mayombe Market.',
        ],
    },
    {
        number: '04',
        title: 'Produits interdits',
        color: '#DC2626',
        intro: 'Il est strictement interdit de vendre sur Mayombe Market :',
        items: [
            'Des produits contrefaits ou portant atteinte aux droits de propriété intellectuelle de tiers.',
            'Des produits dangereux, périmés, défectueux ou non conformes aux normes de sécurité.',
            'Des substances illicites, médicaments non autorisés, armes ou munitions.',
            'Tout produit dont la vente est interdite par la législation de la République du Congo.',
            'Tout service ou produit à caractère frauduleux, trompeur ou illégal.',
        ],
    },
    {
        number: '05',
        title: 'Commandes et expédition',
        color: '#7C3AED',
        items: [
            'Vous vous engagez à préparer les commandes dans les délais annoncés (24 à 48 heures maximum sauf indication contraire).',
            'Vous devez remettre les produits aux livreurs ou assurer la livraison selon le mode convenu avec l\u2019acheteur.',
            'Vous êtes responsable de l\u2019emballage adéquat des produits pour éviter tout dommage pendant le transport.',
            'En cas de retard ou d\u2019indisponibilité, vous devez en informer proactivement l\u2019acheteur et Mayombe Market.',
            'L\u2019annulation répétée de commandes confirmées peut entraîner des sanctions sur votre compte.',
        ],
    },
    {
        number: '06',
        title: 'Commissions, frais de service et paiements',
        color: '#6366F1',
        items: [
            'Vous acceptez le principe de commission prélevée par Mayombe Market sur chaque vente réalisée, dont le taux dépend de votre plan d\u2019abonnement.',
            'Les taux de commission en vigueur sont affichés sur la page de tarification de la Marketplace et peuvent être modifiés avec un préavis raisonnable.',
            'Les fonds issus des ventes sont libérés après confirmation de la livraison et passage du délai de sécurité (système de double verrou).',
            'Mayombe Market peut proposer des plans d\u2019abonnement offrant des avantages (commission réduite, visibilité accrue). Les conditions de chaque plan sont détaillées lors de la souscription.',
        ],
    },
    {
        number: '07',
        title: 'Campagnes publicitaires vendeur',
        color: '#0EA5E9',
        items: [
            'Vous pouvez soumettre des campagnes publicitaires (bannières Hero, tuiles) pour promouvoir vos produits ou votre boutique sur la Marketplace.',
            'Les campagnes sont soumises à validation par l\u2019administration de Mayombe Market et doivent respecter les règles de contenu définies dans les CGU.',
            'Le paiement des campagnes est dû avant activation. Les tarifs sont affichés sur la page dédiée.',
            'Mayombe Market se réserve le droit de refuser ou retirer une campagne non conforme.',
        ],
    },
    {
        number: '08',
        title: 'Responsabilité du vendeur',
        color: '#EA580C',
        items: [
            'Vous êtes pleinement responsable de vos produits, de leur conformité, de leur livraison et du service après-vente.',
            'Vous êtes responsable du traitement des données personnelles des acheteurs que vous obtenez via la Marketplace, conformément aux lois en vigueur.',
            'Mayombe Market ne peut être tenu responsable des litiges entre vendeurs et acheteurs résultant de la qualité, la conformité ou la livraison des produits.',
        ],
    },
    {
        number: '09',
        title: 'Propriété intellectuelle',
        color: '#BE185D',
        items: [
            'Vous garantissez que les contenus que vous publiez (photos, descriptions, logos) ne portent pas atteinte aux droits de propriété intellectuelle de tiers.',
            'Vous accordez à Mayombe Market une licence d\u2019utilisation de vos contenus à des fins de promotion et de fonctionnement de la Marketplace.',
            'En cas de réclamation d\u2019un tiers concernant vos contenus, vous vous engagez à indemniser Mayombe Market de tout dommage.',
        ],
    },
    {
        number: '10',
        title: 'Sanctions et résiliation',
        color: '#DC2626',
        items: [
            'Mayombe Market peut suspendre temporairement ou définitivement votre boutique en cas de manquement grave ou répété aux présentes conditions.',
            'Les motifs de suspension incluent : produits contrefaits, non-livraison répétée, fraude, abus, réclamations massives, non-respect des règles de la Marketplace.',
            'En cas de suspension, les fonds en cours de libération pourront être bloqués le temps de la résolution du litige.',
            'Les litiges peuvent faire l\u2019objet d\u2019une médiation interne avant toute action judiciaire.',
            'Vous pouvez fermer votre boutique à tout moment en nous contactant, sous réserve d\u2019honorer toutes les commandes en cours.',
        ],
    },
    {
        number: '11',
        title: 'Adhésion aux valeurs de Mayombe Market',
        color: '#059669',
        items: [
            'Honnêteté et transparence dans chaque transaction.',
            'Respect et courtoisie envers les acheteurs et les équipes de Mayombe Market.',
            'Professionnalisme et engagement envers la qualité du service.',
            'Soutien au développement économique local et à l\u2019entrepreneuriat congolais.',
        ],
    },
]
