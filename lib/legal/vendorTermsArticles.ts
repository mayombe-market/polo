import type { LegalArticle } from '@/lib/legal/types'

/** Conditions contractuelles vendeur à l’inscription (signature par case à cocher). */
export const VENDOR_TERMS_ARTICLES: LegalArticle[] = [
    {
        number: '01',
        title: 'Engagement commercial',
        color: '#2563eb',
        content:
            'En ouvrant une boutique sur Mayombe Market, vous vous engagez à proposer des produits conformes à la loi, décrits avec honnêteté, et à assumer la relation commerciale avec les acheteurs dans le cadre de la plateforme.',
    },
    {
        number: '02',
        title: 'Catalogue et prix',
        color: '#4f46e5',
        items: [
            'Photos et descriptions fidèles au produit livré.',
            'Prix clairs, sans frais cachés ; stocks mis à jour.',
            'Respect des catégories et des règles de publication définies par Mayombe Market.',
        ],
    },
    {
        number: '03',
        title: 'Commandes et expédition',
        color: '#7c3aed',
        items: [
            'Préparation et remise aux livreurs ou au mode convenu dans les délais annoncés.',
            'Communication proactive en cas de retard ou d’indisponibilité.',
            'Interdiction de vendre des produits interdits ou contrefaits.',
        ],
    },
    {
        number: '04',
        title: 'Commissions et facturation',
        color: '#6366f1',
        items: [
            'Vous acceptez le principe de commission ou de frais de service tels qu’affichés sur la plateforme.',
            'Toute évolution tarifaire peut être notifiée conformément aux CGU générales.',
        ],
    },
    {
        number: '05',
        title: 'Sanctions',
        color: '#dc2626',
        items: [
            'Mayombe Market peut suspendre ou clôturer un compte vendeur en cas de manquement grave ou répété.',
            'Les litiges peuvent faire l’objet d’une médiation interne avant toute action judiciaire.',
        ],
    },
]
