'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShieldCheck, MapPin, ChevronRight, Search,
  Utensils, Truck, CreditCard, Zap, Phone,
  Star, Clock, Flame,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  price: number
  img: string | null
  images_gallery?: string[] | null
  category: string
  seller_id: string | null
  created_at: string
  views_count: number
  stock_quantity?: number | null
  promo_percentage?: number | null
  promo_start_date?: string | null
  promo_end_date?: string | null
}

interface Seller {
  id: string
  shop_name: string | null
  store_name: string | null
  avatar_url: string | null
  city: string | null
  verification_status: string | null
  phone: string | null
  whatsapp_number: string | null
  shop_description: string | null
  bio: string | null
  coverImg: string | null
  productCount: number
}

interface Props {
  products: Product[]
  sellers: Seller[]
  initialQuery?: string
}

// ─── Placeholder data (affiché si base vide) ─────────────────────────────────

const PLACEHOLDER_RESTAURANTS = [
  { id: 'ph-1', name: 'Chez Mama Africa', city: 'Brazzaville', specialties: ['Plats congolais', 'Saka-saka', 'Pondu'], rating: 4.8, deliveryTime: '30-45 min' },
  { id: 'ph-2', name: 'Brazza Grill', city: 'Brazzaville', specialties: ['Grillades', 'Brochettes', 'Poulet braisé'], rating: 4.6, deliveryTime: '25-40 min' },
  { id: 'ph-3', name: 'Saveurs du Congo', city: 'Brazzaville', specialties: ['Cuisine traditionnelle', 'Maboké', 'Liboké'], rating: 4.5, deliveryTime: '35-50 min' },
  { id: 'ph-4', name: 'Fast Food Mayombe', city: 'Brazzaville', specialties: ['Burgers', 'Sandwichs', 'Shawarma'], rating: 4.3, deliveryTime: '15-25 min' },
  { id: 'ph-5', name: 'Le Coin Gourmand', city: 'Brazzaville', specialties: ['Fast-food', 'Menus', 'Boissons'], rating: 4.4, deliveryTime: '20-35 min' },
  { id: 'ph-6', name: 'Pointe-Noire Délices', city: 'Pointe-Noire', specialties: ['Poisson braisé', 'Fruits de mer', 'Grillades'], rating: 4.7, deliveryTime: '30-45 min' },
]

const PLACEHOLDER_DISHES = [
  { id: 'pd-1', name: 'Poulet braisé + riz', price: 3500, restaurant: 'Brazza Grill', emoji: '🍗' },
  { id: 'pd-2', name: 'Poisson braisé', price: 4000, restaurant: 'Pointe-Noire Délices', emoji: '🐟' },
  { id: 'pd-3', name: 'Saka-saka', price: 2500, restaurant: 'Chez Mama Africa', emoji: '🥬' },
  { id: 'pd-4', name: 'Pondu', price: 2500, restaurant: 'Saveurs du Congo', emoji: '🌿' },
  { id: 'pd-5', name: 'Maboké de poisson', price: 5000, restaurant: 'Saveurs du Congo', emoji: '🎋' },
  { id: 'pd-6', name: 'Brochettes de bœuf', price: 3000, restaurant: 'Brazza Grill', emoji: '🍢' },
  { id: 'pd-7', name: 'Burger maison', price: 3500, restaurant: 'Fast Food Mayombe', emoji: '🍔' },
  { id: 'pd-8', name: 'Shawarma', price: 2500, restaurant: 'Le Coin Gourmand', emoji: '🌯' },
  { id: 'pd-9', name: 'Jus naturel gingembre', price: 1000, restaurant: 'Chez Mama Africa', emoji: '🥤' },
]

// ─── Constantes ───────────────────────────────────────────────────────────────

const FILTER_PILLS = [
  { label: 'Tout voir', key: '' },
  { label: '🇨🇬 Plats congolais', key: 'congolais' },
  { label: '🔥 Grillades', key: 'grillades' },
  { label: '🍟 Fast-food', key: 'fastfood' },
  { label: '🍔 Burgers', key: 'burger' },
  { label: '🍗 Poulet', key: 'poulet' },
  { label: '🐟 Poisson', key: 'poisson' },
  { label: '🥤 Boissons', key: 'boissons' },
]

const TRUST_ITEMS = [
  { icon: CreditCard, label: 'Paiement Mobile Money' },
  { icon: Truck,      label: 'Livraison locale' },
  { icon: ShieldCheck,label: 'Restaurants vérifiés' },
  { icon: Zap,        label: 'Commande rapide' },
]

