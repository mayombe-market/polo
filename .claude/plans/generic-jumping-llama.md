# Plan : Logisticien + Notation Triple

## Contexte
Mayombe Market a un flux de commande incomplet : le vendeur marque "expédié" et "livré" lui-même, sans vérification. Il faut ajouter un **4ème rôle (logisticien)** qui ferme la chaîne de confiance (récupère chez le vendeur → livre au client), et un **système de notation triple** post-livraison (vendeur / livraison / plateforme) avec points de fidélité.

### Nouveau flux de commande
```
pending → confirmed → shipped → picked_up → delivered → client_confirmed
          (admin)     (vendeur)  (logisticien) (logisticien) (client)
```
- `shipped` = vendeur a préparé, prêt pour le logisticien
- `picked_up` = logisticien a récupéré chez le vendeur (nouveau)
- `delivered` = logisticien a livré au client (maintenant c'est le logisticien, plus le vendeur)
- Après `delivered` : le client confirme réception → notation → points fidélité
- Auto-confirmation après 24h si pas de réponse client

---

## Étape 1 : SQL — Migrations Supabase

Exécuter dans Supabase SQL Editor :

**Nouvelles colonnes sur `orders` :**
- `logistician_id` (uuid, FK profiles) — logisticien assigné
- `picked_up_at` (timestamptz) — quand le logisticien a récupéré
- `client_confirmed` (boolean, default false)
- `client_confirmed_at` (timestamptz)

**Nouvelle table `ratings` :**
- `id` uuid PK
- `order_id` uuid FK orders (unique)
- `user_id` uuid FK profiles
- `vendor_rating` int (1-5, nullable)
- `vendor_tags` text[] (tags sélectionnés)
- `delivery_rating` int (1-5, nullable)
- `delivery_tags` text[]
- `platform_rating` int (1-5, nullable)
- `platform_tags` text[]
- `comment` text
- `created_at` timestamptz

**Nouvelle colonne sur `profiles` :**
- `loyalty_points` int default 0

**Nouvelle colonne sur `orders` (gains logisticien) :**
- `delivery_fee` int default 0 — frais livraison payés par le client (express = 1000F, standard = 0)
- Le logisticien gagne : 500F (base fixe) + delivery_fee par course

**RLS policies :**
- `ratings` : insert/select pour le user propriétaire, select pour admin
- `orders` : le logisticien peut lire les orders qui lui sont assignés, update picked_up/delivered
- `profiles` : logistician peut lire les infos client/vendeur de ses commandes

---

## Étape 2 : Server actions livraisons
**Fichier** : `app/actions/deliveries.ts` (nouveau)

Pattern identique à `orders.ts` (getSupabase, auth check) :
- `getLogisticianDeliveries()` — commandes assignées au logisticien connecté
- `markPickedUp(orderId)` — logisticien confirme récupération (shipped → picked_up)
- `markDelivered(orderId)` — logisticien confirme livraison (picked_up → delivered)
- `assignLogistician(orderId, logisticianId)` — admin assigne un logisticien
- `getAvailableLogisticians()` — admin récupère la liste des logisticiens

---

## Étape 3 : Server actions notations
**Fichier** : `app/actions/ratings.ts` (nouveau)

- `confirmReception(orderId)` — client confirme réception (set client_confirmed + timestamp)
- `reportNotReceived(orderId)` — client signale non-réception (pour plus tard, juste flag)
- `submitRating({ orderId, vendorRating, vendorTags, deliveryRating, deliveryTags, platformRating, platformTags, comment })` — enregistre notation + ajoute 500 points fidélité
- `getOrderRating(orderId)` — récupère la notation existante
- `getLoyaltyPoints()` — points fidélité du client

---

## Étape 4 : Emails livraison
**Fichier** : `app/actions/emails.ts` (modifier)

Ajouter 2 fonctions avec le même template HTML existant :
- `sendPickupNotificationEmail(clientEmail, clientName, productName, logisticianName)` — "Votre colis a été récupéré, il est en route vers vous !"
- `sendDeliveryConfirmationRequestEmail(clientEmail, clientName, orderId, productName)` — "Votre colis est arrivé ! Confirmez la réception et notez votre expérience."

---

## Étape 5 : Son de notification livraison
**Fichier** : `lib/notificationSound.ts` (modifier)

Ajouter `playDeliverySound()` — son distinct pour le logisticien (par ex. double bip grave).

---

## Étape 6 : Middleware — route logisticien
**Fichier** : `middleware.ts` (modifier)

Ajouter bloc de protection pour `/logistician` :
- Requiert auth + `profile.role === 'logistician'` OR `'admin'`
- Même pattern que le bloc `/vendor`

---

## Étape 7 : Dashboard logisticien (la pièce principale)

### Fichiers à créer :
- `app/(logistician)/logistician/dashboard/page.tsx` — page serveur (fetch user + profile)
- `app/(logistician)/layout.tsx` — layout minimal
- `app/components/LogisticianDashboardClient.tsx` — composant client (mobile-first)

### LogisticianDashboardClient :
Adapter le prototype fourni par l'utilisateur vers du vrai code :
- **Header** : "Mes livraisons 🏍️" + nom du livreur + date
- **Stats** : courses en cours / terminées / gains du jour
- **Onglets** : En cours / Terminées
- **Cards de livraison** : produit, vendeur→client, quartier, badge EXPRESS, montant
- **Vue détail** avec 2 étapes :
  - Étape 1 : Récupérer chez vendeur (adresse, tel, bouton appeler, gros bouton bleu "Récupéré")
  - Étape 2 : Livrer au client (adresse, tel, bouton appeler, gros bouton vert "Livré")
- **Modales de confirmation** avant chaque action
- **Toasts** après chaque action
- **Realtime** : écouter les orders assignés au logisticien (nouvelles assignations + updates)
- **Son** : playDeliverySound() sur nouvelle assignation
- Utiliser les server actions de `deliveries.ts`
- Style : dark theme cohérent, Tailwind CSS, mobile-first

---

## Étape 8 : Admin — assignation logisticien + gestion livreurs
**Fichier** : `app/admin/orders/page.tsx` (modifier)

- Sur les commandes `confirmed` ou `shipped` : ajouter un dropdown "Assigner un livreur"
- Le dropdown liste les profils avec `role = 'logistician'` (via `getAvailableLogisticians()`)
- Quand admin sélectionne → appel `assignLogistician(orderId, logisticianId)`
- Afficher le nom du logisticien assigné sur la carte
- Ajouter les nouveaux statuts dans `getStatusDetails` : `picked_up` → "Récupéré" (violet)
- Ajouter filtre "Récupérées" dans les filtres admin

**Fichier** : `app/admin/logisticians/page.tsx` (nouveau)
- Interface admin dédiée pour gérer les logisticiens
- Liste des logisticiens existants (nom, tel, statut actif/inactif, nb courses)
- Formulaire pour ajouter un logisticien (rechercher un utilisateur existant → changer son rôle en 'logistician')
- Possibilité de désactiver un logisticien

---

## Étape 9 : Modifier le flux vendeur
**Fichiers** : `app/actions/orders.ts` + `app/(vendor)/vendor/orders/` (OrdersListClient) + `app/components/DashboardClient.tsx`

- `updateOrderStatus` : le vendeur ne peut plus marquer "delivered", seulement "shipped" (prêt pour le logisticien)
- Le vendeur voit "En attente du livreur" après avoir marqué "shipped"
- Ajouter `picked_up` et statuts logisticien dans les labels du dashboard vendeur
- Le vendeur voit le nom du logisticien assigné

---

## Étape 10 : Confirmation réception client + Notation triple
**Fichiers** :
- `app/components/TripleRatingModal.tsx` (nouveau) — le composant modal de notation
- `app/components/BuyerDashboardClient.tsx` (modifier) — intégration

### TripleRatingModal :
Adapter le prototype `ClientRatingSystem` vers un vrai composant :
- **Étape 1** : Confirmation réception (Oui / Non + auto-confirm 24h)
- **Étape 2** : Notation vendeur 🏪 — étoiles (réutiliser StarRating.tsx existant avec `editable`) + tags cliquables
- **Étape 3** : Notation livraison 🏍️ — étoiles + tags
- **Étape 4** : Notation plateforme 📱 — étoiles + tags
- **Dernière étape** : champ commentaire optionnel
- **Écran merci** : résumé des notes + "+500 points de fidélité !"
- Barre de progression entre les étapes
- Bouton "Passer cette étape" pour skipper
- Appelle `confirmReception()` puis `submitRating()` via server actions
- Style Tailwind, dark theme, animations

### BuyerDashboardClient :
- Détecter les commandes avec `status = 'delivered'` et `client_confirmed = false` → afficher badge/alerte
- Quand le client clique "Confirmer réception" → ouvrir TripleRatingModal
- Ajouter `picked_up` dans le tracking visuel (timeline des commandes)
- Realtime : écouter les updates de ses commandes (picked_up, delivered) → toast + son
- Afficher les points de fidélité dans le dashboard (accueil)

---

## Étape 11 : Build & test
- `npm run build` — zéro erreur
- Tester le flux complet :
  1. Client commande → Admin confirme → Vendeur expédie
  2. Admin assigne logisticien → Logisticien voit la course
  3. Logisticien récupère → Client notifié "en route"
  4. Logisticien livre → Client notifié "confirmez réception"
  5. Client confirme → Notation triple → +500 points
  6. Admin libère les fonds après 48h

---

## Fichiers créés (7)
1. `app/actions/deliveries.ts`
2. `app/actions/ratings.ts`
3. `app/(logistician)/logistician/dashboard/page.tsx`
4. `app/(logistician)/layout.tsx`
5. `app/components/LogisticianDashboardClient.tsx`
6. `app/components/TripleRatingModal.tsx`
7. `app/admin/logisticians/page.tsx`

## Fichiers modifiés (6)
1. `middleware.ts` — route logisticien
2. `app/actions/emails.ts` — 2 emails livraison
3. `lib/notificationSound.ts` — son livraison
4. `app/admin/orders/page.tsx` — assignation logisticien + nouveaux statuts
5. `app/actions/orders.ts` — limiter vendeur à "shipped", ajouter "picked_up" valide
6. `app/components/BuyerDashboardClient.tsx` — confirmation réception + notation + points fidélité

## Composants réutilisés
- `StarRating.tsx` (existant, avec `editable + onChange`) dans TripleRatingModal
- Pattern `getSupabase()` de `orders.ts` dans les nouveaux server actions
- Template email HTML de `emails.ts`
- Sons Web Audio API de `notificationSound.ts`
