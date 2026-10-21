# AGENTS.md — Règles anti-régression Mayombe Market

Ce fichier est lu par les agents IA (Claude Code, etc.) avant toute modification du code.
Il documente les règles architecturales et les pièges à éviter.

---

## Règles absolues (ne jamais enfreindre)

| Règle | Raison |
|-------|--------|
| Ne pas modifier Supabase Production sans autorisation explicite | Risque de casser les commandes existantes et les politiques RLS |
| Ne pas déployer en production sans autorisation | Pipeline : `main` → Vercel auto-deploy |
| Ne pas supprimer de données (tables, lignes, colonnes) | Préserver l'historique des commandes |
| Ne pas contourner les politiques RLS | Sécurité des données acheteurs/vendeurs |
| Ne pas pousser directement sur `main` | Utiliser une branche feature + PR |
| Ne pas créer de système parallèle | Réutiliser les tables, composants et actions existants |
| Ne pas changer de framework | Next.js App Router + Supabase |
| Ne pas construire de nouvelles fonctionnalités | Audit et corrections uniquement |
| Ne pas supprimer un fichier sans vérifier ses imports réels | `grep -rn "import.*NomFichier"` avant toute suppression |

---

## Architecture des paiements

### Ce qui est ACTIF en production
- **MTN MoMo manuel** : acheteur paie le vendeur → entre son ID de transaction → **le vendeur** clique « Paiement reçu » ou « Paiement non reçu » (`vendorConfirmPayment` → `lib/orderNotifyServer.ts`)
  - Reçu (tous les vendeurs du panier) → `confirmed` + numéro de suivi + `confirmed_at`
  - Non reçu (un seul vendeur suffit) → `rejected` + stock restauré + `vendor_disputed_at`
  - L'admin **observe** (chronologie dans /admin/orders) ; ses boutons confirmer/rejeter restent en secours, repliés
- **Airtel Money manuel** : même flux que MTN manuel
- **Paiement à la livraison (COD)** : flag `FEATURES.cashOnDelivery = true`
- **MTN MoMo pour campagnes pub vendeurs** : `/api/mtn-momo/pay-ad` → `/api/mtn-momo/callback-ad` (API auto encore active pour ce cas)

### Ce qui est DÉSACTIVÉ (retourne 410)
- `/api/mtn-momo/pay` — ancienne route paiement auto commandes
- `/api/mtn-momo/status` — ancienne vérification statut commandes

> ⚠️ Ne jamais faire appeler `/api/mtn-momo/pay` ou `/api/mtn-momo/status` depuis un composant ou action.
> Ces routes retournent HTTP 410. Le flux actif passe par `EnterTransactionIdStep` → `createOrder` / `createGuestOrder`.

---

## Checkout invité (FEATURES.guestCheckout = true)

Le checkout invité est actif. La migration `supabase-migration-guest-checkout.sql` **doit être appliquée en production** pour que les commandes invitées fonctionnent (`user_id` nullable, colonne `is_guest`, RPC `get_order_by_guest_token`).

- `createGuestOrder` (app/actions/guestOrders.ts) utilise `service_role` pour contourner RLS en écriture
- Le RPC `get_order_by_guest_token` est `SECURITY DEFINER` et ne retourne que les colonnes publiques (pas le téléphone complet, pas le landmark)
- Le checkout invité **ne doit pas exposer les commandes d'autres clients** via des politiques RLS trop permissives

---

## Source de vérité unique par concept

| Concept | Source de vérité |
|---------|-----------------|
| Frais de livraison | `lib/checkoutSchema.ts` → `DELIVERY_FEES` + `DELIVERY_FEE_INTER_URBAN` |
| Numéro de suivi | `lib/generateTrackingNumber.ts` → importé dans `orders.ts` et `api/mtn-momo/callback` |
| Feature flags | `lib/featureFlags.ts` → `FEATURES` |
| Validation téléphone/tx | `lib/phonePaymentValidation.ts` |
| Zones de livraison | `lib/deliveryZones.ts` |
| Tarifs plans abonnement | `lib/planPrices.ts` |
| Config paiement admin | `lib/adminPaymentConfig.ts` |

> ⚠️ `admin_confirm_order` exige un appelant admin (auth.uid()) : ne pas l'appeler côté vendeur, utiliser `applyVendorPaymentDecision`.

> ⚠️ Ne jamais dupliquer ces constantes ou fonctions localement dans un fichier action ou composant.

---

## Commandes vendeur — isolation multi-vendeur

`getVendorOrders()` dans `app/actions/orders.ts` filtre les items par `seller_id === auth.uid()` **côté serveur**.
Le fichier `lib/getVendorOrders.ts` est une ancienne implémentation côté navigateur sans filtrage serveur — **ne pas utiliser**.

---

## SellerSubscription — flux paiement

`FEATURES.subscriptions = false` — les abonnements vendeurs sont désactivés en production.

Quand ils seront réactivés :
- MTN MoMo → routing vers `'transfer'` (flux manuel ID transaction), PAS vers `'phone'` (flux auto désactivé)
- Ne jamais router vers `handleMtnRequest()` qui appelle `/api/mtn-momo/pay` (410)
- Airtel → routing vers `'transfer'` → `'txid'` → `submitTransaction()` → `createSubscriptionOrder()` ✓

---

## Migrations SQL

Les fichiers `supabase-*.sql` à la racine du projet sont des migrations **non trackées par Supabase CLI**.
Avant d'appliquer une migration :
1. Tester sur staging d'abord
2. `supabase-migration-LAUNCH-FINAL.sql` porte la mention explicite "NE PAS APPLIQUER SANS VALIDATION STAGING"
3. Documenter la migration appliquée (date, qui, base cible)

---

## Feature flags désactivés — code mort en production

Les modules suivants sont désactivés (`false`) et leur code ne s'exécute pas :
- `restaurant`, `patisserie`, `hotel`, `immobilier` → pages redirigent, composants inutilisés
- `commissions` → aucune commission calculée
- `subscriptions` → `SellerSubscription` non affiché dans `DashboardClient`
- `googleSignIn` → bouton Google absent de `AuthModal`

Ne pas modifier ces modules sans activer le flag correspondant.

---

## Tests à effectuer après chaque changement critique

| Parcours | Vérification |
|----------|--------------|
| Checkout connecté MTN | Commande créée, tx ID accepté, statut `pending_payment` |
| Checkout connecté COD | Commande créée, statut `pending_cod` |
| Checkout invité MTN | `createGuestOrder` appelé, `is_guest=true`, `guest_token` généré |
| Dashboard vendeur → Mes commandes | Items filtrés au seul vendeur connecté |
| Vendeur → Paiement reçu | `confirm_vendor_payment` puis statut → `confirmed` quand tous les vendeurs ont validé ; email + notif client |
| Vendeur → Paiement non reçu | statut → `rejected`, stock restauré, email + notif client avec contact vendeur |
| Admin → Chronologie | /admin/orders affiche commande, réponses vendeur et heures |
| Admin → Confirmer paiement (secours) | RPC `admin_confirm_order` appelé, statut → `confirmed` |

---

## TypeScript

Toujours vérifier `npx tsc --noEmit` avant de committer.
Le build Vercel échoue sur les erreurs TypeScript.
