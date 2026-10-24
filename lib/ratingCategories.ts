/** Critères de notation d'une commande (fenêtre de l'espace client et page « Noter ma commande »). */
export const RATING_CATEGORIES = [
    {
        id: 'vendor' as const,
        icon: '🏪',
        title: 'Le vendeur',
        question: 'Comment évaluez-vous le produit et le vendeur ?',
        labels: ['Horrible', 'Mauvais', 'Correct', 'Bien', 'Excellent'],
        tags: ['Produit conforme ✅', 'Bonne qualité', 'Bien emballé', 'Rapide à expédier', 'Produit non conforme ❌', 'Mauvais emballage'],
        color: 'amber',
    },
    {
        id: 'delivery' as const,
        icon: '🏍️',
        title: 'La livraison',
        question: 'Comment s\'est passée la livraison ?',
        labels: ['Horrible', 'Mauvaise', 'Correcte', 'Bonne', 'Excellente'],
        tags: ['Rapide ⚡', 'Livreur poli', 'Colis en bon état', 'A appelé avant', 'En retard', 'Colis abîmé'],
        color: 'blue',
    },
    {
        id: 'platform' as const,
        icon: '📱',
        title: 'L\'application',
        question: 'Comment trouvez-vous notre plateforme ?',
        labels: ['Horrible', 'Mauvaise', 'Correcte', 'Bonne', 'Excellente'],
        tags: ['Facile à utiliser', 'Beau design', 'Paiement simple', 'Bon suivi commande', 'Trop compliqué', 'Bugs'],
        color: 'violet',
    },
]

export type RatingCategoryId = (typeof RATING_CATEGORIES)[number]['id']
