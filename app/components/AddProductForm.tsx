'use client'

/**
 * Formulaire multi-étapes « Nouveau produit » (vendeur).
 *
 * Stabilité & robustesse (résumé des choix d’implémentation) :
 * - **Verrou d’envoi** (`publishingLockRef`) : empêche deux soumissions simultanées avant que React n’ait peint `loading`.
 * - **Identifiant de run** (`publishRunIdRef` + `ownsPublishUi`) : si des opérations async se chevauchaient, seul le run actif
 *   réinitialise la barre de progression / `loading` dans le `finally` (évite courses sur l’état UI).
 * - **Uploads images** : uniquement `fetch('/api/upload')` (JSON : `image` = data URL `data:image/...;base64,...`) — jamais de SDK Cloudinary ni de secrets côté client ; retries réseau, puis 2e vague si timeout ; compression **et** envoi en **parallèle** (`Promise.all`) pour minimiser le temps d'attente.
 * - **createProduct (Server Action)** : `callCreateProductWithRetries` relance uniquement sur **timeout**, pas sur erreur métier
 *   renvoyée dans `{ error: string }` (évite doublons involontaires).
 * - **Feedback** : libellés d’étape (`publishLabel`) + barre de progression ; entrées fichier désactivées pendant `loading`.
 * - Session / compression / erreurs JWT : logique inchangée fonctionnellement, documentée dans les helpers existants.
 */
import type { Session } from '@supabase/supabase-js'
import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
const AdCampaignModal = lazy(() => import('@/app/components/AdCampaignModal'))
import { revalidateProducts } from '../actions/revalidate'
import { createProduct as serverCreateProduct } from '../actions/orders'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import {
    PRODUCT_VARIANT_COLORS,
    CLOTHING_SIZES,
    SHOE_SIZES,
    RING_SIZES,
    type SizeKind,
} from '@/lib/productVariantsPresets'
import {
    IMMOBILIER_CATEGORY,
    IMMOBILIER_SUBCATEGORIES,
    buildListingExtrasV1,
    subcategoryNeedsSurface,
} from '@/lib/realEstateListing'
import {
    ChevronRight, ChevronLeft, Upload, X, Check, Plus,
    Loader2, Package, Tag, Palette, FileText, Image as ImageIcon
} from 'lucide-react'
import { NETWORK_TIMEOUT_MS } from '@/lib/networkTimeouts'

/** Contexte minimal pour la validation (module-scope = pas de TDZ). */
export type ProductFormValidationContext = {
    name: string
    selectedCategory: string
    selectedSubcategory: string
    price: string
    hasStock: boolean
    stockQuantity: string
    mainImage: File | null
    gallery: (File | null)[]
    isRealEstate: boolean
    rePriceNegotiable: boolean
    rePriceOnRequest: boolean
    reCity: string
    reDistrict: string
    reStreet: string
    reSurfaceValue: string
    reSurfaceUnit: 'm2' | 'ares'
    reRooms: string
    reBedrooms: string
    rePropertyCondition: string
    reLandLegalStatus: string
}

/**
 * Validation par étape — **globale**, chargée avec le module (pas dans le composant).
 */
function validateProductStep(s: number, ctx: ProductFormValidationContext): string | null {
    const {
        name,
        selectedCategory,
        selectedSubcategory,
        price,
        hasStock,
        stockQuantity,
        mainImage,
        gallery,
        isRealEstate,
        rePriceNegotiable,
        rePriceOnRequest,
        reCity,
        reDistrict,
        reSurfaceValue,
        rePropertyCondition,
        reLandLegalStatus,
    } = ctx
    switch (s) {
        case 1:
            if (!name.trim()) return "Le nom du produit est requis."
            if (!selectedCategory) return "Choisissez une catégorie."
            if (!selectedSubcategory) return "Choisissez une sous-catégorie."
            return null
        case 2: {
            if (isRealEstate) {
                if (hasStock) return "Le stock ne s’applique pas aux annonces immobilières — désactivez « Gérer le stock »."
                if (rePriceOnRequest || rePriceNegotiable) {
                    return null
                }
                const p = parseInt(price, 10)
                if (!p || p < 100 || p > 100000000) {
                    return "Indiquez un prix entre 100 et 100 000 000 FCFA, ou cochez « Prix négociable » / « Sur demande »."
                }
                return null
            }
            const p = parseInt(price, 10)
            if (!p || p < 100 || p > 100000000) return "Le prix doit être entre 100 et 100 000 000 FCFA."
            if (hasStock && (!stockQuantity || parseInt(stockQuantity, 10) < 1)) return "La quantité en stock est requise."
            return null
        }
        case 4: {
            if (!isRealEstate) return null
            if (!reCity.trim()) return "Indiquez la ville."
            if (!reDistrict.trim()) return "Indiquez le quartier (ex. Bacongo, Poto-Poto…)."
            if (!rePropertyCondition.trim()) return "Indiquez l’état du bien."
            if (!reLandLegalStatus.trim()) return "Indiquez le statut du terrain / document (titre foncier, arrêté…)."
            if (subcategoryNeedsSurface(selectedSubcategory)) {
                const s = parseFloat(reSurfaceValue.replace(',', '.'))
                if (!Number.isFinite(s) || s <= 0) return "La surface (m² ou ares) est requise pour les Terrains."
            }
            return null
        }
        case 5:
            if (!mainImage) return "L'image principale est obligatoire."
            if (!gallery[0] || !gallery[1] || !gallery[2]) return "3 miniatures minimum sont obligatoires."
            return null
        default:
            return null
    }
}

const mesChoix: Record<string, string[]> = {
    "Mode & Beauté": ["Perruques & Mèches", "Vêtements Femme", "Vêtements Homme", "Chaussures", "Sacs & Pochettes", "Bijoux & Montres", "Cosmétiques & Maquillage", "Parfums"],
    "High-Tech": ["Smartphones & Tablettes", "Ordinateurs & Laptops", "Accessoires Tech", "Audio & Casques", "TV & Écrans", "Consoles & Jeux vidéo"],
    "Pharmacie & Santé": ["Matériel Médical", "Médicaments & Soins", "Compléments alimentaires", "Hygiène & Bien-être"],
    "Électroménager": ["Cuisinières & Fours", "Réfrigérateurs & Congélateurs", "Micro-ondes", "Lave-linge", "Climatiseurs & Ventilateurs", "Petit électroménager"],
    "Maison & Déco": ["Salons & Canapés", "Lits & Matelas", "Meubles", "Décoration", "Salle de bain", "Cuisine & Arts de la table"],
    "Pâtisserie & Traiteur": ["Gâteaux", "Viennoiseries", "Pâtisseries traditionnelles", "Sur commande", "Plats traiteur"],
    "Immobilier": [...IMMOBILIER_SUBCATEGORIES],
    "Alimentation & Boissons": ["Plats du jour", "Plats congolais", "Grillades & Brochettes", "Fast-food & Burgers", "Boissons", "Menus & Formules", "Accompagnements", "Épicerie & Produits locaux"],
    "Auto & Moto": ["Voitures", "Motos & Scooters", "Pièces détachées", "Accessoires auto"],
    "Bébé & Enfants": ["Vêtements enfants", "Jouets", "Poussettes & Accessoires", "Alimentation bébé"],
    "Sport & Loisirs": ["Équipements sportifs", "Vêtements de sport", "Fitness & Musculation", "Camping & Plein air"],
    "Services": ["Coiffure & Esthétique", "Réparation & Dépannage", "Cours & Formation", "Événementiel"],
    "Fournitures & Bureau": ["Papeterie", "Imprimantes & Encre", "Mobilier de bureau", "Fournitures scolaires"],
    "Agriculture & Élevage": ["Semences & Plants", "Engrais & Produits phyto", "Outils agricoles", "Animaux & Bétail"],
    "Matériaux & BTP": ["Ciment & Fer", "Plomberie", "Électricité", "Peinture & Finition", "Outillage"],
    "Bijoux & Montres": ["Bagues & Chevalières", "Colliers & Pendentifs", "Bracelets", "Boucles d'oreilles", "Montres Homme", "Montres Femme"],
    "Jouets & Jeux": ["Jouets 0-3 ans", "Jouets 3-8 ans", "Jeux de société", "Jeux éducatifs", "Jeux d'extérieur", "Déguisements & Accessoires"],
    "Animalerie": ["Chiens", "Chats", "Oiseaux", "Rongeurs & Lapins", "Alimentation animale", "Accessoires animaux"],
    "Livres & Culture": ["Livres scolaires", "Romans & Littérature", "Livres religieux", "BD & Manga", "Instruments de musique", "Loisirs créatifs"],
    "Bricolage & Outillage": ["Outillage électrique", "Outillage à main", "Visserie & Fixations", "Peinture & Lasure", "Mesure & Traçage", "Échelles & Escabeaux"],
    "Bagagerie & Voyage": ["Valises", "Sacs de voyage", "Sacs à dos", "Porte-documents & Sacoches", "Accessoires voyage"],
}

