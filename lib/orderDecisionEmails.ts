import { escapeHtml } from '@/lib/escapeHtml'

const SITE = 'https://www.mayombe-market.com'

export type VendorContact = {
    shopName: string
    whatsapp?: string | null
    phone?: string | null
    pickupAddress?: string | null
}

function waLink(raw?: string | null, text?: string): string | null {
    const d = (raw || '').replace(/\D/g, '')
    if (d.length < 9) return null
    const intl = d.startsWith('242') ? d : `242${d.replace(/^0?/, '0')}`
    return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

function fmtPhone(raw?: string | null): string | null {
    const d = (raw || '').replace(/\D/g, '').replace(/^242/, '')
    if (d.length !== 9) return raw ? raw : null
    return `+242 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`
}

function fcfa(n: number): string {
    return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}

const DELIVERY_LABEL: Record<string, string> = {
    express: 'Livraison express (3–6 h)',
    standard: 'Livraison standard (6–48 h)',
    inter_urban: 'Livraison inter-ville',
    vendor_delivery: 'Livraison par le vendeur',
    pickup: 'Retrait en boutique',
    reserve_pickup: 'Retrait en boutique (réservation)',
}

function layout(title: string, subtitle: string, accent: string, body: string): string {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f5f5f4;">
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.10);">
  <div style="background:#1c1917;padding:32px;text-align:center;">
    <div style="display:inline-block;border:1.5px solid #ca8a04;border-radius:10px;padding:5px 16px;margin-bottom:18px;">
      <span style="color:#ca8a04;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;">MAYOMBE MARKET</span>
    </div>
    <h1 style="color:${accent};margin:0;font-size:22px;font-weight:900;">${title}</h1>
    <p style="color:#a8a29e;margin:10px 0 0;font-size:13px;line-height:1.5;">${subtitle}</p>
  </div>
  <div style="padding:28px 28px 8px;">${body}</div>
  <div style="background:#1c1917;padding:20px 28px;text-align:center;">
    <p style="color:#a8a29e;font-size:11px;margin:0;">Mayombe Market · Brazzaville, République du Congo</p>
    <p style="color:#57534e;font-size:10px;margin:5px 0 0;">Le paiement est fait directement au vendeur. Mayombe Market met en relation acheteurs et vendeurs.</p>
  </div>
</div>
</body></html>`
}

function row(label: string, value: string): string {
    return `<tr>
      <td style="padding:9px 0;font-size:12px;color:#78716c;vertical-align:top;">${label}</td>
      <td style="padding:9px 0;font-size:13px;font-weight:700;color:#1c1917;text-align:right;">${value}</td>
    </tr>`
}

function box(inner: string, bg = '#fafaf9', border = '#e7e5e4'): string {
    return `<div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:16px 18px;margin-bottom:18px;">${inner}</div>`
}

function button(href: string, label: string, bg: string): string {
    return `<a href="${href}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:13px 22px;border-radius:12px;">${label}</a>`
}

function vendorBlock(v: VendorContact, orderNumber: string): string {
    const phone = fmtPhone(v.whatsapp || v.phone)
    const wa = waLink(v.whatsapp || v.phone, `Bonjour ${v.shopName}, je vous contacte au sujet de ma commande ${orderNumber} sur Mayombe Market.`)
    return box(`
      <p style="margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#a8a29e;">Votre vendeur</p>
      <p style="margin:0;font-size:16px;font-weight:900;color:#1c1917;">${escapeHtml(v.shopName)}</p>
      ${phone ? `<p style="margin:6px 0 0;font-size:13px;color:#44403c;">📞 ${escapeHtml(phone)}</p>` : ''}
      ${v.pickupAddress ? `<p style="margin:6px 0 0;font-size:13px;color:#44403c;">📍 ${escapeHtml(v.pickupAddress)}</p>` : ''}
      ${wa ? `<div style="margin-top:14px;">${button(wa, 'Écrire au vendeur sur WhatsApp', '#16a34a')}</div>` : ''}
    `)
}

export type BuyerDecisionEmailInput = {
    decision: 'confirmed' | 'refused' | 'partial'
    customerName: string
    orderNumber: string
    vendor: VendorContact
    productNames: string
    amount: number
    transactionId?: string | null
    trackingNumber?: string | null
    deliveryMode?: string | null
}