const FILTER_KEYWORDS: Record<string, string[]> = {
  congolais:  ['saka', 'pondu', 'maboke', 'maboké', 'liboké', 'liboke', 'fumbwa', 'kwanga', 'chikwanga', 'mbika', 'ntoba', 'moambe', 'congolais', 'traditionnel', 'africain'],
  grillades:  ['braisé', 'braise', 'grillé', 'grill', 'brochette', 'grillade', 'rôti'],
  fastfood:   ['burger', 'sandwich', 'pizza', 'tacos', 'shawarma', 'hot dog', 'nugget', 'frites', 'wrap'],
  burger:     ['burger'],
  poulet:     ['poulet', 'chicken', 'volaille'],
  poisson:    ['poisson', 'tilapia', 'capitaine', 'bonga', 'maboké', 'maboke', 'liboke', 'liboké', 'crevette', 'fruit de mer'],
  boissons:   ['jus', 'boisson', 'eau', 'bière', 'coca', 'fanta', 'soda', 'cocktail', 'smoothie', 'limonade', 'bissap'],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (!price || price === 0) return 'Prix sur demande'
  return price.toLocaleString('fr-FR') + ' FCFA'
}

function isNew(created_at: string): boolean {
  return (Date.now() - new Date(created_at).getTime()) < 14 * 24 * 60 * 60 * 1000
}

function getSellerName(seller: Seller): string {
  return seller.shop_name || seller.store_name || 'Restaurant'
}