// ─── Configuration par catégorie ─────────────────────────────────────────────
type CatCfg = {
    /** Type de taille pré-sélectionné à l'entrée dans la catégorie */
    sizeKindDefault: SizeKind
    /** Libellés utilisés comme placeholders dans l'étape Détails */
    attrs: string[]
    /** Conseil photo affiché à l'étape Images */
    photoTip: string
    /** Petit badge informatif affiché dans l'étape Infos après sélection */
    badge?: string
}

const CATEGORY_CONFIG: Record<string, CatCfg> = {
    "Mode & Beauté": {
        sizeKindDefault: 'clothing',
        attrs: ['Genre (Femme / Homme / Mixte)', 'Coupe (Regular / Slim / Large)', 'Matière — ex: 100% coton', 'Entretien — ex: Lavage 30°C'],
        photoTip: 'Fond blanc conseillé · vue recto + détail tissu',
        badge: 'Matière & composition obligatoires',
    },
    "High-Tech": {
        sizeKindDefault: 'none',
        attrs: ['Marque et modèle exact', 'RAM + Stockage — ex: 8 Go / 128 Go', 'Taille écran — ex: 6,5 pouces', 'Batterie — ex: 5000 mAh', 'Connectivité — ex: 5G / WiFi 6 / NFC', 'Certification — ex: IP68, CE'],
        photoTip: 'Vues multiples : face · côté · ports · boîte d\'origine',
        badge: 'Référence fabricant requise',
    },
    "Pharmacie & Santé": {
        sizeKindDefault: 'none',
        attrs: ['Type de peau / usage', 'Volume ml ou poids g', 'Composition (INCI ou principes actifs)', 'Âge minimum / contre-indications', 'Certifications — ex: Bio, Vegan, CE'],
        photoTip: 'Photo emballage face + photo étiquette dos',
    },
    "Électroménager": {
        sizeKindDefault: 'none',
        attrs: ['Marque et modèle', 'Puissance — ex: 1800 W', 'Volume ou capacité — ex: 300 L', 'Dimensions H×L×P — ex: 85×60×60 cm', 'Classe énergétique — ex: A+++'],
        photoTip: 'Photo de face + photo porte ouverte si réfrigérateur / four',
    },
    "Maison & Déco": {
        sizeKindDefault: 'none',
        attrs: ['Dimensions H×L×P — ex: 80×120×45 cm', 'Poids — ex: 15 kg', 'Matière principale — ex: bois massif', 'Style — ex: moderne / africain', 'Montage requis — Oui / Non'],
        photoTip: 'Photo en situation + dimensions visibles ou schéma de cotes',
    },
    "Pâtisserie & Traiteur": {
        sizeKindDefault: 'none',
        attrs: ['Ingrédients principaux', 'Allergènes — ex: gluten, lait, œufs', 'Conservation — ex: 48h au frais', 'Délai de préparation — ex: 2 jours', 'Commande minimum'],
        photoTip: 'Photo appétissante en lumière naturelle',
    },
    "Alimentation & Boissons": {
        sizeKindDefault: 'none',
        attrs: ['Poids net g / Volume ml', 'Ingrédients et allergènes', 'DLC ou DDM', 'Origine / pays de production', 'Conservation — ex: 15°C, à l\'abri de l\'humidité'],
        photoTip: 'Photo face produit + photo étiquette dos complète',
        badge: 'DLC + ingrédients obligatoires',
    },
    "Auto & Moto": {
        sizeKindDefault: 'none',
        attrs: ['Marque véhicule compatible', 'Modèle et année — ex: Toyota Corolla 2018', 'Motorisation — ex: 1.6 L essence', 'Référence OEM (si pièce d\'origine)', 'Dimensions pièce — ex: Ø 25 mm'],
        photoTip: 'Photo pièce seule + photo montée sur véhicule si possible',
        badge: 'Compatibilité véhicule obligatoire',
    },
    "Bébé & Enfants": {
        sizeKindDefault: 'clothing',
        attrs: ['Tranche d\'âge — ex: 6-12 mois', 'Taille cm / Poids bébé kg', 'Matière et composition', 'Certification — ex: EN 71, CE, Sans BPA'],
        photoTip: 'Photo produit + photo étiquette certification',
        badge: 'Certification sécurité requise',
    },
    "Sport & Loisirs": {
        sizeKindDefault: 'clothing',
        attrs: ['Sport concerné — ex: Football, Running', 'Niveau — Débutant / Intermédiaire / Expert', 'Poids — ex: 850 g', 'Dimensions transport — ex: 60×30×15 cm'],
        photoTip: 'Photo produit seul + photo en situation d\'utilisation',
    },
    "Bijoux & Montres": {
        sizeKindDefault: 'ring',
        attrs: ['Matière — ex: Or 18K / Argent 925 / Acier inox', 'Pierre ou gemme (si applicable)', 'Poids — ex: 4,5 g', 'Longueur chaîne ou tour de poignet cm'],
        photoTip: 'Photo macro (gros plan détail) + photo portée',
        badge: 'Matière exacte obligatoire',
    },
    "Jouets & Jeux": {
        sizeKindDefault: 'none',
        attrs: ['Âge minimum — ex: 3+', 'Nombre de joueurs — ex: 2 à 6', 'Durée de jeu estimée — ex: 45 min', 'Certification — ex: EN 71, CE'],
        photoTip: 'Photo produit + photo contenu déballé',
        badge: 'Âge minimum obligatoire (réglementation)',
    },
    "Animalerie": {
        sizeKindDefault: 'none',
        attrs: ['Espèce cible — ex: Chien / Chat', 'Taille animal — ex: XS < 5 kg / M 10-20 kg', 'Âge animal — Chiot / Adulte / Senior', 'Composition si nourriture'],
        photoTip: 'Photo produit + photo animal portant l\'accessoire si applicable',
    },
    "Livres & Culture": {
        sizeKindDefault: 'none',
        attrs: ['Auteur(s)', 'Éditeur et année de parution', 'Nombre de pages', 'Langue — ex: Français / Lingala', 'ISBN — ex: 978-2-...'],
        photoTip: 'Couverture haute résolution (face)',
    },
    "Bricolage & Outillage": {
        sizeKindDefault: 'none',
        attrs: ['Puissance — ex: 750 W', 'Tension — ex: 18 V / 220 V', 'Couple — ex: 35 Nm', 'Dimensions — ex: Ø 13 mm perçage max', 'Certification — ex: CE, IP44'],
        photoTip: 'Photo technique + photo en situation d\'utilisation',
        badge: 'Certification CE obligatoire',
    },
    "Bagagerie & Voyage": {
        sizeKindDefault: 'none',
        attrs: ['Dimensions ext. H×L×P — ex: 70×45×28 cm', 'Volume — ex: 95 litres', 'Poids vide — ex: 3,2 kg', 'Conformité cabine IATA — Oui / Non (55×35×25 cm)'],
        photoTip: 'Photo fermée + photo ouverte intérieur',
    },
    "Services": {
        sizeKindDefault: 'none',
        attrs: ['Durée — ex: 1h30', 'Lieu d\'intervention — ex: À domicile / En boutique', 'Matériel inclus — Oui / Non', 'Zone géographique desservie'],
        photoTip: 'Photo illustrant la prestation ou le prestataire au travail',
    },
    "Fournitures & Bureau": {
        sizeKindDefault: 'none',
        attrs: ['Marque et référence', 'Dimensions — ex: A4 / 21×29,7 cm', 'Matière / composition', 'Quantité par lot / pack'],
        photoTip: 'Photo produit + photo du packaging',
    },
    "Agriculture & Élevage": {
        sizeKindDefault: 'none',
        attrs: ['Espèce / variété', 'Quantité — ex: 1 kg / lot de 50', 'Certification — ex: Bio, Non-OGM', 'Saison ou disponibilité'],
        photoTip: 'Photo produit en situation — champ, sac, animal',
    },
    "Matériaux & BTP": {
        sizeKindDefault: 'none',
        attrs: ['Dimensions — ex: 50×20×20 cm', 'Résistance / norme — ex: M+', 'Quantité par lot / palette', 'Marque et origine'],
        photoTip: 'Photo produit + photo mise en œuvre si disponible',
    },
}

const RE_PROPERTY_CONDITIONS = [
    'Neuf / récent',
    'Bon état',
    'À rénover',
    'En construction',
    'Autre / voir description',
] as const

const RE_LAND_LEGAL_OPTIONS = [
    'Titre foncier',
    'Arrêté',
    'Attestation de vente',
    'Titre / document en cours',
    'Non précisé — à vérifier avec l’annonceur',
] as const

/** Max 5 Mo — aligné UI + upload (évite chargements interminables) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Safari / iOS : MIME parfois vide ou application/octet-stream malgré une photo valide */
function looksLikeImageFileByName(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp'].includes(ext)
}

function validateImageFile(file: File | null): string | null {
    if (!file) return null
    const mimeOk = file.type.startsWith('image/')
    const octetStream = file.type === 'application/octet-stream' || file.type === ''
    if (!mimeOk && !(octetStream && looksLikeImageFileByName(file))) {
        return `« ${file.name} » n'est pas une image (types acceptés : JPG, PNG, WebP, GIF, HEIC…).`
    }
    if (file.size > MAX_IMAGE_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1)
        return `« ${file.name} » fait ${mb} Mo — maximum 5 Mo par image.`
    }
    return null
}

