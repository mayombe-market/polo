'use server'

import { assertAdminCanActOnVendorCity } from '@/lib/adminZoneServer'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
    priceForCampaign,
    isDurationDays,
    type AdPlacement,
    type AdDurationDays,
} from '@/lib/adCampaignPricing'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                },
            },
        }
    )
}

async function requireVendor() {
    const supabase = await getSupabase()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'vendor') throw new Error('Accès réservé aux vendeurs')
    return { supabase, user }
}

async function requireAdmin() {
    const supabase = await getSupabase()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Accès refusé')
    return { supabase, user }
}

export type SubmitVendorAdCampaignInput = {
    linkUrl: string
    linkType: 'product' | 'store'
    imageUrl: string
    title?: string
    description?: string
    placement: AdPlacement
    durationDays: AdDurationDays
}

/** Création — statut pending_payment */
export async function submitVendorAdCampaign(input: SubmitVendorAdCampaignInput) {
    const { supabase, user } = await requireVendor()

    const img = input.imageUrl?.trim()
    const link = input.linkUrl?.trim()
    if (!img || !link) return { error: 'Image et lien obligatoires' }
    if (!isDurationDays(input.durationDays)) return { error: 'Durée invalide' }
    if (input.placement !== 'hero' && input.placement !== 'tile') return { error: 'Emplacement invalide' }

    const price_fcfa = priceForCampaign(input.placement, input.durationDays)

    // Vérifier que le lien correspond bien au vendeur
    if (input.linkType === 'product') {
        const productId = extractUuidFromPath(link, 'product')
        if (!productId) return { error: 'Lien produit invalide' }
        const { data: p } = await supabase.from('products').select('seller_id').eq('id', productId).single()
        if (!p || p.seller_id !== user.id) return { error: 'Ce produit ne vous appartient pas' }
    } else {
        const storeId = extractUuidFromPath(link, 'store')
        if (!storeId || storeId !== user.id) return { error: "Lien boutique : utilisez l'URL de votre boutique" }
    }

    const { error } = await supabase.from('vendor_ad_campaigns').insert({
        seller_id: user.id,
        link_url: link,
        link_type: input.linkType,
        image_url: img,
        title: input.title?.trim() || null,
        description: input.description?.trim() || null,
        placement: input.placement,
        duration_days: input.durationDays,
        price_fcfa,
        status: 'pending_payment',
    })

    if (error) return { error: error.message }
    revalidatePath('/vendor/ad-campaigns')
    return { success: true }
}

function extractUuidFromPath(url: string, segment: 'product' | 'store'): string | null {
    try {
        const u = url.includes('http') ? new URL(url) : new URL(url, 'https://mayombe-market.com')
        const parts = u.pathname.split('/').filter(Boolean)
        const i = parts.indexOf(segment)
        if (i >= 0 && parts[i + 1]) return parts[i + 1]
        return null
    } catch {
        return null
    }
}

export type VendorAdPaymentMethod = 'mobile_money' | 'airtel_money'

export type DeclareVendorAdPaymentInput = {
    payment_method: VendorAdPaymentMethod
    /** 10 chiffres */
    transaction_id: string
    /** Si absent, généré automatiquement à partir de la méthode et de l'ID */
    payment_note?: string | null
}

function labelForVendorAdPaymentMethod(m: VendorAdPaymentMethod): string {
    return m === 'mobile_money' ? 'MTN Mobile Money' : 'Airtel Money'
}