export function buildBuyerDecisionEmail(d: BuyerDecisionEmailInput): { subject: string; html: string } {
    const name = escapeHtml(d.customerName || 'client')
    const shop = escapeHtml(d.vendor.shopName)
    const delivery = d.deliveryMode ? DELIVERY_LABEL[d.deliveryMode] || '' : ''
    const details = box(`<table width="100%" style="border-collapse:collapse;">
      ${row('Commande', escapeHtml(d.orderNumber))}
      ${row('Produit(s)', escapeHtml(d.productNames))}
      ${row(d.decision === 'refused' ? 'Montant' : 'Montant payé au vendeur', fcfa(d.amount))}
      ${d.transactionId ? row('Code de transaction', `<span style="font-family:monospace;">${escapeHtml(d.transactionId)}</span>`) : ''}
      ${delivery ? row('Livraison', delivery) : ''}
      ${d.trackingNumber ? row('N° de suivi', `<span style="font-family:monospace;color:#1d4ed8;">${escapeHtml(d.trackingNumber)}</span>`) : ''}
    </table>`)
    const ordersLink = `${SITE}/account/dashboard?tab=orders`

    if (d.decision === 'confirmed') {
        return {
            subject: `${d.vendor.shopName} a confirmé votre commande ${d.orderNumber}`,
            html: layout(
                'Paiement reçu, commande confirmée ✓',
                `Bonjour ${name}, <strong style="color:#fafaf9;">${shop}</strong> a bien reçu votre paiement et prépare votre commande.`,
                '#4ade80',
                `${details}
                ${vendorBlock(d.vendor, d.orderNumber)}
                ${box(`<p style="margin:0;font-size:13px;color:#14532d;line-height:1.6;"><strong>Et maintenant ?</strong> Le vendeur va vous contacter au numéro que vous avez indiqué pour organiser ${d.deliveryMode === 'pickup' || d.deliveryMode === 'reserve_pickup' ? 'le retrait' : 'la livraison'}. Gardez votre téléphone à proximité.</p>`, '#f0fdf4', '#bbf7d0')}
                <div style="text-align:center;margin:6px 0 22px;">${button(ordersLink, 'Suivre ma commande', '#1c1917')}</div>`
            ),
        }
    }

    if (d.decision === 'partial') {
        return {
            subject: `${d.vendor.shopName} a confirmé votre paiement — commande ${d.orderNumber}`,
            html: layout(
                'Paiement reçu par un vendeur',
                `Bonjour ${name}, <strong style="color:#fafaf9;">${shop}</strong> a confirmé la réception de votre paiement. Votre commande contient des articles d'autres vendeurs : elle sera confirmée dès qu'ils auront tous validé.`,
                '#fbbf24',
                `${details}
                ${vendorBlock(d.vendor, d.orderNumber)}
                <div style="text-align:center;margin:6px 0 22px;">${button(ordersLink, 'Voir ma commande', '#1c1917')}</div>`
            ),
        }
    }

    return {
        subject: `Paiement non reçu — commande ${d.orderNumber} annulée`,
        html: layout(
            'Votre paiement n\'a pas été reçu',
            `Bonjour ${name}, <strong style="color:#fafaf9;">${shop}</strong> indique ne pas avoir reçu votre paiement. Votre commande a donc été annulée.`,
            '#f87171',
            `${details}
            ${box(`<p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#7f1d1d;">Vous avez bien payé ?</p>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#7f1d1d;line-height:1.7;">
                <li>Vérifiez dans le SMS de votre opérateur le <strong>code de transaction</strong> et le <strong>numéro destinataire</strong>.</li>
                <li>Contactez le vendeur avec votre SMS de confirmation : il pourra vérifier de son côté.</li>
                <li>Si l'argent a été envoyé par erreur, demandez le remboursement au vendeur.</li>
              </ul>`, '#fef2f2', '#fecaca')}
            ${vendorBlock(d.vendor, d.orderNumber)}
            <div style="text-align:center;margin:6px 0 22px;">${button(`${SITE}/marketplace`, 'Retourner sur la marketplace', '#1c1917')}</div>`
        ),
    }
}

export type VendorNewOrderEmailInput = {
    shopName: string
    orderNumber: string
    customerName: string
    city?: string | null
    district?: string | null
    productNames: string
    amount: number
    method: string
    transactionId?: string | null
    receivingNumber?: string | null
    deliveryMode?: string | null
}

const METHOD: Record<string, string> = { mobile_money: 'MTN MoMo', airtel_money: 'Airtel Money', cash: 'Paiement à la livraison' }

