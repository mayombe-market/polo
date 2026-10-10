# Checklist de tests manuels — Mayombe Market

## Mission 1 — Recentrage marketplace

- [ ] `/patisserie` → redirige vers `/marketplace` (feature flag off)
- [ ] `/restaurant` → redirige vers `/marketplace` (feature flag off)
- [ ] BottomNav n'affiche plus les icônes Pâtisserie/Restaurant/Immobilier
- [ ] Landing page ne montre pas les carousels pâtisserie/restaurant
- [ ] `/marketplace` s'affiche normalement sans erreur

## Mission 4 — Notifications vendeur (nouvelles commandes)

- [ ] Passer une commande Cash → le vendeur reçoit une notification in-app dans son dashboard
- [ ] Passer une commande Airtel Money → vendeur reçoit notification in-app
- [ ] Passer une commande MTN MoMo → vendeur reçoit notification in-app (pas de push, juste in-app)
- [ ] Ouvrir un litige sur une commande → le vendeur concerné reçoit une notification in-app "⚠️ Litige ouvert"
- [ ] Si le vendeur n'a pas de seller_id sur la commande → aucune erreur levée

## Mission 5 — Correction flux WhatsApp

- [ ] Bouton "Contacter sur WhatsApp" sur une fiche produit → sélection ville/quartier → ouverture WhatsApp avec message pré-rempli
- [ ] Aucune commande créée en base lors du clic WhatsApp
- [ ] Aucun stock décrémenté lors du clic WhatsApp
- [ ] Message WhatsApp contient le nom du produit, le prix et la localisation
- [ ] Si l'utilisateur n'est pas connecté → modale d'auth s'ouvre

## Mission 6 — Suspension vendeurs

- [ ] Admin `/admin/vendors` → badge "Suspendu" visible sur les vendeurs suspendus
- [ ] Bouton "Suspendre" (icône Ban) → ouvre modale → motif obligatoire → confirmer → badge apparaît
- [ ] Vendeur suspendu : ses produits n'apparaissent plus sur `/marketplace`
- [ ] Vendeur suspendu : ses produits n'apparaissent plus dans les résultats de recherche
- [ ] Vendeur suspendu : ses produits n'apparaissent plus dans les catégories
- [ ] Bouton "Réactiver" (icône RotateCcw) → confirmation → badge disparaît → produits réapparaissent
- [ ] Suspendre sans motif → message d'erreur "Le motif est obligatoire"

> ⚠️ Prérequis : appliquer `supabase-migration-vendor-suspension.sql` avant de tester Mission 6

## Mission 7 — Monétisation suspendue

- [ ] `/tarification` → page "Abonnements temporairement suspendus" (feature flag subscriptions = false)
- [ ] Dashboard vendeur → aucun CTA d'upgrade visible (subscriptions off)
- [ ] Dashboard vendeur → aucun bandeau de limite de produits visible (subscriptions off)
- [ ] Passage d'une commande → commission = 0 calculée (commissions off)

## Mission 9 — Routes MTN MoMo désactivées

- [ ] `POST /api/mtn-momo/pay` → réponse 410 Gone
- [ ] `GET /api/mtn-momo/status` → réponse 410 Gone
- [ ] `POST /api/mtn-momo/pay-ad` → fonctionne normalement (non touché)
- [ ] `GET /api/mtn-momo/status-ad` → fonctionne normalement (non touché)
- [ ] Le tunnel de paiement manuel MTN MoMo au checkout fonctionne (saisie transaction ID 10 chiffres)

## Tests de non-régression

- [ ] Checkout complet (Cash) → commande créée, email de confirmation envoyé
- [ ] Checkout complet (MTN MoMo manuel) → commande créée avec transaction_id, statut "pending"
- [ ] Page d'une fiche produit → chargement normal, images, prix
- [ ] Recherche produits → résultats sans erreur
- [ ] Dashboard vendeur → chargement normal sans erreurs console
- [ ] Dashboard admin → liste des commandes accessible
- [ ] Auth (inscription + connexion) → fonctionnel

## SQL migrations à appliquer en production (validation admin)

1. `supabase-migration-vendor-suspension.sql` — colonnes `is_suspended`, `suspended_at`, `suspension_reason` sur `profiles`