/** Après paiement déclaré : passage en attente de validation admin */
export async function declareVendorAdPayment(campaignId: string, input: DeclareVendorAdPaymentInput) {
    const { supabase, user } = await requireVendor()

    const method = input.payment_method
    if (method !== 'mobile_money' && method !== 'airtel_money') {
        return { error: 'Mode de paiement invalide' }
    }

    const digits = String(input.transaction_id ?? '').replace(/\D/g, '')
    if (!/^\d{10}$/.test(digits)) {
        return { error: 'Le code de transaction doit contenir exactement 10 chiffres' }
    }

    const note =
        input.payment_note?.trim() ||
        `${labelForVendorAdPaymentMethod(method)} — ID: ${digits}`

    const { data: row } = await supabase
        .from('vendor_ad_campaigns')
        .select('id, seller_id, status')
        .eq('id', campaignId)
        .single()

    if (!row || row.seller_id !== user.id) return { error: 'Campagne introuvable' }
    if (row.status !== 'pending_payment') return { error: 'Statut incompatible' }

    const { error } = await supabase
        .from('vendor_ad_campaigns')
        .update({
            status: 'pending_review',
            payment_method: method,
            transaction_id: digits,
            payment_note: note,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

    if (error) return { error: error.message }
    revalidatePath('/vendor/ad-campaigns')
    revalidatePath('/admin/ads')
    return { success: true }
}

export async function cancelVendorAdCampaign(campaignId: string) {
    const { supabase, user } = await requireVendor()
    const { data: row } = await supabase
        .from('vendor_ad_campaigns')
        .select('seller_id, status')
        .eq('id', campaignId)
        .single()

    if (!row || row.seller_id !== user.id) return { error: 'Introuvable' }
    if (row.status !== 'pending_payment') return { error: 'Annulation impossible à ce stade' }

    const { error } = await supabase
        .from('vendor_ad_campaigns')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', campaignId)

    if (error) return { error: error.message }
    revalidatePath('/vendor/ad-campaigns')
    return { success: true }
}

export async function adminApproveVendorAdCampaign(
    campaignId: string,
    options?: { startDateIso?: string; displayOrder?: number }
) {
    const { supabase, user } = await requireAdmin()

    const { data: row } = await supabase.from('vendor_ad_campaigns').select('*').eq('id', campaignId).single()

    if (!row) return { error: 'Campagne introuvable' }

    const z = await assertAdminCanActOnVendorCity(supabase, user.id, row.seller_id as string)
    if (z.error) return { error: z.error }
    if (row.status !== 'pending_review') return { error: 'La campagne doit être en attente de validation (paiement déclaré)' }

    const start = options?.startDateIso ? new Date(options.startDateIso) : new Date()
    if (Number.isNaN(start.getTime())) return { error: 'Date de début invalide' }

    const end = new Date(start)
    end.setDate(end.getDate() + Number(row.duration_days))

    const { error } = await supabase
        .from('vendor_ad_campaigns')
        .update({
            status: 'active',
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            display_order: options?.displayOrder ?? row.display_order ?? 0,
            updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

    if (error) return { error: error.message }
    revalidatePath('/')
    revalidatePath('/admin/ads')
    return { success: true }
}

export async function adminRejectVendorAdCampaign(campaignId: string, reason: string) {
    const { supabase, user } = await requireAdmin()
    const r = reason?.trim()
    if (!r) return { error: 'Motif obligatoire' }

    const { data: pre } = await supabase.from('vendor_ad_campaigns').select('seller_id').eq('id', campaignId).single()
    if (!pre) return { error: 'Campagne introuvable' }
    const zr = await assertAdminCanActOnVendorCity(supabase, user.id, pre.seller_id as string)
    if (zr.error) return { error: zr.error }

    const { error } = await supabase
        .from('vendor_ad_campaigns')
        .update({
            status: 'rejected',
            reject_reason: r,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

    if (error) return { error: error.message }
    revalidatePath('/')
    revalidatePath('/admin/ads')
    return { success: true }
}

export type AdminListCampaignsResult =
    | { ok: true; campaigns: any[] }
    | { ok: false; campaigns: []; error: string }

/** Liste admin : toutes les campagnes (filtre visuel / actions côté client selon zone). */
export async function adminListVendorAdCampaigns(): Promise<AdminListCampaignsResult> {
    try {
        const { supabase } = await requireAdmin()

        const all = await supabase.from('vendor_ad_campaigns').select('*').order('created_at', { ascending: false }).limit(500)
        if (all.error) return { ok: false, campaigns: [], error: all.error.message }
        return { ok: true, campaigns: all.data || [] }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur inconnue'
        return { ok: false, campaigns: [], error: msg }
    }
}

export async function listMyVendorAdCampaigns() {
    const { supabase, user } = await requireVendor()
    const { data, error } = await supabase
        .from('vendor_ad_campaigns')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

    if (error) return { error: error.message, campaigns: [] }
    return { campaigns: data || [] }
}