export function buildVendorNewOrderEmail(d: VendorNewOrderEmailInput): { subject: string; html: string } {
    const isMomo = d.method === 'mobile_money' || d.method === 'airtel_money'
    const where = [d.district, d.city].filter(Boolean).join(', ')
    const delivery = d.deliveryMode ? DELIVERY_LABEL[d.deliveryMode] || '' : ''
    const link = `${SITE}/vendor/dashboard?tab=orders`
    return {
        subject: isMomo
            ? `💳 Nouvelle commande ${d.orderNumber} — vérifiez le paiement de ${fcfa(d.amount)}`
            : `🛍️ Nouvelle commande ${d.orderNumber} — ${fcfa(d.amount)}`,
        html: layout(
            'Nouvelle commande 🛍️',
            `Bonjour ${escapeHtml(d.shopName)}, <strong style="color:#fafaf9;">${escapeHtml(d.customerName)}</strong> vient de commander dans votre boutique.`,
            '#fbbf24',
            `${box(`<table width="100%" style="border-collapse:collapse;">
              ${row('Commande', escapeHtml(d.orderNumber))}
              ${row('Produit(s)', escapeHtml(d.productNames))}
              ${row('Montant', `<span style="color:#ca8a04;font-size:16px;">${fcfa(d.amount)}</span>`)}
              ${row('Paiement', METHOD[d.method] || escapeHtml(d.method))}
              ${d.receivingNumber ? row('Sur votre numéro', escapeHtml(d.receivingNumber)) : ''}
              ${d.transactionId ? row('Code saisi par le client', `<span style="font-family:monospace;font-size:15px;letter-spacing:2px;">${escapeHtml(d.transactionId)}</span>`) : ''}
              ${where ? row('Client à', escapeHtml(where)) : ''}
              ${delivery ? row('Livraison', delivery) : ''}
            </table>`)}
            ${isMomo
                ? box(`<p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#78350f;">Action requise : vérifiez votre compte ${METHOD[d.method]}</p>
                  <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">Si vous avez bien reçu <strong>${fcfa(d.amount)}</strong> avec ce code, cliquez sur <strong>« Paiement reçu »</strong> : la commande est confirmée et le client est prévenu. Sinon, cliquez sur <strong>« Paiement non reçu »</strong> : la commande est annulée.</p>`, '#fffbeb', '#fde68a')
                : ''}
            <div style="text-align:center;margin:6px 0 22px;">${button(link, isMomo ? 'Vérifier et confirmer' : 'Voir la commande', '#ea580c')}</div>`
        ),
    }
}

export type VendorCancelledEmailInput = {
    shopName: string
    orderNumber: string
    customerName: string
    refusingShop: string
    alreadyConfirmed: boolean
    amount: number
}

export function buildVendorCancelledEmail(d: VendorCancelledEmailInput): { subject: string; html: string } {
    return {
        subject: `Commande ${d.orderNumber} annulée`,
        html: layout(
            'Commande annulée',
            `Bonjour ${escapeHtml(d.shopName)}, la commande ${escapeHtml(d.orderNumber)} de ${escapeHtml(d.customerName)} a été annulée : un autre vendeur du même panier (${escapeHtml(d.refusingShop)}) n'a pas reçu son paiement.`,
            '#f87171',
            `${d.alreadyConfirmed
                ? box(`<p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">Vous aviez confirmé avoir reçu <strong>${fcfa(d.amount)}</strong>. Contactez le client pour lui <strong>rembourser</strong> cette somme ou convenir d'une nouvelle commande.</p>`, '#fef2f2', '#fecaca')
                : box(`<p style="margin:0;font-size:13px;color:#44403c;line-height:1.6;">Aucune action n'est nécessaire de votre côté. Le stock de vos produits a été remis en vente.</p>`)}
            <div style="text-align:center;margin:6px 0 22px;">${button(`${SITE}/vendor/dashboard?tab=orders`, 'Voir mes commandes', '#1c1917')}</div>`
        ),
    }
}

export type VendorReminderEmailInput = {
    vendorName: string
    shopName: string
    orderNumber: string
    customerName: string
    productNames: string
    amount: number
    method: string
    delayLabel: string
    transactionId?: string | null
}

export function buildVendorReminderEmail(d: VendorReminderEmailInput): { subject: string; html: string } {
    const isMomo = d.method === 'mobile_money' || d.method === 'airtel_money'
    return {
        subject: `⏰ Commande ${d.orderNumber} en attente depuis ${d.delayLabel}`,
        html: layout(
            'Une commande attend votre réponse',
            `Bonjour ${escapeHtml(d.vendorName)}, la commande de <strong style="color:#fafaf9;">${escapeHtml(d.customerName)}</strong> attend votre réponse depuis <strong style="color:#fbbf24;">${escapeHtml(d.delayLabel)}</strong>.`,
            '#fbbf24',
            `${box(`<table width="100%" style="border-collapse:collapse;">
              ${row('Boutique', escapeHtml(d.shopName))}
              ${row('Commande', escapeHtml(d.orderNumber))}
              ${row('Produit(s)', escapeHtml(d.productNames))}
              ${row('Montant', `<span style="color:#ca8a04;font-size:16px;">${fcfa(d.amount)}</span>`)}
              ${row('Paiement', METHOD[d.method] || escapeHtml(d.method))}
              ${d.transactionId ? row('Code saisi par le client', `<span style="font-family:monospace;letter-spacing:2px;">${escapeHtml(d.transactionId)}</span>`) : ''}
            </table>`)}
            ${box(`<p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">${isMomo
                ? `Vérifiez sur votre téléphone si vous avez reçu <strong>${fcfa(d.amount)}</strong>, puis cliquez sur <strong>« Paiement reçu »</strong> ou <strong>« Paiement non reçu »</strong>.`
                : 'Acceptez ou refusez la commande pour que le client sache à quoi s’attendre.'} Un client sans réponse risque d’annuler et de commander ailleurs.</p>`, '#fffbeb', '#fde68a')}
            <div style="text-align:center;margin:6px 0 22px;">${button(`${SITE}/vendor/dashboard?tab=orders`, 'Répondre maintenant', '#ea580c')}</div>`
        ),
    }
}
