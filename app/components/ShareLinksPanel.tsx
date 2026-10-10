'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    buildUtmUrl, buildWhatsAppShareUrl, buildFacebookShareUrl
} from '@/lib/analytics'
import { Check, Copy, ExternalLink } from 'lucide-react'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mayombe-market.com'

// ── Icônes sociales SVG inline ────────────────────────────────────────────────

const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.956.932-1.956 1.887v2.285h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
)

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
)

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
)

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
)

// ─── Composant principal ──────────────────────────────────────────────────────

interface Product {
    id: string
    name: string
    img?: string | null
    image_url?: string | null
}

interface Props {
    sellerId: string
    shopSlug?: string | null
    shopName?: string | null
}

export default function ShareLinksPanel({ sellerId, shopSlug, shopName }: Props) {
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [mode, setMode] = useState<'shop' | 'product'>('shop')
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    useEffect(() => {
        const sb = getSupabaseBrowserClient()
        sb.from('products')
            .select('id, name, img, image_url')
            .eq('seller_id', sellerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(50)
            .then(({ data }) => {
                if (data) setProducts(data)
            })
    }, [sellerId])

    const shopUrl = shopSlug
        ? `${SITE_URL}/store/${sellerId}`
        : `${SITE_URL}/store/${sellerId}`

    const targetUrl = mode === 'shop'
        ? shopUrl
        : selectedProduct
            ? `${SITE_URL}/product/${selectedProduct.id}`
            : null

    const campaign = shopSlug ?? sellerId.slice(0, 8)

    const links = targetUrl ? {
        facebook: buildFacebookShareUrl(buildUtmUrl(targetUrl, { source: 'facebook', campaign })),
        whatsapp: buildWhatsAppShareUrl(
            buildUtmUrl(targetUrl, { source: 'whatsapp', campaign }),
            mode === 'shop'
                ? `Découvrez ${shopName ?? 'cette boutique'} sur Mayombe Market`
                : `Découvrez ${selectedProduct?.name ?? 'ce produit'} sur Mayombe Market`
        ),
        tiktok: buildUtmUrl(targetUrl, { source: 'tiktok', campaign }),
        instagram: buildUtmUrl(targetUrl, { source: 'instagram', campaign }),
        copy: targetUrl,
    } : null

    async function copyToClipboard(text: string, key: string) {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedKey(key)
            setTimeout(() => setCopiedKey(null), 2000)
        } catch {
            // Fallback
            const el = document.createElement('textarea')
            el.value = text
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setCopiedKey(key)
            setTimeout(() => setCopiedKey(null), 2000)
        }
    }

    return (
        <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 className="font-black uppercase text-xs dark:text-white mb-1 flex items-center gap-2">
                    <ExternalLink size={13} className="text-amber-500" />
                    Développer ma boutique
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                    Partagez des liens trackés sur vos réseaux pour mesurer l'impact de chaque source.
                </p>

                {/* Sélecteur boutique / produit */}
                <div className="flex gap-2 mb-4">
                    {(['shop', 'product'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 text-xs font-black py-2.5 rounded-xl border transition-all ${mode === m
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500'
                            }`}
                        >
                            {m === 'shop' ? 'Ma boutique' : 'Un produit'}
                        </button>
                    ))}
                </div>

                {/* Sélecteur produit */}
                {mode === 'product' && (
                    <div className="mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                            Choisir un produit
                        </label>
                        <select
                            value={selectedProduct?.id ?? ''}
                            onChange={e => {
                                const p = products.find(p => p.id === e.target.value)
                                setSelectedProduct(p ?? null)
                            }}
                            className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-900 dark:text-white"
                        >
                            <option value="">— Sélectionner un produit —</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Liens générés */}
                {links ? (
                    <div className="space-y-2">
                        {/* Lien direct */}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Lien direct (sans tracking)</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{links.copy}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(links.copy, 'copy')}
                                className="shrink-0 flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white"
                            >
                                {copiedKey === 'copy' ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                {copiedKey === 'copy' ? 'Copié !' : 'Copier'}
                            </button>
                        </div>

                        {/* Facebook */}
                        <SocialLinkRow
                            icon={<FacebookIcon />}
                            label="Partager sur Facebook"
                            color="bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                            url={links.facebook}
                            action="open"
                            copiedKey={copiedKey}
                            onCopy={copyToClipboard}
                            id="fb"
                        />

                        {/* WhatsApp */}
                        <SocialLinkRow
                            icon={<WhatsAppIcon />}
                            label="Partager sur WhatsApp"
                            color="bg-green-50 dark:bg-green-900/20 text-green-600"
                            url={links.whatsapp}
                            action="open"
                            copiedKey={copiedKey}
                            onCopy={copyToClipboard}
                            id="wa"
                        />

                        {/* TikTok */}
                        <SocialLinkRow
                            icon={<TikTokIcon />}
                            label="Copier pour TikTok"
                            sublabel="Collez le lien dans votre bio TikTok"
                            color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white"
                            url={links.tiktok}
                            action="copy"
                            copiedKey={copiedKey}
                            onCopy={copyToClipboard}
                            id="tt"
                        />

                        {/* Instagram */}
                        <SocialLinkRow
                            icon={<InstagramIcon />}
                            label="Copier pour Instagram"
                            sublabel="Collez le lien dans votre bio Instagram"
                            color="bg-pink-50 dark:bg-pink-900/20 text-pink-600"
                            url={links.instagram}
                            action="copy"
                            copiedKey={copiedKey}
                            onCopy={copyToClipboard}
                            id="ig"
                        />
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                        <p className="text-xs text-slate-400 font-bold">
                            {mode === 'product' ? 'Sélectionnez un produit pour générer les liens.' : 'Chargement…'}
                        </p>
                    </div>
                )}
            </div>

            {/* Conseil */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    💡 Astuce : Utilisez les liens trackés pour mesurer quelle plateforme vous apporte
                    le plus de visiteurs dans l'onglet <strong>Audience</strong>.
                </p>
            </div>
        </div>
    )
}

// ─── Ligne lien social ────────────────────────────────────────────────────────

function SocialLinkRow({
    icon, label, sublabel, color, url, action, copiedKey, onCopy, id,
}: {
    icon: React.ReactNode
    label: string
    sublabel?: string
    color: string
    url: string
    action: 'open' | 'copy'
    copiedKey: string | null
    onCopy: (text: string, key: string) => void
    id: string
}) {
    const isCopied = copiedKey === id

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${color}`}>
            <div className="shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black">{label}</p>
                {sublabel && <p className="text-[10px] opacity-70">{sublabel}</p>}
            </div>
            {action === 'open' ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/50"
                >
                    <ExternalLink size={12} />
                    Ouvrir
                </a>
            ) : (
                <button
                    onClick={() => onCopy(url, id)}
                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/50"
                >
                    {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {isCopied ? 'Copié !' : 'Copier'}
                </button>
            )}
        </div>
    )
}