/** Délai max par fichier upload Storage + action serveur (aligné réseaux à forte latence). */
const UPLOAD_TIMEOUT_MS = NETWORK_TIMEOUT_MS

/** 1 tentative + minimum 3 relances sur erreurs réseau / Storage (hors timeout). */
const UPLOAD_NETWORK_MAX_ATTEMPTS = 4

/** 1 tentative + 3 relances si l’action serveur expire (timeout). */
const CREATE_PRODUCT_MAX_ATTEMPTS = 4

/** Compression JPEG/PNG */
const COMPRESS_TIMEOUT_MS = NETWORK_TIMEOUT_MS

/** Action serveur createProduct */
const CREATE_PRODUCT_TIMEOUT_MS = NETWORK_TIMEOUT_MS

/** getSession / refresh — ne pas couper trop tôt sur réseau lent */
const SESSION_VERIFY_TIMEOUT_MS = NETWORK_TIMEOUT_MS

const SESSION_RECOVER_SET_SESSION_TIMEOUT_MS = NETWORK_TIMEOUT_MS
const SESSION_RECOVER_GET_USER_TIMEOUT_MS = NETWORK_TIMEOUT_MS
const SESSION_SECOND_GETSESSION_TIMEOUT_MS = NETWORK_TIMEOUT_MS

/** Si le JWT expire dans plus de 2 min, on ne force pas refreshSession (moins d’appels réseau, moins de risques de blocage) */
const SESSION_REFRESH_ONLY_IF_EXPIRES_WITHIN_MS = 120_000

const LOGIN_REDIRECT = `/?redirect=${encodeURIComponent('/vendor/dashboard?tab=products')}`

const MSG_SLOW_UPLOAD =
    'Connexion très lente : l’envoi d’une image a dépassé le délai imparti (après une nouvelle tentative automatique). Réessayez avec le Wi‑Fi, des photos plus légères, ou plus tard.'

const MSG_SESSION_EXPIRED_RECONNECT = 'Session expirée, reconnexion en cours...'

const MSG_SLOW_CREATE_PRODUCT =
    'L’enregistrement du produit sur le serveur a pris trop de temps (connexion ou serveur lent). Réessayez dans un instant. Si le produit apparaît déjà dans votre liste, ne le publiez pas en double.'

const MSG_FRIENDLY_TECH =
    'Oups, une petite erreur technique est survenue. Nos équipes sont prévenues. Réessayez dans un instant.'

const UPLOAD_TIMEOUT_ERROR = '__UPLOAD_TIMEOUT__'

function isTimeoutError(e: unknown): boolean {
    return e instanceof Error && e.message === UPLOAD_TIMEOUT_ERROR
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = setTimeout(() => reject(new Error(UPLOAD_TIMEOUT_ERROR)), ms)
        promise.then(
            (v) => {
                clearTimeout(id)
                resolve(v)
            },
            (err) => {
                clearTimeout(id)
                reject(err)
            }
        )
    })
}

function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms))
}

/**
 * Retries réseau pour Storage : au moins 3 relances après le 1er échec.
 * Les timeouts (`__UPLOAD_TIMEOUT__`) sont remontés tout de suite pour la logique « 2e vague » en amont.
 */
async function runWithNetworkRetries<T>(fn: () => Promise<T>, logLabel: string): Promise<T> {
    let last: unknown
    for (let attempt = 1; attempt <= UPLOAD_NETWORK_MAX_ATTEMPTS; attempt++) {
        try {
            return await fn()
        } catch (e) {
            last = e
            if (isTimeoutError(e)) throw e
            if (attempt >= UPLOAD_NETWORK_MAX_ATTEMPTS) break
            const wait = 380 * attempt
            console.warn(
                `[AddProductForm] ${logLabel} — échec ${attempt}/${UPLOAD_NETWORK_MAX_ATTEMPTS}, nouvel essai dans ${wait}ms`,
                e,
            )
            await sleep(wait)
        }
    }
    throw last instanceof Error ? last : new Error(String(last))
}

/**
 * `createProduct` via Server Action : nouvelles tentatives uniquement sur timeout réseau (pas sur erreur métier renvoyée dans `{ error }`).
 */
async function callCreateProductWithRetries(
    payload: Parameters<typeof serverCreateProduct>[0],
): Promise<Awaited<ReturnType<typeof serverCreateProduct>>> {
    let last: unknown
    for (let attempt = 1; attempt <= CREATE_PRODUCT_MAX_ATTEMPTS; attempt++) {
        try {
            return await withTimeout(serverCreateProduct(payload), CREATE_PRODUCT_TIMEOUT_MS)
        } catch (e) {
            last = e
            if (!isTimeoutError(e)) throw e
            if (attempt >= CREATE_PRODUCT_MAX_ATTEMPTS) break
            const wait = 500 * attempt
            console.warn(
                `[AddProductForm] createProduct timeout — tentative ${attempt}/${CREATE_PRODUCT_MAX_ATTEMPTS}, attente ${wait}ms`,
            )
            await sleep(wait)
        }
    }
    throw last instanceof Error ? last : new Error(String(last))
}

function isJwtExpiredOrPermissionDenied(msg: string): boolean {
    const m = msg.toLowerCase()
    return (
        m.includes('jwt') ||
        m.includes('expired') ||
        m.includes('permission denied') ||
        m.includes('not authorized') ||
        m.includes('401') ||
        m.includes('403') ||
        m.includes('pgrst301') ||
        m.includes('invalid_grant')
    )
}

/** Erreurs retournées par @supabase/storage-js (nom approximatif selon version). */
function isStorageLikeError(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false
    const o = e as Record<string, unknown>
    const name = String(o.name ?? '')
    if (name.includes('Storage')) return true
    if ('statusCode' in o && typeof o.statusCode === 'number') return true
    return false
}

/** Erreur PostgREST / insert produit (code 5 car. typique). */
function isPostgrestLikeObject(e: unknown): e is { message?: string; code?: string; details?: string; hint?: string } {
    if (!e || typeof e !== 'object') return false
    const c = (e as { code?: unknown }).code
    return typeof c === 'string' && /^[0-9A-Z]{5}$/.test(c)
}

type AuthGetSessionBundle = { data: { session: Session | null }; error: { message: string } | null }

/** Jetons persistés par @supabase/gotrue-js (clé typique sb-<ref>-auth-token) */
type PersistedSupabaseAuth = {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    user?: { id?: string }
}

function readPersistedSupabaseAuthFromStorage(): PersistedSupabaseAuth | null {
    if (typeof window === 'undefined' || !window.localStorage) return null
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
            const raw = localStorage.getItem(key)
            if (!raw) continue
            const j = JSON.parse(raw) as PersistedSupabaseAuth
            if (j?.access_token && j?.refresh_token) return j
        }
    } catch (e) {
        console.warn('[AddProductForm] lecture localStorage auth Supabase:', e)
    }
    return null
}

/**
 * Quand getSession() ne se résout jamais (locks, extensions, souci Cloudflare…),
 * réinjecter la session depuis le stockage local remet en général les bons headers sur storage.upload.
 */
async function recoverSessionAfterGetSessionHang(
    supabase: ReturnType<typeof getSupabaseBrowserClient>,
): Promise<Session | null> {
    const persisted = readPersistedSupabaseAuthFromStorage()
    if (persisted?.access_token && persisted?.refresh_token) {
        try {
            const { data, error } = (await withTimeout(
                supabase.auth.setSession({
                    access_token: persisted.access_token,
                    refresh_token: persisted.refresh_token,
                }),
                SESSION_RECOVER_SET_SESSION_TIMEOUT_MS,
            )) as { data: { session: Session | null }; error: { message: string } | null }
            if (error) {
                console.error('[AddProductForm] repli setSession:', error.message)
            } else if (data.session?.user?.id) {
                console.warn(
                    '[AddProductForm] Session réhydratée via setSession (getSession était bloqué / trop lent)',
                )
                return data.session
            }
        } catch (e: unknown) {
            if (isTimeoutError(e)) {
                console.error('[AddProductForm] repli setSession: timeout')
            } else {
                console.error('[AddProductForm] repli setSession:', e)
            }
        }
    } else {
        console.warn(
            '[AddProductForm] Pas de access_token + refresh_token dans localStorage — impossible setSession de repli',
        )
    }

    try {
        const { data, error } = (await withTimeout(
            supabase.auth.getUser(),
            SESSION_RECOVER_GET_USER_TIMEOUT_MS,
        )) as { data: { user: Session['user'] | null }; error: { message: string } | null }
        if (error) {
            console.warn('[AddProductForm] repli getUser:', error.message)
        }
        if (data.user?.id) {
            console.warn('[AddProductForm] getUser OK après échec getSession — nouvelle lecture getSession courte')
            try {
                const { data: d2 } = (await withTimeout(
                    supabase.auth.getSession(),
                    SESSION_SECOND_GETSESSION_TIMEOUT_MS,
                )) as AuthGetSessionBundle
                if (d2.session?.user?.id) return d2.session
            } catch {
                /* ignore */
            }
        }
    } catch (e: unknown) {
        if (isTimeoutError(e)) {
            console.error('[AddProductForm] repli getUser: timeout')
        } else {
            console.error('[AddProductForm] repli getUser:', e)
        }
    }

    return null
}

