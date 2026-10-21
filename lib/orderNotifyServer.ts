import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/app/actions/notifications'
import { sendPushToUsers } from '@/lib/pushServer'
import {
    sendBuyerVendorDecisionEmail,
    sendVendorNewOrderEmail,
    sendVendorOrderCancelledEmail,
} from '@/app/actions/emails'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { generateTrackingNumber } from '@/lib/generateTrackingNumber'
import {
    decideOrderOutcome,
    markVendorDisputed,
    type VendorPayments,
} from '@/lib/vendorPaymentDecision'

function svc() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

type OrderItem = { id?: string; name?: string; quantity?: number; price?: number; seller_id?: string }

type OrderRow = {
    id: string
    order_number?: number
    created_at: string
    status: string
    user_id: string | null
    customer_name: string | null
    customer_email: string | null
    city: string | null
    district: string | null
    items: OrderItem[] | null
    vendor_payments: VendorPayments | null
    delivery_mode: string | null
    payment_method: string | null
    transaction_id: string | null
    total_amount: number | null
}

const ORDER_FIELDS =
    'id, order_number, created_at, status, user_id, customer_name, customer_email, city, district, items, vendor_payments, delivery_mode, payment_method, transaction_id, total_amount'

type VendorProfile = {
    id: string
    shopName: string
    email: string | null
    whatsapp: string | null
    phone: string | null
    pickupAddress: string | null
}

async function fetchVendors(ids: string[]): Promise<Map<string, VendorProfile>> {
    const map = new Map<string, VendorProfile>()
    if (ids.length === 0) return map
    const { data } = await svc()
        .from('profiles')
        .select('id, shop_name, store_name, full_name, email, whatsapp_number, phone, vendor_pickup_address')
        .in('id', ids)
    for (const p of data || []) {
        map.set(p.id, {
            id: p.id,
            shopName: p.shop_name || p.store_name || p.full_name || 'Votre vendeur',
            email: p.email || null,
            whatsapp: p.whatsapp_number || null,
            phone: p.phone || null,
            pickupAddress: p.vendor_pickup_address || null,
        })
    }
    return map
}

function itemsOf(order: Pick<OrderRow, 'items'>, sellerId: string): OrderItem[] {
    return (order.items || []).filter(i => i.seller_id === sellerId)
}

function namesOf(items: OrderItem[]): string {
    return items.map(i => `${i.name || 'Article'}${(i.quantity ?? 1) > 1 ? ` ×${i.quantity}` : ''}`).join(', ')
}

function amountOf(order: OrderRow, sellerId: string): number {
    const vpAmount = order.vendor_payments?.[sellerId]?.amount
    if (typeof vpAmount === 'number') return vpAmount
    return itemsOf(order, sellerId).reduce((s, i) => s + (i.price || 0) * (i.quantity ?? 1), 0)
}

function sellerIdsOf(order: Pick<OrderRow, 'items'>): string[] {
    return [...new Set((order.items || []).map(i => i.seller_id).filter(Boolean))] as string[]
}

const BUYER_LINK = '/account/dashboard?tab=orders'
const VENDOR_LINK = '/vendor/dashboard?tab=orders'

const METHOD_SHORT: Record<string, string> = {
    mobile_money: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    cash: 'Paiement à la livraison',
}

