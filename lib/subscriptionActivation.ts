import type { SupabaseClient } from '@supabase/supabase-js'
import { computeNewEndDate } from '@/lib/subscription'
import { sendSubscriptionConfirmationEmail } from '@/app/actions/emails'
import { createNotification } from '@/app/actions/notifications'

const PLAN_FEATURES: Record<string, string[]> = {
    starter: ['30 produits maximum', 'Commission 10% par vente', 'Statistiques basiques', 'Support par email', '1 code promo / mois'],
    pro: ['100 produits maximum', 'Commission 7% par vente', 'Badge vérifié', 'Priorité dans le feed', 'Stats avancées & export', 'Support WhatsApp'],
    premium: ['Produits illimités', 'Commission 4% par vente', 'Badge vérifié', 'Priorité maximale', 'Stats avancées & export', 'Manager dédié', 'Produits sponsorisés'],
}
const PLAN_NAMES: Record<string, string> = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }
const PLAN_EMOJIS: Record<string, string> = { starter: '🚀', pro: '⭐', premium: '👑' }

/**
 * Activates a vendor subscription after MTN MoMo payment is confirmed.
 * Safe to call multiple times — if order is not a subscription, it's a no-op.
 */
export async function activateSubscription(supabase: SupabaseClient, orderId: string): Promise<void> {
    const { data: order } = await supabase
        .from('orders')
        .select('order_type, subscription_plan_id, subscription_billing, user_id, customer_email, customer_name, total_amount')
        .eq('id', orderId)
        .maybeSingle()

    if (!order || order.order_type !== 'subscription' || !order.subscription_plan_id || !order.user_id) return

    const billing = (order.subscription_billing || 'monthly') as 'monthly' | 'yearly'
    const newPlan = order.subscription_plan_id

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_end_date')
        .eq('id', order.user_id)
        .single()

    const currentPlan = currentProfile?.subscription_plan || null
    const currentEndDate = currentProfile?.subscription_end_date || null
    const isCurrentlyActive = currentEndDate && new Date(currentEndDate) > new Date()
    const isPlanChange = isCurrentlyActive && currentPlan && currentPlan !== newPlan
        && ['starter', 'pro', 'premium'].includes(currentPlan)

    if (isPlanChange) {
        const daysToAdd = billing === 'monthly' ? 30 : 365
        const nextEndDate = new Date(
            new Date(currentEndDate!).getTime() + daysToAdd * 24 * 60 * 60 * 1000
        ).toISOString()
        await supabase.rpc('admin_schedule_next_plan', {
            p_user_id: order.user_id,
            p_next_plan: newPlan,
            p_next_billing: billing,
            p_next_end_date: nextEndDate,
        })
    } else {
        const newEndDate = computeNewEndDate(currentEndDate, billing)
        await supabase.rpc('admin_update_vendor_subscription', {
            p_user_id: order.user_id,
            p_subscription_plan: newPlan,
            p_subscription_billing: billing,
            p_subscription_start_date: new Date().toISOString(),
            p_subscription_end_date: newEndDate,
        })
    }

    // Email + notification
    if (order.customer_email) {
        sendSubscriptionConfirmationEmail(
            order.customer_email,
            order.customer_name,
            PLAN_NAMES[newPlan] || newPlan,
            order.total_amount || 0,
            PLAN_FEATURES[newPlan] || [],
        ).catch(() => {})
    }

    createNotification(
        order.user_id,
        'subscription_confirmed',
        `Abonnement ${PLAN_NAMES[newPlan] || newPlan} activé ${PLAN_EMOJIS[newPlan] || ''}`,
        `Votre abonnement ${PLAN_NAMES[newPlan] || newPlan} est actif. Bonne vente sur Mayombe Market !`,
        '/vendor/dashboard',
    ).catch(() => {})
}