function logStorageOrPostgrestError(context: string, err: unknown) {
    if (isStorageLikeError(err)) {
        const o = err as Record<string, unknown>
        console.error(`[AddProductForm] StorageApiError — ${context}`, {
            message: o.message,
            name: o.name,
            statusCode: o.statusCode,
            error: o.error,
        })
        return
    }
    if (isPostgrestLikeObject(err)) {
        console.error(`[AddProductForm] PostgrestError — ${context}`, {
            message: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
        })
        return
    }
}

/**
 * Avant upload : session locale + refresh JWT si bientôt expiré. Retourne l’UUID pour Storage (doit = auth.uid() pour RLS).
 * Toutes les lectures auth passent par un timeout pour éviter un spinner infini si le réseau ou Supabase ne répond pas.
 */
async function ensureSessionBeforePublish(
    supabase: ReturnType<typeof getSupabaseBrowserClient>,
    propSellerId?: string,
): Promise<{ userId: string } | { redirect: true }> {
    let initial: Session | null = null
    /** Après repli localStorage, le 2e getSession() peut aussi bloquer — on évite de rappeler inutilement */
    let skipSecondGetSession = false

    try {
        const { data, error: initErr } = (await withTimeout(
            supabase.auth.getSession(),
            SESSION_VERIFY_TIMEOUT_MS,
        )) as AuthGetSessionBundle
        if (initErr) {
            console.error('[AddProductForm] getSession (initial):', initErr.message)
        }
        initial = data.session
    } catch (e: unknown) {
        if (isTimeoutError(e)) {
            console.error(
                '[AddProductForm] getSession timeout (session gate) — repli setSession / getUser',
            )
            const recovered = await recoverSessionAfterGetSessionHang(supabase)
            if (recovered?.user?.id) {
                initial = recovered
                skipSecondGetSession = true
            } else {
                const fallbackId =
                    (propSellerId && propSellerId.trim()) ||
                    readPersistedSupabaseAuthFromStorage()?.user?.id ||
                    ''
                if (fallbackId) {
                    console.warn(
                        '[AddProductForm] getSession indisponible (timeout) — poursuite de la publication avec l’identifiant connu (réseau lent).',
                    )
                    return { userId: fallbackId }
                }
                console.warn(
                    '[AddProductForm] getSession timeout sans identifiant de secours — redirection connexion.',
                )
                window.location.href = LOGIN_REDIRECT
                return { redirect: true }
            }
        } else {
            throw e
        }
    }

    if (!initial?.user?.id) {
        window.location.href = LOGIN_REDIRECT
        return { redirect: true }
    }

    const expMs =
        typeof initial.expires_at === 'number' && Number.isFinite(initial.expires_at)
            ? initial.expires_at * 1000
            : null
    const shouldRefresh =
        expMs == null || expMs < Date.now() + SESSION_REFRESH_ONLY_IF_EXPIRES_WITHIN_MS

    // Après repli setSession, refreshSession peut rappeler des chemins qui re-bloquent — on évite si déjà réhydraté
    if (shouldRefresh && !skipSecondGetSession) {
        try {
            const { error: refErr } = (await withTimeout(
                supabase.auth.refreshSession(),
                SESSION_VERIFY_TIMEOUT_MS,
            )) as { error: { message: string } | null }
            if (refErr) {
                console.warn('[AddProductForm] refreshSession:', refErr.message)
            }
        } catch (e: unknown) {
            if (isTimeoutError(e)) {
                console.warn(
                    '[AddProductForm] refreshSession timeout — poursuite si le jeton en mémoire est encore valide',
                )
            } else {
                console.warn('[AddProductForm] refreshSession:', e)
            }
        }
    } else if (shouldRefresh && skipSecondGetSession) {
        console.warn(
            '[AddProductForm] refreshSession ignoré (session récupérée après timeout getSession — évite nouveau blocage)',
        )
    }

    let after: Session | null = initial
    if (!skipSecondGetSession) {
        try {
            const { data } = (await withTimeout(
                supabase.auth.getSession(),
                SESSION_SECOND_GETSESSION_TIMEOUT_MS,
            )) as AuthGetSessionBundle
            if (data.session?.user?.id) {
                after = data.session
            }
        } catch (e: unknown) {
            if (isTimeoutError(e)) {
                console.warn(
                    '[AddProductForm] getSession (after refresh) timeout — utilisation de la session déjà lue',
                )
            } else {
                throw e
            }
        }
    } else {
        console.warn(
            '[AddProductForm] 2e getSession ignoré (session obtenue via repli après blocage du 1er getSession)',
        )
    }

    const userId = after?.user?.id ?? initial.user.id
    const afterExp =
        typeof after?.expires_at === 'number' && Number.isFinite(after.expires_at)
            ? after.expires_at * 1000
            : null
    const tokenStillValid = afterExp == null || afterExp > Date.now() + 5_000

    if (!userId || !tokenStillValid) {
        window.location.href = LOGIN_REDIRECT
        return { redirect: true }
    }

    if (sellerIdPropMismatch(propSellerId, userId)) {
        console.warn('[AddProductForm] sellerId (prop) ≠ session.user.id — chemins Storage = session (RLS)')
    }

    return { userId }
}

/** Évite d’utiliser un sellerId obsolète passé en props si la session a changé. */
function sellerIdPropMismatch(propId: string | undefined, sessionId: string): boolean {
    return Boolean(propId && propId !== sessionId)
}

async function handleJwtOrPermissionRecovery(
    supabase: ReturnType<typeof getSupabaseBrowserClient>,
): Promise<void> {
    alert(MSG_SESSION_EXPIRED_RECONNECT)
    try {
        const { data, error } = (await withTimeout(
            supabase.auth.refreshSession(),
            SESSION_VERIFY_TIMEOUT_MS,
        )) as { data: { session: Session | null }; error: { message: string } | null }
        if (!error && data.session?.user) {
            alert('Session renouvelée. Vous pouvez réessayer de publier votre produit.')
            return
        }
    } catch (e: unknown) {
        if (isTimeoutError(e)) {
            console.warn('[AddProductForm] refreshSession timeout (récupération JWT) — déconnexion.')
        } else {
            console.warn('[AddProductForm] refreshSession:', e)
        }
    }
    try {
        await withTimeout(supabase.auth.signOut({ scope: 'local' }), 15_000)
    } catch {
        /* évite de bloquer indéfiniment si signOut rame */
    }
    window.location.href = LOGIN_REDIRECT
}

const STEPS = [
    { id: 1, label: 'Infos', icon: Package },
    { id: 2, label: 'Prix & Stock', icon: Tag },
    { id: 3, label: 'Variantes', icon: Palette },
    { id: 4, label: 'Détails', icon: FileText },
    { id: 5, label: 'Images', icon: ImageIcon },
]

/** Catégories visibles selon le type de vendeur */
const VENDOR_TYPE_CATEGORIES: Record<string, string[]> = {
    patisserie: ["Pâtisserie & Traiteur"],
    restaurant: ["Alimentation & Boissons"],
    immobilier: ["Immobilier"],
    hotel:      ["Alimentation & Boissons", "Services"],
}

export type AddProductFormProps = {
    sellerId?: string
    /** Si false, le bouton Publier reste désactivé avec message d’aide */
    isVendorAccount?: boolean
    /** Requis côté serveur pour createProduct */
    verificationStatus?: string | null
    /** Type de vendeur — filtre les catégories disponibles à la publication */
    vendorType?: string | null
}