/** Notifications vendeur (in-app + push + email) à la création d'une commande — connectée ou invitée. */
export async function notifyVendorsNewOrder(orderId: string): Promise<void> {
    const { data: order } = await svc().from('orders').select(ORDER_FIELDS).eq('id', orderId).single<OrderRow>()
    if (!order) return
    const sellerIds = sellerIdsOf(order)
    const vendors = await fetchVendors(sellerIds)
    const orderNumber = formatOrderNumber(order)
    const method = order.payment_method || ''
    const customer = order.customer_name || 'Un client'

    await Promise.allSettled(sellerIds.map(async sid => {
        const v = vendors.get(sid)
        const entry = order.vendor_payments?.[sid]
        const amount = amountOf(order, sid)
        const products = namesOf(itemsOf(order, sid))
        const paymentDeclared = !!entry?.transaction_id
        const title = paymentDeclared
            ? `💳 Nouvelle commande — vérifiez ${amount.toLocaleString('fr-FR')} F`
            : '🛍️ Nouvelle commande'
        const body = paymentDeclared
            ? `${customer} · ${products} · ${METHOD_SHORT[method] || method} code ${entry!.transaction_id}. Confirmez si vous avez reçu le paiement.`
            : `${customer} · ${products} · ${METHOD_SHORT[method] || method}`

        await Promise.allSettled([
            createNotification(sid, 'new_order', title, body, VENDOR_LINK, `${order.id}:${sid}`),
            sendPushToUsers([sid], title, body, VENDOR_LINK),
            v?.email
                ? sendVendorNewOrderEmail(v.email, {
                    shopName: v.shopName,
                    orderNumber,
                    customerName: customer,
                    city: order.city,
                    district: order.district,
                    productNames: products,
                    amount,
                    method,
                    transactionId: entry?.transaction_id || null,
                    receivingNumber: entry?.vendor_number || null,
                    deliveryMode: order.delivery_mode,
                })
                : Promise.resolve(),
        ])
    }))
}

/** Le client corrige son code de transaction : le vendeur doit voir le nouveau code et être prévenu. */
export async function syncBuyerTransactionToVendors(
    orderId: string,
    buyerId: string,
    txDigits: string,
    schedule: (task: () => Promise<void>) => void
): Promise<void> {
    const db = svc()
    const { data: order } = await db.from('orders').select(ORDER_FIELDS).eq('id', orderId).eq('user_id', buyerId).single<OrderRow>()
    if (!order || order.status !== 'pending') return
    const vp = order.vendor_payments || {}
    const sellerIds = Object.keys(vp)
    if (sellerIds.length === 0) return

    if (sellerIds.length === 1) {
        const sid = sellerIds[0]
        await db.from('orders')
            .update({ vendor_payments: { [sid]: { ...vp[sid], transaction_id: txDigits, vendor_confirmed: false, vendor_confirmed_at: null, disputed: false } } })
            .eq('id', orderId)
            .eq('status', 'pending')
    }

    schedule(async () => {
        const title = '🔁 Le client a corrigé son code de paiement'
        const body = `${order.customer_name || 'Le client'} · nouveau code ${txDigits}. Vérifiez la réception et confirmez.`
        await Promise.allSettled(sellerIds.flatMap(sid => [
            createNotification(sid, 'payment_declared', title, body, VENDOR_LINK, `${order.id}:${sid}:tx:${txDigits}`),
            sendPushToUsers([sid], title, body, VENDOR_LINK),
        ]))
    })
}

export type VendorDecisionResult =
    | { success: true; outcome: 'confirmed' | 'waiting_others' | 'rejected'; trackingNumber?: string }
    | { error: string }

/**
 * Le vendeur confirme (ou refuse) avoir reçu le paiement. L'appelant doit avoir vérifié
 * que vendorId est l'utilisateur connecté, de rôle vendeur.
 */
