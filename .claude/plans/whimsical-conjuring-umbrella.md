# Stabilité totale de la plateforme

## Contexte
Le site a 4 problèmes de stabilité : pages qui plantent, chargements infinis, pas de mode hors-ligne fiable, et les mises à jour qui peuvent casser le site. L'objectif est un site aussi calme et stable qu'Amazon.

---

## Phase 1 : AuthProvider centralisé (anti chargement infini)

**Problème** : Header.tsx ET CartProvider appellent chacun `safeGetUser()` + `onAuthStateChange` = 2 appels auth parallèles qui se marchent dessus, causant des flashs et boucles.

**Nouveau `hooks/useAuth.tsx`** :
- Un seul `safeGetUser()` + un seul `onAuthStateChange` pour toute l'app
- Expose : `user`, `profile`, `loading`, `isAuthenticated`, `refreshProfile()`
- Timeout de 5s max, jamais d'attente infinie

**Modifier `app/layout.tsx`** : wrapper `<AuthProvider>` autour de `<CartProvider>`

**Modifier `hooks/userCart.tsx`** : supprimer son propre auth check, utiliser `useAuth()`

**Modifier `app/components/Header.tsx`** : supprimer son propre auth check, utiliser `useAuth()`

---

## Phase 2 : Loading.tsx (anti écran blanc)

**Problème** : Aucun `loading.tsx` n'existe → écrans blancs pendant les transitions.

**Nouveau `app/components/LoadingSpinner.tsx`** : composant spinner réutilisable (spinner orange, "Chargement...", centré, dark mode)

Créer des `loading.tsx` pour chaque groupe de routes :
- `app/loading.tsx` — accueil
- `app/(account)/loading.tsx` — espace client
- `app/(vendor)/loading.tsx` — espace vendeur
- `app/(logistician)/loading.tsx` — espace livreur
- `app/admin/loading.tsx` — admin

---

## Phase 3 : Mode hors-ligne amélioré

**Problème** : Le service worker actuel est basique. Quand le réseau coupe, le site affiche juste "Hors ligne" sans vraie page.

**Améliorer `public/sw.js`** :
- Précacher la page d'accueil `/` et les assets critiques (CSS, JS du bundle)
- Ajouter un cache pour les pages déjà visitées (network-first + fallback cache)
- Meilleure gestion du cache versioning (lié au build hash)

**Nouveau `app/components/OfflineBanner.tsx`** :
- Détecte `navigator.onLine` + événements `online`/`offline`
- Affiche un bandeau discret "Vous êtes hors-ligne" quand la connexion coupe
- Disparaît automatiquement quand la connexion revient
- Monté dans `layout.tsx`

---

## Phase 4 : Protection contre les déploiements cassants

**Problème** : Quand une nouvelle version est déployée, les utilisateurs avec l'ancienne version en cache peuvent avoir des erreurs.

**Améliorer `app/components/ServiceWorkerRegister.tsx`** :
- Détecter quand une nouvelle version du SW est disponible (`waiting` event)
- Afficher un bandeau "Nouvelle version disponible — Actualiser"
- L'utilisateur clique → `skipWaiting()` + `location.reload()`
- Pas de rechargement automatique (respecte le flow de l'utilisateur)

**Améliorer `app/error.tsx` et `app/global-error.tsx`** :
- Ajouter détection d'erreur de chunk (ChunkLoadError) = signe d'un déploiement
- Si chunk error → proposer "Actualiser la page" au lieu de "Réessayer"
- Ajouter logging console plus clair

---

## Phase 5 : Anti-boucle middleware

**Problème potentiel** : Le middleware redirige vers `/` si pas d'auth, mais `/` pourrait re-déclencher une vérification.

**Modifier `middleware.ts`** :
- Ajouter un param `?auth=required` sur les redirects pour que la page d'accueil puisse afficher le modal de connexion
- Ne pas re-vérifier auth si on est déjà sur `/`
- Ajouter un header `Cache-Control: no-store` sur les réponses des routes protégées

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `hooks/useAuth.tsx` | **Nouveau** — AuthProvider centralisé |
| `app/components/LoadingSpinner.tsx` | **Nouveau** — Spinner réutilisable |
| `app/components/OfflineBanner.tsx` | **Nouveau** — Bandeau hors-ligne |
| `app/loading.tsx` | **Nouveau** |
| `app/(account)/loading.tsx` | **Nouveau** |
| `app/(vendor)/loading.tsx` | **Nouveau** |
| `app/(logistician)/loading.tsx` | **Nouveau** |
| `app/admin/loading.tsx` | **Nouveau** |
| `app/layout.tsx` | **Modifié** — AuthProvider + OfflineBanner |
| `hooks/userCart.tsx` | **Modifié** — Utilise useAuth() |
| `app/components/Header.tsx` | **Modifié** — Utilise useAuth() |
| `app/components/ServiceWorkerRegister.tsx` | **Modifié** — Détection nouvelle version |
| `public/sw.js` | **Modifié** — Meilleur cache offline |
| `app/error.tsx` | **Modifié** — Détection chunk errors |
| `app/global-error.tsx` | **Modifié** — Détection chunk errors |
| `middleware.ts` | **Modifié** — Anti-boucle + cache headers |

## Vérification
1. Build OK
2. Login/logout → transitions fluides, pas de flash
3. Navigation → loading spinner visible entre les pages
4. Mode avion → bandeau "hors-ligne", site navigable (pages visitées)
5. Déploiement → bandeau "nouvelle version", actualisation propre
6. Erreur → page d'erreur claire avec bouton retry/actualiser