export default function AddProductForm({
    sellerId,
    isVendorAccount,
    verificationStatus,
    vendorType,
}: AddProductFormProps) {
    /**
     * Anti-course / double envoi :
     * - `publishingLockRef` : verrou synchrone (avant le prochain rendu de `loading`), empêche deux clics rapides.
     * - `publishRunIdRef` : si une logique async devait se chevaucher, on n’applique plus le `finally` (UI) que pour le run courant.
     */
    const publishingLockRef = useRef(false)
    const publishRunIdRef = useRef(0)

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [publishProgress, setPublishProgress] = useState(0)
    const [publishLabel, setPublishLabel] = useState('')
    const [imageHint, setImageHint] = useState<string | null>(null)

    // ── Modal campagne pub post-publication ──
    const [adModal, setAdModal] = useState<{ productId: string; productName: string; images: string[] } | null>(null)

    // Step 1: Infos de base
    const [name, setName] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedSubcategory, setSelectedSubcategory] = useState('')
    const [description, setDescription] = useState('')

    // Step 2: Prix & Stock
    const [price, setPrice] = useState('')
    const [hasStock, setHasStock] = useState(false)
    const [stockQuantity, setStockQuantity] = useState('')

    // Step 3: Variantes (tailles prédéfinies + couleurs swatch uniquement)
    const [sizeKind, setSizeKind] = useState<SizeKind>('none')
    const [sizes, setSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])

    const hasVariantsPayload = sizes.length > 0 || selectedColors.length > 0

    // Immobilier (étape 2 : prix / options ; étape 4 : localisation & juridique)
    const [reOfferType, setReOfferType] = useState<'vente' | 'location'>('vente')
    const [rePriceNegotiable, setRePriceNegotiable] = useState(false)
    const [rePriceOnRequest, setRePriceOnRequest] = useState(false)
    const [reCity, setReCity] = useState('')
    const [reDistrict, setReDistrict] = useState('')
    const [reStreet, setReStreet] = useState('')
    const [reSurfaceValue, setReSurfaceValue] = useState('')
    const [reSurfaceUnit, setReSurfaceUnit] = useState<'m2' | 'ares'>('m2')
    const [reRooms, setReRooms] = useState('')
    const [reBedrooms, setReBedrooms] = useState('')
    const [rePropertyCondition, setRePropertyCondition] = useState('')
    const [reLandLegalStatus, setReLandLegalStatus] = useState('')
    const [reLegalNotes, setReLegalNotes] = useState('')

    // Step 4: Détails
    const [features, setFeatures] = useState<string[]>([''])

    // Step 5: Images
    const [mainImage, setMainImage] = useState<File | null>(null)
    const [gallery, setGallery] = useState<(File | null)[]>([null, null, null, null, null])
    /** Fallback si les props serveur (user.id) sont vides alors que la session navigateur existe */
    const [sessionUserId, setSessionUserId] = useState<string | null>(null)

    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    useEffect(() => {
        let cancelled = false
        const syncSessionUser = () => {
            void supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
                if (!cancelled) setSessionUserId(res.data.session?.user?.id ?? null)
            })
        }
        syncSessionUser()
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            syncSessionUser()
        })
        return () => {
            cancelled = true
            sub.subscription.unsubscribe()
        }
    }, [supabase])

    const isRealEstate = selectedCategory === IMMOBILIER_CATEGORY

    // Catégories filtrées selon le type du vendeur
    const filteredChoix = vendorType && VENDOR_TYPE_CATEGORIES[vendorType]
        ? Object.fromEntries(
            VENDOR_TYPE_CATEGORIES[vendorType]
                .filter(cat => mesChoix[cat])
                .map(cat => [cat, mesChoix[cat]])
          )
        : mesChoix

    // Auto-sélectionner si une seule catégorie disponible
    useEffect(() => {
        const cats = Object.keys(filteredChoix)
        if (cats.length === 1 && !selectedCategory) {
            setSelectedCategory(cats[0])
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendorType])

    useEffect(() => {
        if (selectedCategory === IMMOBILIER_CATEGORY) {
            setHasStock(false)
            setStockQuantity('')
            setSizeKind('none')
            setSizes([])
            setSelectedColors([])
        } else if (selectedCategory) {
            const cfg = CATEGORY_CONFIG[selectedCategory]
            // Auto-sélectionner le type de taille recommandé pour la catégorie
            if (cfg?.sizeKindDefault) {
                setSizeKind(cfg.sizeKindDefault)
                setSizes([])
            }
            // Pré-initialiser les champs caractéristiques (seulement si tous vides)
            if (cfg?.attrs?.length) {
                setFeatures(prev => {
                    const allEmpty = prev.every(f => !f.trim())
                    return allEmpty ? Array(cfg.attrs.length).fill('') : prev
                })
            }
        }
    }, [selectedCategory])

    const validationCtx: ProductFormValidationContext = {
        name,
        selectedCategory,
        selectedSubcategory,
        price,
        hasStock,
        stockQuantity,
        mainImage,
        gallery,
        isRealEstate,
        rePriceNegotiable,
        rePriceOnRequest,
        reCity,
        reDistrict,
        reStreet,
        reSurfaceValue,
        reSurfaceUnit,
        reRooms,
        reBedrooms,
        rePropertyCondition,
        reLandLegalStatus,
    }

    useEffect(() => {
        if (!imageHint) return
        const t = setTimeout(() => setImageHint(null), 8000)
        return () => clearTimeout(t)
    }, [imageHint])

    /** Prêt à publier — calcul synchrone (pas de useMemo) pour éviter tout piège TDZ / deps */
    let publishReadiness: { ok: boolean; hints: string[] }
    if (step !== 5) {
        publishReadiness = { ok: true, hints: [] }
    } else {
        const hints: string[] = []
        const effectiveSellerId = sellerId?.trim() || sessionUserId?.trim()
        if (!effectiveSellerId) {
            hints.push('Session expirée ou incomplète — reconnectez-vous puis réessayez.')
        }
        if (isVendorAccount !== true) {
            hints.push('Votre compte doit être en mode vendeur pour mettre un produit en ligne.')
        }
        if (verificationStatus != null && verificationStatus !== 'verified') {
            hints.push('Terminez la vérification de votre boutique (menu Vérification) avant de publier.')
        }
        const stepErr = validateProductStep(5, validationCtx)
        if (stepErr) hints.push(stepErr)
        if (mainImage) {
            const im = validateImageFile(mainImage)
            if (im) hints.push(im)
        }
        for (let i = 0; i < gallery.length; i++) {
            const f = gallery[i]
            if (!f) continue
            const g = validateImageFile(f)
            if (g) hints.push(g)
        }
        publishReadiness = { ok: hints.length === 0, hints }
    }

    const goNext = () => {
        const error = validateProductStep(step, validationCtx)
        if (error) { alert(error); return }
        setStep(Math.min(step + 1, 5))
    }

    const goBack = () => setStep(Math.max(step - 1, 1))

    const setSizeKindAndReset = (kind: SizeKind) => {
        setSizeKind(kind)
        setSizes([])
    }

    const togglePresetSize = (s: string) => {
        setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
    }

    const toggleVariantColor = (colorName: string) => {
        setSelectedColors((prev) =>
            prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName],
        )
    }

    // ===== FEATURES MANAGEMENT =====
    const updateFeature = (idx: number, val: string) => {
        const next = [...features]
        next[idx] = val
        setFeatures(next)
    }

    const addFeature = () => setFeatures([...features, ''])
    const removeFeature = (idx: number) => setFeatures(features.filter((_, index) => index !== idx))

    const reportTechnicalFailure = async (context: string, err: unknown) => {
        logStorageOrPostgrestError(context, err)

        if (err instanceof Error) {
            console.error(`[AddProductForm] Cause réelle — ${context}`, {
                message: err.message,
                name: err.name,
                stack: err.stack,
            })
        } else if (!isStorageLikeError(err) && !isPostgrestLikeObject(err)) {
            console.error(`[AddProductForm] Cause réelle — ${context}`, err)
        }

        if (isTimeoutError(err)) {
            alert(context === 'server_createProduct' ? MSG_SLOW_CREATE_PRODUCT : MSG_SLOW_UPLOAD)
            return
        }

        const msg =
            err instanceof Error
                ? err.message
                : typeof err === 'object' && err !== null && 'message' in err
                  ? String((err as { message: unknown }).message)
                  : String(err)

        /**
         * Chaîne images (compression + POST `/api/upload`) : toujours afficher le message serveur réel.
         * Sinon des erreurs du type « Échec envoi image (500) » ou texte avec « policy » tombaient dans des branches
         * génériques / JWT sans explication utile.
         */
        const isImageUploadPipeline =
            context === 'compression_images' ||
            context === 'upload_image_principale' ||
            context === 'upload_galerie'

        if (isImageUploadPipeline) {
            const detail = msg.length > 520 ? `${msg.slice(0, 520)}…` : msg
            alert(
                `Erreur lors du traitement ou de l’envoi d’une image.\n\n${detail}\n\n` +
                    'Vérifiez : 1) variables serveur CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (Vercel ou .env.local, voir .env.example) ; 2) connexion ; 3) taille/format des photos. Ce message n’est en général pas lié à une simple déconnexion vendeur.',
            )
            return
        }

        /**
         * Erreurs Cloudinary explicites (hors pipeline ci-dessus si jamais remontées ailleurs).
         */
        const looksLikeCloudinaryOrUploadConfig =
            /cloudinary|CLOUDINARY_|définissez CLOUDINARY|CLOUDINARY_URL/i.test(msg)

        if (looksLikeCloudinaryOrUploadConfig) {
            const detail = msg.length > 450 ? `${msg.slice(0, 450)}…` : msg
            alert(
                `Erreur d’envoi d’image (serveur).\n\n${detail}\n\n` +
                    'À vérifier sur Vercel → Environment Variables (ou .env.local) : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (voir .env.example). Un 401 Cloudinary indique en général des clés ou un cloud_name incorrects, pas votre session vendeur.',
            )
            return
        }

        if (
            isJwtExpiredOrPermissionDenied(msg) ||
            /permission denied|not authorized|\b403\b|\b401\b/i.test(msg)
        ) {
            await handleJwtOrPermissionRecovery(supabase)
            return
        }

        /** RLS / Storage Supabase — éviter le seul mot « policy » (faux positifs avec d’autres APIs). */
        if (
            /row-level security|row level security|violates row-level|\brls\b|storage api|storage\.from|new row violates/i.test(
                msg,
            )
        ) {
            alert(
                'Accès refusé côté base de données ou stockage. Vérifiez votre connexion ou reconnectez-vous.',
            )
            return
        }

        console.error('[AddProductForm] DEBUG (non classé):', err)
        alert(MSG_FRIENDLY_TECH)
    }

    const isActionableServerMessage = (msg: string) => {
        const m = msg.toLowerCase()
        return (
            m.includes('vérifi') ||
            m.includes('verification') ||
            m.includes('limite') ||
            m.includes('abonnement') ||
            m.includes('plan') ||
            m.includes('connecté') ||
            m.includes('non connecté') ||
            m.includes('reconnectez') ||
            m.includes('session') ||
            m.includes('incohérent') ||
            m.includes('expirée') ||
            m.includes('expired')
        )
    }

    // ===== SUBMIT =====
    const handleSubmit = async () => {
        if (loading || publishingLockRef.current) return
        if (!publishReadiness.ok) {
            const first = publishReadiness.hints[0]
            if (first) setImageHint(first)
            return
        }

        publishingLockRef.current = true
        const runId = ++publishRunIdRef.current
        /** Si `runId` ne correspond plus au ref, un autre envoi a pris le relais — ne pas toucher à l’UI globale. */
        const ownsPublishUi = () => publishRunIdRef.current === runId

        /** Data URL complète (`data:image/...;base64,...`) — même format que Cloudinary attend côté serveur. */
        const toBase64 = (file: File): Promise<string> =>
            new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = () => resolve(String(reader.result ?? '').trim())
                reader.onerror = () => reject(new Error('Lecture du fichier image impossible.'))
            })

        const uploadFileOnce = async (file: File): Promise<string> => {
            const base64 = await toBase64(file)
            if (!base64.startsWith('data:image')) {
                throw new Error('Format image invalide — attendu data:image/...')
            }
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ image: base64 }),
            })
            let body: { url?: string; secure_url?: string; error?: string }
            try {
                body = await res.json()
            } catch {
                body = {}
            }
            if (!res.ok) {
                throw new Error(body.error || `Échec envoi image (${res.status})`)
            }
            const imageUrl = body.url ?? body.secure_url
            if (!imageUrl) {
                throw new Error('Réponse serveur sans URL d’image.')
            }
            return imageUrl
        }

        /**
         * POST `/api/upload` (session requise) : jusqu’à 4 essais sur erreurs réseau, puis une 2e « vague » complète si timeout.
         * Les fichiers sont envoyés en parallèle via `Promise.all` — pas de races car l’endpoint est stateless.
         */
        const uploadFileTimedWithRetry = async (file: File, label: string): Promise<string> => {
            const oneWave = () =>
                runWithNetworkRetries(
                    () => withTimeout(uploadFileOnce(file), UPLOAD_TIMEOUT_MS),
                    `api.upload ${label}`,
                )
            try {
                return await oneWave()
            } catch (e: unknown) {
                if (!isTimeoutError(e)) throw e
                await sleep(2000)
                return await oneWave()
            }
        }

        const safeCompress = async (file: File): Promise<File> => {
            try {
                return await withTimeout(compressImageForUpload(file), COMPRESS_TIMEOUT_MS)
            } catch (e: unknown) {
                if (isTimeoutError(e)) {
                    console.warn('[AddProductForm] compression timeout, fichier original:', file.name)
                } else {
                    console.warn('[AddProductForm] compression échouée, fichier original:', file.name, e)
                }
                return file
            }
        }

        setLoading(true)
        setPublishProgress(5)

        try {
            setPublishLabel('Vérification de la session…')
            const gate = await ensureSessionBeforePublish(supabase, sellerId)
            if (!ownsPublishUi()) return
            if ('redirect' in gate) {
                return
            }
            const storageUserId = gate.userId

            setPublishLabel('Préparation…')

            // ── Compression parallèle ────────────────────────────────────────
            setPublishProgress(8)
            setPublishLabel('Optimisation des photos…')
            let fileMain: File
            const galleryPrepared: { slotIndex: number; file: File }[] = []
            try {
                const galleryIndexed = gallery
                    .map((f, i) => ({ file: f, index: i }))
                    .filter((g): g is { file: File; index: number } => g.file !== null)

                const allCompressed = await Promise.all([
                    safeCompress(mainImage!),
                    ...galleryIndexed.map(({ file }) => safeCompress(file)),
                ])
                if (!ownsPublishUi()) return

                fileMain = allCompressed[0]
                for (let j = 0; j < galleryIndexed.length; j++) {
                    galleryPrepared.push({ slotIndex: galleryIndexed[j].index, file: allCompressed[j + 1] })
                }
            } catch (e: unknown) {
                await reportTechnicalFailure('compression_images', e)
                return
            }

            // ── Upload parallèle ─────────────────────────────────────────────
            const totalUploads = 1 + galleryPrepared.length
            let completed = 0
            const bumpUploadProgress = () => {
                completed++
                const pct = 15 + Math.round((completed / totalUploads) * 65)
                setPublishProgress(Math.min(80, pct))
                setPublishLabel(`Envoi des images… ${completed}/${totalUploads}`)
            }

            setPublishProgress(15)
            setPublishLabel(`Envoi des images (0/${totalUploads})…`)

            let mainUrl: string
            const galleryUrls: string[] = []
            try {
                const uploadWithProgress = (file: File, label: string) =>
                    uploadFileTimedWithRetry(file, label).then(url => { bumpUploadProgress(); return url })

                const results = await Promise.all([
                    uploadWithProgress(fileMain, 'principale'),
                    ...galleryPrepared.map(({ slotIndex, file }) =>
                        uploadWithProgress(file, `galerie-${slotIndex}`)
                    ),
                ])
                if (!ownsPublishUi()) return

                mainUrl = results[0]
                results.slice(1).forEach(url => galleryUrls.push(url))
            } catch (e: unknown) {
                await reportTechnicalFailure('upload_galerie', e)
                return
            }

            setPublishProgress(82)
            setPublishLabel('Enregistrement du produit…')

            const publishAsRealEstate = selectedCategory === IMMOBILIER_CATEGORY
            const parsedPrice = parseInt(price, 10)
            let priceToSend = Number.isFinite(parsedPrice) ? parsedPrice : 0
            if (publishAsRealEstate) {
                if (rePriceOnRequest || (rePriceNegotiable && (!priceToSend || priceToSend < 100))) {
                    priceToSend = 0
                }
            }

            const surfaceNum = parseFloat(reSurfaceValue.replace(',', '.'))
            const listingExtrasPayload = publishAsRealEstate
                ? buildListingExtrasV1({
                      offerType: reOfferType,
                      priceNegotiable: rePriceNegotiable,
                      priceOnRequest: rePriceOnRequest,
                      city: reCity,
                      district: reDistrict,
                      street: reStreet.trim() || undefined,
                      surfaceValue:
                          Number.isFinite(surfaceNum) && surfaceNum > 0 ? surfaceNum : undefined,
                      surfaceUnit: reSurfaceUnit,
                      rooms: reRooms.trim() !== '' ? parseInt(reRooms, 10) : undefined,
                      bedrooms: reBedrooms.trim() !== '' ? parseInt(reBedrooms, 10) : undefined,
                      propertyCondition: rePropertyCondition,
                      landLegalStatus: reLandLegalStatus,
                      legalNotes: reLegalNotes.trim() || undefined,
                  })
                : undefined

            let result: Awaited<ReturnType<typeof serverCreateProduct>>
            try {
                result = await callCreateProductWithRetries({
                    name,
                    price: priceToSend,
                    description,
                    category: selectedCategory,
                    subcategory: selectedSubcategory,
                    img: mainUrl,
                    images_gallery: galleryUrls,
                    has_stock: publishAsRealEstate ? false : hasStock,
                    stock_quantity: publishAsRealEstate ? 0 : hasStock ? parseInt(stockQuantity, 10) : 0,
                    has_variants: publishAsRealEstate ? false : hasVariantsPayload,
                    sizes: publishAsRealEstate || !hasVariantsPayload ? [] : sizes,
                    colors: publishAsRealEstate || !hasVariantsPayload ? [] : selectedColors,
                    listing_extras: listingExtrasPayload as Record<string, unknown> | undefined,
                    expected_seller_id: storageUserId,
                })
                if (!ownsPublishUi()) return
            } catch (e: unknown) {
                await reportTechnicalFailure('server_createProduct', e)
                return
            }

            if ('error' in result && result.error) {
                const diag = result.diagnostic
                console.error('[AddProductForm] PostgrestError — createProduct (réponse serveur)', {
                    message: result.error,
                    code: diag?.code,
                    details: diag?.details,
                    hint: diag?.hint,
                })
                if (
                    isJwtExpiredOrPermissionDenied(result.error) ||
                    (diag?.code && isJwtExpiredOrPermissionDenied(String(diag.code)))
                ) {
                    await handleJwtOrPermissionRecovery(supabase)
                    return
                }
                if (isActionableServerMessage(result.error)) {
                    alert(result.error)
                } else {
                    alert(MSG_FRIENDLY_TECH)
                }
                return
            }

            setPublishProgress(95)
            setPublishLabel('Finalisation…')
            // Ne pas bloquer la redirection si revalidatePath rame (évite spinner infini côté client)
            void revalidateProducts().catch((revErr) => {
                console.error('[AddProductForm] revalidateProducts:', revErr)
            })

            setPublishProgress(100)
            setPublishLabel('Terminé !')

            // Ouvrir le modal pub (non-bloquant, remplace l'alert)
            if ('product' in result && result.product) {
                const p = result.product as any
                const allImages = [p.img, ...(p.images_gallery || [])].filter(Boolean) as string[]
                setAdModal({ productId: p.id, productName: p.name || name, images: allImages })
            } else {
                window.location.href = '/vendor/dashboard?tab=products'
            }
        } finally {
            // Déverrouiller et réinitialiser la barre uniquement pour l’envoi actif (évite d’écraser un 2e envoi).
            if (ownsPublishUi()) {
                publishingLockRef.current = false
                setLoading(false)
                setPublishProgress(0)
                setPublishLabel('')
            }
        }
    }

    // ===== PROGRESS BAR =====
    const progress = ((step - 1) / (STEPS.length - 1)) * 100

    return (
        <>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Step indicator */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon
                        const isActive = step === s.id
                        const isDone = step > s.id
                        return (
                            <button
                                key={s.id}
                                onClick={() => {
                                    if (!loading && s.id < step) setStep(s.id)
                                }}
                                className="flex flex-col items-center gap-1 relative"
                            >
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDone
                                    ? 'bg-green-500 text-white'
                                    : isActive
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                    {isDone ? <Check size={18} /> : <Icon size={18} />}
                                </div>
                                <span className={`text-[8px] font-black uppercase hidden sm:block ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {s.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Step content */}
            <div className="p-6 md:p-8">
                {/* ===== STEP 1: INFOS ===== */}
                {step === 1 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Infos de base</h3>
                            <p className="text-sm text-slate-400">Décrivez votre produit.</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom du produit</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={
                                    isRealEstate
                                        ? 'Ex : Terrain 500 m² — Bacongo, Brazzaville'
                                        : 'Ex: Perruque brésilienne...'
                                }
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 border border-transparent focus:border-orange-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Catégories */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Catégorie</label>
                                <div className="flex flex-col gap-2">
                                    {Object.keys(filteredChoix).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => { setSelectedCategory(c); setSelectedSubcategory('') }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedCategory === c
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sous-catégories */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Sous-catégorie</label>
                                <div className="flex flex-col gap-2">
                                    {selectedCategory ? filteredChoix[selectedCategory]?.map(sc => (
                                        <button
                                            key={sc}
                                            type="button"
                                            onClick={() => setSelectedSubcategory(sc)}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedSubcategory === sc
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {sc}
                                        </button>
                                    )) : (
                                        <div className="flex items-center justify-center h-full min-h-[120px]">
                                            <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold italic text-center">Choisissez une catégorie</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Badge info par catégorie */}
                        {selectedCategory && CATEGORY_CONFIG[selectedCategory]?.badge && (
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                <Check size={12} />
                                {CATEGORY_CONFIG[selectedCategory].badge}
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                                placeholder="Décrivez votre produit en détail..."
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* ===== STEP 2: PRIX & STOCK ===== */}
                {step === 2 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">
                                {isRealEstate ? 'Prix annonce immobilière' : 'Prix & Stock'}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {isRealEstate
                                    ? 'Les détails (quartier, surface, statut foncier) sont à l’étape « Détails ».'
                                    : 'Définissez le prix et la disponibilité.'}
                            </p>
                        </div>

                        {isRealEstate && (
                            <div className="p-5 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 space-y-4">
                                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-widest">
                                    Type d’offre
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {(['vente', 'location'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setReOfferType(t)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                                                reOfferType === t
                                                    ? 'bg-orange-500 text-white shadow-md'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                            }`}
                                        >
                                            {t === 'vente' ? 'Vente' : 'Location'}
                                        </button>
                                    ))}
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={rePriceNegotiable}
                                        onChange={(e) => {
                                            setRePriceNegotiable(e.target.checked)
                                            if (e.target.checked) setRePriceOnRequest(false)
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-500"
                                    />
                                    Prix négociable / à débattre
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={rePriceOnRequest}
                                        onChange={(e) => {
                                            setRePriceOnRequest(e.target.checked)
                                            if (e.target.checked) {
                                                setRePriceNegotiable(false)
                                                setPrice('0')
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-500"
                                    />
                                    Prix sur demande (masque le montant sur la fiche)
                                </label>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                {isRealEstate && (rePriceOnRequest || rePriceNegotiable)
                                    ? 'Prix affiché (FCFA) — optionnel si négociable / sur demande'
                                    : 'Prix (FCFA)'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder={isRealEstate ? '0 ou montant' : 'Ex: 15000'}
                                    disabled={isRealEstate && rePriceOnRequest}
                                    className="w-full p-4 pr-20 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-2xl font-black disabled:opacity-50"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">FCFA</span>
                            </div>
                            {!isRealEstate && price && parseInt(price) >= 100 && (
                                <p className="text-[10px] text-green-600 font-bold mt-2">
                                    Votre part : {Math.round(parseInt(price) * 0.9).toLocaleString('fr-FR')} FCFA (90%)
                                </p>
                            )}
                            {isRealEstate && parseInt(price, 10) >= 100 && !rePriceOnRequest && (
                                <p className="text-[10px] text-green-600 font-bold mt-2">
                                    Votre part : {Math.round(parseInt(price, 10) * 0.9).toLocaleString('fr-FR')} FCFA (90%)
                                </p>
                            )}
                        </div>

                        {!isRealEstate && (
                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Gérer le stock</span>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Activez pour suivre la quantité disponible</p>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${hasStock ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} onClick={() => setHasStock(!hasStock)}>
                                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasStock ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                            </label>

                            {hasStock && (
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Quantité en stock</label>
                                    <input
                                        type="number"
                                        value={stockQuantity}
                                        onChange={e => setStockQuantity(e.target.value)}
                                        placeholder="Ex: 15"
                                        className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-green-400 border border-green-200 dark:border-green-800"
                                    />
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                )}

                {/* ===== STEP 3: VARIANTES (100 % clics, pas de saisie libre) ===== */}
                {step === 3 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Variantes</h3>
                            <p className="text-sm text-slate-400">
                                {isRealEstate
                                    ? 'Les annonces immobilières n’utilisent pas les variantes taille/couleur. Passez à l’étape suivante.'
                                    : 'Cochez les tailles et couleurs proposées. Laissez vide pour un produit sans variante (ex. électronique).'}
                            </p>
                        </div>

                        {isRealEstate && (
                            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-600 text-center text-sm text-slate-500 dark:text-slate-400 font-bold">
                                Étape sans action pour l’immobilier — cliquez sur « Suivant ».
                            </div>
                        )}

                        {/* Tailles : type puis cases prédéfinies */}
                        {!isRealEstate && (
                        <>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Tailles</span>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { kind: 'none' as const, label: 'Sans taille' },
                                    { kind: 'clothing' as const, label: 'Vêtements (XS→3XL)' },
                                    { kind: 'shoes' as const, label: 'Chaussures (EU)' },
                                    { kind: 'ring' as const, label: 'Bague (tour doigt)' },
                                ]).map(({ kind, label }) => (
                                    <button
                                        key={kind}
                                        type="button"
                                        onClick={() => setSizeKindAndReset(kind)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${sizeKind === kind
                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-orange-300'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {sizeKind === 'clothing' && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {CLOTHING_SIZES.map((s) => {
                                        const on = sizes.includes(s)
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => togglePresetSize(s)}
                                                className={`min-w-[48px] h-11 px-3 rounded-xl text-sm font-black transition-all ${on
                                                    ? 'bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800'
                                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-600 hover:border-orange-400'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {sizeKind === 'shoes' && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {SHOE_SIZES.map((s) => {
                                        const on = sizes.includes(s)
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => togglePresetSize(s)}
                                                className={`min-w-[48px] h-11 px-3 rounded-xl text-sm font-black transition-all ${on
                                                    ? 'bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800'
                                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-600 hover:border-orange-400'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {sizeKind === 'ring' && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {RING_SIZES.map((s) => {
                                        const on = sizes.includes(s)
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => togglePresetSize(s)}
                                                className={`min-w-[52px] h-11 px-3 rounded-xl text-sm font-black transition-all ${on
                                                    ? 'bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800'
                                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-600 hover:border-orange-400'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        )
                                    })}
                                    <p className="w-full text-[10px] text-slate-400 font-bold italic mt-1">Taille en mm (tour de doigt) — Standard FR</p>
                                </div>
                            )}
                            {sizeKind === 'none' && (
                                <p className="text-[10px] text-slate-400 font-bold italic">Aucune taille ne sera affichée aux acheteurs.</p>
                            )}
                        </div>

                        {/* Couleurs : pastilles uniquement (noms en accessibilité seulement) */}
                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Couleurs</span>
                            <div className="grid grid-cols-6 sm:grid-cols-6 gap-3">
                                {PRODUCT_VARIANT_COLORS.map((color) => {
                                    const isSelected = selectedColors.includes(color.name)
                                    return (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => toggleVariantColor(color.name)}
                                            title={color.name}
                                            aria-label={color.name}
                                            aria-pressed={isSelected}
                                            className={`flex justify-center p-1.5 rounded-full transition-all ${isSelected
                                                ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110'
                                                : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600'
                                                }`}
                                        >
                                            <span
                                                className={`w-10 h-10 rounded-full block ${color.hex === '#FFFFFF' ? 'border-2 border-slate-300' : color.hex === '#171717' ? 'border border-slate-600' : ''
                                                    }`}
                                                style={{ backgroundColor: color.hex }}
                                            />
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-3">Sans sélection = la section couleur sera masquée pour les clients.</p>
                        </div>
                        </>
                        )}
                    </div>
                )}

                {/* ===== STEP 4: DÉTAILS ===== */}
                {step === 4 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">
                                {isRealEstate ? 'Localisation & bien' : 'Détails du produit'}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {isRealEstate
                                    ? 'Informations affichées sur la fiche annonce (confiance & recherche).'
                                    : 'Ajoutez des caractéristiques clés (optionnel).'}
                            </p>
                        </div>

                        {isRealEstate && (
                            <div className="space-y-4 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/15">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                            Ville *
                                        </label>
                                        <input
                                            value={reCity}
                                            onChange={(e) => setReCity(e.target.value)}
                                            placeholder="Ex : Brazzaville"
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                            Quartier *
                                        </label>
                                        <input
                                            value={reDistrict}
                                            onChange={(e) => setReDistrict(e.target.value)}
                                            placeholder="Ex : Bacongo, Poto-Poto…"
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                        Rue / repère (optionnel)
                                    </label>
                                    <input
                                        value={reStreet}
                                        onChange={(e) => setReStreet(e.target.value)}
                                        placeholder="Ex : près de la pharmacie…"
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                            Surface {subcategoryNeedsSurface(selectedSubcategory) ? '*' : ''}
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={reSurfaceValue}
                                            onChange={(e) => setReSurfaceValue(e.target.value)}
                                            placeholder="Ex : 250"
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                            Unité
                                        </label>
                                        <select
                                            value={reSurfaceUnit}
                                            onChange={(e) => setReSurfaceUnit(e.target.value as 'm2' | 'ares')}
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm font-bold"
                                        >
                                            <option value="m2">m²</option>
                                            <option value="ares">Ares</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                            Pièces
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={reRooms}
                                            onChange={(e) => setReRooms(e.target.value)}
                                            placeholder="—"
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                            Chambres
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={reBedrooms}
                                            onChange={(e) => setReBedrooms(e.target.value)}
                                            placeholder="—"
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                        État du bien *
                                    </label>
                                    <select
                                        value={rePropertyCondition}
                                        onChange={(e) => setRePropertyCondition(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm font-bold"
                                    >
                                        <option value="">— Choisir —</option>
                                        {RE_PROPERTY_CONDITIONS.map((o) => (
                                            <option key={o} value={o}>
                                                {o}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                        Statut foncier / document *
                                    </label>
                                    <select
                                        value={reLandLegalStatus}
                                        onChange={(e) => setReLandLegalStatus(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm font-bold"
                                    >
                                        <option value="">— Choisir —</option>
                                        {RE_LAND_LEGAL_OPTIONS.map((o) => (
                                            <option key={o} value={o}>
                                                {o}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                                        Précisions juridiques (optionnel)
                                    </label>
                                    <textarea
                                        value={reLegalNotes}
                                        onChange={(e) => setReLegalNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Ex : copie titre disponible sur demande…"
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {isRealEstate && (
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Points complémentaires (optionnel)
                            </p>
                        )}

                        <div className="space-y-3">
                            {features.map((feat, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={feat}
                                        onChange={e => updateFeature(i, e.target.value)}
                                        placeholder={
                                            CATEGORY_CONFIG[selectedCategory]?.attrs?.[i]
                                            ?? `Caractéristique ${i + 1} (ex: Matière 100% coton)`
                                        }
                                        className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                    />
                                    {features.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeFeature(i)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addFeature}
                            className="flex items-center gap-2 text-orange-500 text-xs font-black uppercase hover:underline"
                        >
                            <Plus size={14} /> Ajouter une caractéristique
                        </button>

                        {CATEGORY_CONFIG[selectedCategory]?.attrs ? (
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/40">
                                <p className="text-[10px] font-black uppercase text-blue-500 dark:text-blue-400 mb-2">
                                    Attributs recommandés — {selectedCategory}
                                </p>
                                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                    {CATEGORY_CONFIG[selectedCategory].attrs.map((a, i) => (
                                        <li key={i}>• {a}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Exemples :</p>
                                <ul className="text-xs text-slate-500 space-y-1">
                                    <li>Matière : 100% coton bio</li>
                                    <li>Poids : 250g</li>
                                    <li>Garantie : 1 an</li>
                                    <li>Origine : Congo-Brazzaville</li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== STEP 5: IMAGES ===== */}
                {step === 5 && (
                    <div className="space-y-6" aria-busy={loading} data-publish-in-progress={loading || undefined}>
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Photos du produit</h3>
                            <p className="text-sm text-slate-400">Image principale + 3 miniatures minimum (max 5 Mo / image).</p>
                            {selectedCategory && CATEGORY_CONFIG[selectedCategory]?.photoTip && (
                                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-1.5">
                                    📷 {CATEGORY_CONFIG[selectedCategory].photoTip}
                                </p>
                            )}
                            {imageHint && (
                                <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                                    {imageHint}
                                </p>
                            )}
                            {!publishReadiness.ok && publishReadiness.hints.length > 0 && !loading && (
                                <ul className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                                    {publishReadiness.hints.slice(0, 4).map((h, idx) => (
                                        <li key={idx}>{h}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Main image */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Image principale</label>
                            <div className="aspect-square max-w-xs rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 relative">
                                {mainImage ? (
                                    <>
                                        <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover" alt="principale" />
                                        <button
                                            type="button"
                                            onClick={() => setMainImage(null)}
                                            className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                                        <Upload size={32} className="text-slate-300" />
                                        <span className="text-[10px] font-black uppercase text-slate-400">Cliquez pour ajouter</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            disabled={loading}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0] || null
                                                const err = validateImageFile(f)
                                                if (err) {
                                                    setImageHint(err)
                                                    e.target.value = ''
                                                    return
                                                }
                                                setMainImage(f)
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Gallery */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Galerie ({gallery.filter(Boolean).length}/5 images)</label>
                            <div className="grid grid-cols-5 gap-3">
                                {gallery.map((file, i) => (
                                    <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative bg-slate-50 dark:bg-slate-800 overflow-hidden">
                                        {file ? (
                                            <>
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`gallery-${i}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => { const n = [...gallery]; n[i] = null; setGallery(n) }}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                                                <span className="text-xl text-slate-300">+</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    disabled={loading}
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0] || null
                                                        const err = validateImageFile(f)
                                                        if (err) {
                                                            setImageHint(err)
                                                            e.target.value = ''
                                                            return
                                                        }
                                                        const n = [...gallery]
                                                        n[i] = f
                                                        setGallery(n)
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== NAVIGATION BUTTONS ===== */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                {step > 1 ? (
                    <button
                        type="button"
                        onClick={goBack}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <ChevronLeft size={16} /> Retour
                    </button>
                ) : <div />}

                {step < 5 ? (
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        Suivant <ChevronRight size={16} />
                    </button>
                ) : (
                    <div className="flex flex-col items-end gap-2 w-full max-w-md ml-auto">
                        {loading && (
                            <div className="w-full space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                                    <span>{publishLabel || 'Publication…'}</span>
                                    <span>{publishProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-[width] duration-300 ease-out"
                                        style={{ width: `${Math.max(publishProgress, 3)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !publishReadiness.ok}
                            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-green-600 text-white font-black uppercase text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Check size={16} />}
                            {loading ? (publishLabel || 'Publication…') : 'Publier le produit'}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* ── Modal campagne pub post-publication ── */}
        {adModal && (
            <Suspense fallback={null}>
                <AdCampaignModal
                    productId={adModal.productId}
                    productName={adModal.productName}
                    productImages={adModal.images}
                    onClose={() => { setAdModal(null); window.location.href = '/vendor/dashboard?tab=products' }}
                    onSuccess={() => { setAdModal(null); window.location.href = '/vendor/dashboard?tab=products' }}
                />
            </Suspense>
        )}
        </>
    )
}