export async function applyVendorPaymentDecision(
    orderId: string,
    vendorId: string,
    confirmed: boolean,
    schedule: (task: () => Promise<void>) => void
): Promise<VendorDecisionResult> {
    const db = svc()
    const { data: order } = await db.from('orders').select(ORDER_FIELDS).eq('id', orderId).single<OrderRow>()
    if (!order) return { error: 'Commande introuvable' }
    if (order.status !== 'pending') return { error: 'Cette commande a déjà été traitée.' }
    if (!order.vendor_payments?.[vendorId]) return { error: 'Aucun paiement associé à votre compte pour cette commande' }

    if (!confirmed) {
        const now = new Date().toISOString()
        const { data: updated, error } = await db
            .from('orders')
            .update({ status: 'rejected', vendor_payments: markVendorDisputed(order.vendor_payments, vendorId, now) })
            .eq('id', orderId)
            .eq('status', 'pending')
            .select('id')
        if (error) return { error: error.message }
        if (!updated?.length) return { error: 'Cette commande a déjà été traitée.' }

        await db.rpc('restore_order_stock', { p_order_id: orderId })
        schedule(() => notifyRefusal(order, vendorId))
        return { success: true, outcome: 'rejected' }
    }

    const { data: ok, error: rpcError } = await db.rpc('confirm_vendor_payment', {
        p_order_id: orderId,
        p_vendor_id: vendorId,
        p_confirmed: true,
    })
    if (rpcError) return { error: rpcError.message }
    if (!ok) return { error: 'Cette commande a déjà été traitée.' }

    const { data: fresh } = await db.from('orders').select(ORDER_FIELDS).eq('id', orderId).single<OrderRow>()
    if (!fresh) return { error: 'Commande introuvable' }

    if (decideOrderOutcome(fresh.vendor_payments) !== 'confirm') {
        schedule(() => notifyPartialConfirmation(fresh, vendorId))
        return { success: true, outcome: 'waiting_others' }
    }

    const trackingNumber = generateTrackingNumber()
    const { data: won, error: confirmError } = await db
        .from('orders')
        .update({ status: 'confirmed', tracking_number: trackingNumber, confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('id')
    if (confirmError) return { error: confirmError.message }
    // Un autre vendeur du même panier a finalisé en même temps : rien à refaire.
    if (!won?.length) return { success: true, outcome: 'confirmed' }

    for (const item of fresh.items || []) {
        if (item.id) await db.rpc('increment_confirmed_sales', { p_product_id: item.id, p_quantity: item.quantity ?? 1 })
    }
    schedule(() => notifyConfirmation(fresh, vendorId, trackingNumber))
    return { success: true, outcome: 'confirmed', trackingNumber }
}

async function notifyConfirmation(order: OrderRow, vendorId: string, trackingNumber: string) {
    const sellerIds = sellerIdsOf(order)
    const vendors = await fetchVendors(sellerIds)
    const v = vendors.get(vendorId)
    const shop = v?.shopName || 'Le vendeur'
    const orderNumber = formatOrderNumber(order)
    const products = namesOf(order.items || [])
    const tasks: Promise<unknown>[] = []

    if (order.user_id) {
        tasks.push(createNotification(
            order.user_id, 'order_confirmed',
            `${shop} a confirmé votre commande ✓`,
            `Paiement reçu pour ${products}. Le vendeur va vous contacter pour la livraison. Suivi : ${trackingNumber}`,
            BUYER_LINK, `${order.id}:confirmed:buyer`
        ))
    }
    if (order.customer_email) {
        tasks.push(sendBuyerVendorDecisionEmail(order.customer_email, {
            decision: 'confirmed',
            customerName: order.customer_name || '',
            orderNumber,
            vendor: { shopName: shop, whatsapp: v?.whatsapp, phone: v?.phone, pickupAddress: v?.pickupAddress },
            productNames: sellerIds.length > 1 ? products : namesOf(itemsOf(order, vendorId)),
            amount: sellerIds.length > 1 ? Object.values(order.vendor_payments || {}).reduce((s, e) => s + (e.amount || 0), 0) : amountOf(order, vendorId),
            transactionId: order.vendor_payments?.[vendorId]?.transaction_id || order.transaction_id,
            trackingNumber,
            deliveryMode: order.delivery_mode,
        }))
    }
    for (const sid of sellerIds) {
        const mine = namesOf(itemsOf(order, sid))
        const title = '✅ Commande confirmée — à préparer'
        const body = `${order.customer_name || 'Client'} · ${mine} · Contactez le client pour la livraison.`
        tasks.push(createNotification(sid, 'order_confirmed', title, body, VENDOR_LINK, `${order.id}:confirmed:${sid}`))
        tasks.push(sendPushToUsers([sid], title, body, VENDOR_LINK))
    }
    await Promise.allSettled(tasks)
}

async function notifyPartialConfirmation(order: OrderRow, vendorId: string) {
    const vendors = await fetchVendors([vendorId])
    const v = vendors.get(vendorId)
    const shop = v?.shopName || 'Un vendeur'
    const tasks: Promise<unknown>[] = []
    if (order.user_id) {
        tasks.push(createNotification(
            order.user_id, 'payment_confirmed_by_vendor',
            `${shop} a reçu votre paiement`,
            'Votre commande sera confirmée dès que les autres vendeurs du panier auront validé.',
            BUYER_LINK, `${order.id}:vendor_confirmed:${vendorId}`
        ))
    }
    if (order.customer_email) {
        tasks.push(sendBuyerVendorDecisionEmail(order.customer_email, {
            decision: 'partial',
            customerName: order.customer_name || '',
            orderNumber: formatOrderNumber(order),
            vendor: { shopName: shop, whatsapp: v?.whatsapp, phone: v?.phone, pickupAddress: v?.pickupAddress },
            productNames: namesOf(itemsOf(order, vendorId)),
            amount: amountOf(order, vendorId),
            transactionId: order.vendor_payments?.[vendorId]?.transaction_id,
            deliveryMode: order.delivery_mode,
        }))
    }
    tasks.push(createNotification(
        vendorId, 'payment_confirmed', 'Paiement confirmé',
        'Merci ! La commande sera confirmée dès que les autres vendeurs du panier auront validé leur paiement.',
        VENDOR_LINK, `${order.id}:self_confirmed:${vendorId}`
    ))
    await Promise.allSettled(tasks)
}

async function notifyRefusal(order: OrderRow, vendorId: string) {
    const sellerIds = sellerIdsOf(order)
    const vendors = await fetchVendors(sellerIds)
    const v = vendors.get(vendorId)
    const shop = v?.shopName || 'Le vendeur'
    const orderNumber = formatOrderNumber(order)
    const tasks: Promise<unknown>[] = []

    if (order.user_id) {
        tasks.push(createNotification(
            order.user_id, 'payment_disputed_by_vendor',
            `${shop} n'a pas reçu votre paiement`,
            `Votre commande ${orderNumber} est annulée. Si vous avez payé, contactez ${shop}${v?.whatsapp ? ` au ${v.whatsapp}` : ''} avec votre SMS de confirmation.`,
            BUYER_LINK, `${order.id}:vendor_disputed`
        ))
    }
    if (order.customer_email) {
        tasks.push(sendBuyerVendorDecisionEmail(order.customer_email, {
            decision: 'refused',
            customerName: order.customer_name || '',
            orderNumber,
            vendor: { shopName: shop, whatsapp: v?.whatsapp, phone: v?.phone, pickupAddress: null },
            productNames: namesOf(itemsOf(order, vendorId)),
            amount: amountOf(order, vendorId),
            transactionId: order.vendor_payments?.[vendorId]?.transaction_id || order.transaction_id,
            deliveryMode: order.delivery_mode,
        }))
    }
    tasks.push(createNotification(
        vendorId, 'order_rejected', 'Commande annulée',
        `Vous avez indiqué ne pas avoir reçu le paiement de ${order.customer_name || 'ce client'}. La commande est annulée et le client a été prévenu.`,
        VENDOR_LINK, `${order.id}:self_disputed:${vendorId}`
    ))

    for (const sid of sellerIds) {
        if (sid === vendorId) continue
        const other = vendors.get(sid)
        const alreadyConfirmed = !!order.vendor_payments?.[sid]?.vendor_confirmed
        tasks.push(createNotification(
            sid, 'order_rejected', 'Commande annulée',
            alreadyConfirmed
                ? `${shop} n'a pas reçu son paiement : la commande de ${order.customer_name || 'ce client'} est annulée. Remboursez le client pour la somme reçue.`
                : `${shop} n'a pas reçu son paiement : la commande de ${order.customer_name || 'ce client'} est annulée.`,
            VENDOR_LINK, `${order.id}:cancelled:${sid}`
        ))
        if (other?.email) {
            tasks.push(sendVendorOrderCancelledEmail(other.email, {
                shopName: other.shopName,
                orderNumber,
                customerName: order.customer_name || 'Client',
                refusingShop: shop,
                alreadyConfirmed,
                amount: amountOf(order, sid),
            }))
        }
    }
    await Promise.allSettled(tasks)
}