function matchesFilter(name: string, key: string): boolean {
  if (!key) return true
  const n = name.toLowerCase()
  return (FILTER_KEYWORDS[key] || []).some(k => n.includes(k))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Carte restaurant (vraie donnée Supabase) */
function RestaurantCard({ seller }: { seller: Seller }) {
  const name = getSellerName(seller)
  const verified = seller.verification_status === 'verified'

  return (
    <Link href={`/seller/${seller.id}`} className="group flex-shrink-0 w-64 sm:w-72">
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-orange-50 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">

        {/* Cover image */}
        <div className="relative h-36 bg-orange-50 overflow-hidden">
          {seller.coverImg ? (
            <Image
              src={seller.coverImg}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="288px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="w-12 h-12 text-orange-200" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {verified && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-semibold text-orange-600">Vérifié</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar overlapping cover */}
            <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 -mt-8 bg-orange-100">
              {seller.avatar_url ? (
                <Image src={seller.avatar_url} alt={name} fill className="object-cover" sizes="44px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-300">
                  <Utensils className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 text-sm truncate">{name}</p>
              {seller.city && (
                <p className="text-xs text-neutral-400 flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {seller.city}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-orange-300 flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-50">
            <span className="text-xs text-neutral-400">
              {seller.productCount} plat{seller.productCount > 1 ? 's' : ''} au menu
            </span>
            <span className="text-xs font-semibold text-orange-500">Voir le menu →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Carte restaurant placeholder (quand base vide) */
function PlaceholderRestaurantCard({ r }: { r: typeof PLACEHOLDER_RESTAURANTS[0] }) {
  const EMOJIS = ['🍽️', '🍖', '🥘', '🌮', '🍔', '🐟']
  const emoji = EMOJIS[parseInt(r.id.replace('ph-', '')) % EMOJIS.length]

  return (
    <div className="flex-shrink-0 w-64 sm:w-72 rounded-2xl overflow-hidden bg-white shadow-sm border border-orange-50 opacity-70">
      <div className="relative h-36 bg-orange-50 flex items-center justify-center">
        <span className="text-5xl">{emoji}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="absolute top-3 right-3 bg-orange-100 text-orange-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          Bientôt
        </div>
      </div>
      <div className="p-4">
        <p className="font-semibold text-neutral-800 text-sm">{r.name}</p>
        <p className="text-xs text-neutral-400 flex items-center gap-0.5 mt-0.5">
          <MapPin className="w-3 h-3" />{r.city}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {r.specialties.slice(0, 2).map(s => (
            <span key={s} className="text-[10px] bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-50">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-medium text-neutral-600">{r.rating}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Clock className="w-3 h-3" />
            {r.deliveryTime}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Carte plat (vraie donnée Supabase) */
function DishCard({ product }: { product: Product }) {
  const isNewProduct = isNew(product.created_at)
  const isPopular = product.views_count > 50
  const outOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity <= 0

  return (
    <Link href={`/product/${product.id}`} className="group flex-shrink-0 w-44 sm:w-52">
      <div className="rounded-xl overflow-hidden bg-white shadow-sm border border-neutral-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">

        {/* Image */}
        <div className="relative aspect-square bg-orange-50 overflow-hidden">
          {product.img ? (
            <Image
              src={product.img}
              alt={product.name}
              fill
              className={`object-cover group-hover:scale-105 transition-transform duration-500 ${outOfStock ? 'grayscale opacity-60' : ''}`}
              sizes="208px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="w-10 h-10 text-orange-200" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {outOfStock ? (
              <span className="bg-neutral-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Indisponible
              </span>
            ) : (
              <>
                {isNewProduct && (
                  <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Nouveau
                  </span>
                )}
                {isPopular && !isNewProduct && (
                  <span className="bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" />Populaire
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs font-medium text-neutral-800 line-clamp-2 leading-snug">{product.name}</p>
          <p className="text-sm font-bold text-neutral-900 mt-1.5">{formatPrice(product.price)}</p>
          <div className="mt-2 w-full text-center bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold py-1.5 rounded-lg transition-colors">
            Voir →
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Carte plat placeholder (quand base vide) */
function PlaceholderDishCard({ dish }: { dish: typeof PLACEHOLDER_DISHES[0] }) {
  return (
    <div className="flex-shrink-0 w-44 sm:w-52 rounded-xl overflow-hidden bg-white shadow-sm border border-neutral-100 opacity-70">
      <div className="aspect-square bg-orange-50 flex items-center justify-center">
        <span className="text-5xl">{dish.emoji}</span>
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-neutral-800 line-clamp-2">{dish.name}</p>
        <p className="text-sm font-bold text-neutral-900 mt-1">{formatPrice(dish.price)}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">{dish.restaurant}</p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RestaurantClient({ products, sellers, initialQuery = '' }: Props) {
  const [activeFilter, setActiveFilter] = useState('')
  const [search, setSearch] = useState(initialQuery)

  const hasRealData  = products.length > 0
  const hasSellers   = sellers.length > 0
  const showPlaceholders = !hasRealData

  const filteredProducts = useMemo(() => {
    let result = products

    if (search.trim().length > 1) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }

    if (activeFilter) {
      result = result.filter(p => matchesFilter(p.name, activeFilter))
    }

    return result
  }, [products, search, activeFilter])

  const firstSellerWithWA = sellers.find(s => s.whatsapp_number)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF6' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pt-12 pb-16 px-4">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-orange-100/40 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-amber-100/40 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
            <Utensils className="w-3.5 h-3.5" />
            Restaurants & Fast-Food au Congo
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-900 leading-tight mb-4">
            Commandez vos plats{' '}
            <span className="font-semibold text-orange-500">préférés au Congo</span>
          </h1>

          <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Plats congolais, grillades, fast-food et menus du jour — directement auprès des meilleurs restaurants de Brazzaville et Pointe-Noire.
          </p>

          {/* Barre de recherche */}
          <div className="relative max-w-xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un plat, un restaurant, un fast-food…"
              className="w-full bg-white border border-orange-100 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-neutral-800 placeholder-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
            />
          </div>

          {/* Trust band */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-neutral-500 text-xs">
                <Icon className="w-3.5 h-3.5 text-orange-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky filter pills ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-orange-50 px-4 py-3 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {FILTER_PILLS.map(pill => (
              <button
                key={pill.key}
                onClick={() => setActiveFilter(pill.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  activeFilter === pill.key
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-14">

        {/* ── Restaurants populaires ────────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {hasSellers ? 'Restaurants populaires' : 'Nos partenaires — bientôt disponibles'}
              </h2>
              <p className="text-sm text-neutral-400 mt-0.5">
                {hasSellers
                  ? `${sellers.length} restaurant${sellers.length > 1 ? 's' : ''} à Brazzaville & Pointe-Noire`
                  : 'Des restaurants rejoignent Mayombe Market très prochainement'}
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {hasSellers
              ? sellers.map(s => <RestaurantCard key={s.id} seller={s} />)
              : PLACEHOLDER_RESTAURANTS.map(r => <PlaceholderRestaurantCard key={r.id} r={r} />)
            }
          </div>
        </section>

        {/* ── Plats populaires ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {search || activeFilter
                  ? `Résultats (${filteredProducts.length})`
                  : 'Plats populaires'}
              </h2>
              {!search && !activeFilter && (
                <p className="text-sm text-neutral-400 mt-0.5">Les plats les plus commandés de notre communauté</p>
              )}
            </div>
            {(search || activeFilter) && (
              <button
                onClick={() => { setSearch(''); setActiveFilter('') }}
                className="text-xs text-orange-500 hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {showPlaceholders ? (
            /* Placeholder dishes quand base vide */
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible sm:px-0 sm:mx-0">
              {PLACEHOLDER_DISHES.map(d => <PlaceholderDishCard key={d.id} dish={d} />)}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible sm:px-0 sm:mx-0">
              {filteredProducts.map(p => <DishCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-neutral-500 text-sm">Aucun plat trouvé pour cette recherche.</p>
              <button
                onClick={() => { setSearch(''); setActiveFilter('') }}
                className="mt-4 text-sm text-orange-500 hover:underline"
              >
                Voir tous les plats
              </button>
            </div>
          )}
        </section>

        {/* ── CTA commander ─────────────────────────────────────────────── */}
        <section>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 p-8 sm:p-10 text-white">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="text-5xl">🍽️</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-semibold tracking-widest uppercase text-orange-100">
                    Commande directe
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 leading-tight">
                  Votre plat, livré en moins de 45 minutes
                </h3>
                <p className="text-orange-100 text-sm leading-relaxed max-w-md">
                  Contactez directement votre restaurant préféré. Il confirme, prépare et livre votre commande.
                </p>
              </div>

              <div className="flex flex-col gap-3 flex-shrink-0">
                {hasSellers ? (
                  <>
                    <Link
                      href={`/seller/${sellers[0].id}`}
                      className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-orange-50 transition-all shadow-sm"
                    >
                      <Utensils className="w-4 h-4" />
                      Commander maintenant
                    </Link>
                    {firstSellerWithWA && (
                      <a
                        href={`https://wa.me/${firstSellerWithWA.whatsapp_number!.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-medium text-sm px-6 py-2.5 rounded-full hover:bg-white/30 transition-all border border-white/30"
                      >
                        <Phone className="w-4 h-4" />
                        Commande WhatsApp
                      </a>
                    )}
                  </>
                ) : (
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-orange-50 transition-all shadow-sm"
                  >
                    Voir le marketplace
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Comment commander ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-6 text-center">Comment commander ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                emoji: '🔍',
                title: 'Choisissez votre restaurant',
                desc: 'Parcourez les restaurants et trouvez le plat qui vous fait envie — plats congolais, grillades, fast-food.',
              },
              {
                step: '02',
                emoji: '✅',
                title: 'Passez commande',
                desc: 'Contactez le restaurant directement. Il confirme votre commande et commence la préparation.',
              },
              {
                step: '03',
                emoji: '🚚',
                title: 'Recevez votre plat',
                desc: 'Livraison à domicile ou retrait sur place. Suivi de commande en temps réel.',
              },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-orange-50 shadow-sm text-center">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <div className="text-xs font-bold text-orange-300 tracking-widest mb-1">{item.step}</div>
                <h3 className="font-semibold text-neutral-900 text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Types de plats ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-2 text-center">Tout ce que vous pouvez commander</h2>
          <p className="text-sm text-neutral-400 text-center mb-6">Deux types de plats pour tous les goûts</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Plats composés */}
            <div className="bg-white rounded-2xl p-6 border border-orange-50 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl">🥘</div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm">Plats composés</h3>
                  <p className="text-[11px] text-neutral-400">Cuisine traditionnelle & maison</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['Poulet braisé + riz', 'Poisson + banane', 'Saka-saka', 'Pondu', 'Maboké', 'Liboké'].map(p => (
                  <span key={p} className="text-[11px] bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">{p}</span>
                ))}
              </div>
              <div className="space-y-1 text-xs text-neutral-500">
                <p className="flex items-center gap-1.5">✓ Accompagnement : riz, banane, manioc, frites</p>
                <p className="flex items-center gap-1.5">✓ Option piment</p>
                <p className="flex items-center gap-1.5">✓ Boisson en option</p>
                <p className="flex items-center gap-1.5">✓ Instructions spéciales</p>
              </div>
            </div>

            {/* Fast-food */}
            <div className="bg-white rounded-2xl p-6 border border-orange-50 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl">🍔</div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm">Fast-food & personnalisable</h3>
                  <p className="text-[11px] text-neutral-400">Burgers, tacos, shawarma & pizza</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['Burger maison', 'Sandwich', 'Pizza', 'Tacos', 'Shawarma', 'Wrap'].map(p => (
                  <span key={p} className="text-[11px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">{p}</span>
                ))}
              </div>
              <div className="space-y-1 text-xs text-neutral-500">
                <p className="flex items-center gap-1.5">✓ Retrait d'ingrédients (sans oignon…)</p>
                <p className="flex items-center gap-1.5">✓ Suppléments : fromage, double viande, œuf</p>
                <p className="flex items-center gap-1.5">✓ Menu avec frites & boisson</p>
                <p className="flex items-center gap-1.5">✓ Options définies par chaque restaurant</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Devenir partenaire ────────────────────────────────────────── */}
        <section className="text-center pb-4">
          <div className="bg-white rounded-2xl p-8 border border-orange-50 shadow-sm max-w-lg mx-auto">
            <div className="text-4xl mb-3">🏪</div>
            <h3 className="font-semibold text-neutral-900 mb-2">Vous êtes restaurateur ?</h3>
            <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
              Rejoignez Mayombe Market et touchez des milliers de clients à Brazzaville et Pointe-Noire. Inscription gratuite.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-orange-600 transition-all"
            >
              En savoir plus →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
