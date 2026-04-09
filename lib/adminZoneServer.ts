/**
 * Vérifications serveur — ne jamais faire confiance au seul front.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeToServiceCityCode, type ServiceCityCode } from '@/lib/deliveryLocation'
import { getAdminScopeFromProfileCity, type AdminZoneScope } from '@/lib/adminZone'

const ZONE_ERROR = 'Action non autorisée hors de votre zone.'
const SUPER_ONLY = 'Action réservée au super-admin pour cette ressource.'

export async function getAdminZoneContext(
    supabase: SupabaseClient,
    adminUserId: string
): Promise<{ error: string } | { scope: AdminZoneScope }> {
    const { data: p, error } = await supabase.from('profiles').select('role, city').eq('id', adminUserId).single()
    if (error || !p) return { error: 'Profil introuvable' }
    if (p.role !== 'admin') return { error: 'Non autorisé' }
    return { scope: getAdminScopeFromProfileCity(p.city) }
}

export async function assertAdminCanActOnVendorCity(
    supabase: SupabaseClient,
    adminUserId: string,
    vendorUserId: string
): Promise<{ error?: string }> {
    const ctx = await getAdminZoneContext(supabase, adminUserId)
    if ('error' in ctx) return { error: ctx.error }
    if (ctx.scope === 'all') return {}

    const { data: v } = await supabase.from('profiles').select('city').eq('id', vendorUserId).maybeSingle()
    const vz = normalizeToServiceCityCode(v?.city)
    if (vz === null) return { error: SUPER_ONLY }
    if (vz !== ctx.scope) return { error: ZONE_ERROR }
    return {}
}

export async function assertAdminCanActOnOrder(
    supabase: SupabaseClient,
    adminUserId: string,
    orderId: string
): Promise<{ error?: string }> {
    const ctx = await getAdminZoneContext(supabase, adminUserId)
    if ('error' in ctx) return { error: ctx.error }
    if (ctx.scope === 'all') return {}

    const { data: order } = await supabase
        .from('orders')
        .select('city, order_type, user_id')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }

    let orderZone: ServiceCityCode | null = null
    if (order.order_type === 'subscription' && order.user_id) {
        const { data: vend } = await supabase.from('profiles').select('city').eq('id', order.user_id).maybeSingle()
        orderZone = normalizeToServiceCityCode(vend?.city)
    } else {
        orderZone = normalizeToServiceCityCode(order.city)
    }

    if (orderZone === null) return { error: SUPER_ONLY }
    if (orderZone !== ctx.scope) return { error: ZONE_ERROR }
    return {}
}
