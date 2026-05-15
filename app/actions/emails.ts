'use server'

import { resend, FROM_EMAIL } from '@/lib/resend'
import { escapeHtml } from '@/lib/escapeHtml'

interface OrderItem {
    name: string
    price: number
    quantity: number
}

interface OrderEmailData {
    customerName: string
    customerEmail: string
    orderId: string
    items: OrderItem[]
    total: number
    paymentMethod: string
    city: string
    district: string
    deliveryMode?: string
    deliveryFee?: number
}

// Email de confirmation de commande (envoyé à l'acheteur)
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
    const safeName = escapeHtml(data.customerName)
    const safeCity = escapeHtml(data.city)
    const safeDistrict = escapeHtml(data.district)

    const paymentLabel = data.paymentMethod === 'cash' ? 'Paiement à la livraison' : 'Mobile Money (MTN MoMo)'
    const deliveryModeLabel = data.deliveryMode === 'express'
        ? 'Express · 3-6H'
        : data.deliveryMode === 'inter_urban'
            ? 'Inter-ville'
            : data.deliveryMode === 'standard'
                ? 'Standard · 6-48H'
                : ''
    const deliveryFee = data.deliveryFee ?? 0
    const subtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0)

    const itemsHtml = data.items
        .map(item => `
            <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #f5f5f4;font-size:13px;color:#1c1917;">${escapeHtml(item.name)}</td>
                <td style="padding:14px 16px;border-bottom:1px solid #f5f5f4;text-align:center;font-size:13px;color:#78716c;">×${item.quantity}</td>
                <td style="padding:14px 16px;border-bottom:1px solid #f5f5f4;text-align:right;font-weight:700;font-size:13px;color:#1c1917;">${(item.price * item.quantity).toLocaleString('fr-FR')} FCFA</td>
            </tr>
        `)
        .join('')

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: data.customerEmail,
            subject: `Commande confirmée — Mayombe Market`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f5f5f4;">
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <div style="background:#1c1917;padding:36px 32px;text-align:center;">
    <div style="display:inline-block;border:1.5px solid #ca8a04;border-radius:10px;padding:5px 16px;margin-bottom:20px;">
      <span style="color:#ca8a04;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;">MAYOMBE MARKET</span>
    </div>
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Commande confirmée</h1>
    <p style="color:#a8a29e;margin:10px 0 0;font-size:12px;">Merci ${safeName} — votre commande a bien été enregistrée</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px;">

    <!-- ORDER ID -->
    <table width="100%" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;margin-bottom:24px;"><tr>
      <td style="padding:12px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#78716c;">Commande</td>
      <td style="padding:12px 16px;text-align:right;font-size:11px;font-weight:800;color:#1c1917;font-family:monospace;">#${data.orderId.slice(-8).toUpperCase()}</td>
    </tr></table>

    <!-- PRODUCTS TABLE -->
    <p style="color:#78716c;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Produits commandés</p>
    <table width="100%" style="border-collapse:collapse;border:1px solid #f5f5f4;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <thead><tr style="background:#fafaf9;">
        <th style="padding:11px 16px;text-align:left;font-size:9px;text-transform:uppercase;color:#a8a29e;font-weight:700;letter-spacing:1.5px;">Produit</th>
        <th style="padding:11px 16px;text-align:center;font-size:9px;text-transform:uppercase;color:#a8a29e;font-weight:700;letter-spacing:1.5px;">Qté</th>
        <th style="padding:11px 16px;text-align:right;font-size:9px;text-transform:uppercase;color:#a8a29e;font-weight:700;letter-spacing:1.5px;">Prix</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <!-- TOTALS -->
    <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;padding:18px;margin-bottom:22px;">
      <table width="100%">
        <tr><td style="padding-bottom:10px;font-size:13px;color:#78716c;">Sous-total produits</td>
            <td style="padding-bottom:10px;text-align:right;font-size:13px;font-weight:700;color:#1c1917;">${subtotal.toLocaleString('fr-FR')} FCFA</td></tr>
        ${deliveryFee > 0 ? `
        <tr><td style="padding-bottom:10px;font-size:13px;color:#78716c;">Livraison${deliveryModeLabel ? ` · ${deliveryModeLabel}` : ''}</td>
            <td style="padding-bottom:10px;text-align:right;font-size:13px;font-weight:700;color:#1c1917;">+${deliveryFee.toLocaleString('fr-FR')} FCFA</td></tr>
        ` : ''}
        <tr style="border-top:1px solid #e7e5e4;">
          <td style="padding-top:12px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#1c1917;">Total payé</td>
          <td style="padding-top:12px;text-align:right;font-size:22px;font-weight:900;color:#ca8a04;">${data.total.toLocaleString('fr-FR')} FCFA</td>
        </tr>
      </table>
    </div>

    <!-- DELIVERY + PAYMENT INFO -->
    <table width="100%" style="margin-bottom:22px;"><tr>
      <td width="49%" style="vertical-align:top;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:16px;">
        <p style="color:#a8a29e;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Livraison</p>
        <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0;">${safeCity}, ${safeDistrict}</p>
        ${deliveryModeLabel ? `<p style="color:#78716c;font-size:11px;margin:4px 0 0;">${deliveryModeLabel}</p>` : ''}
      </td>
      <td width="2%"></td>
      <td width="49%" style="vertical-align:top;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:16px;">
        <p style="color:#a8a29e;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Paiement</p>
        <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0;">${paymentLabel}</p>
      </td>
    </tr></table>

    <!-- NEXT STEPS -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;">
      <p style="color:#92400e;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">Prochaines étapes</p>
      <p style="color:#78350f;font-size:13px;margin:0;line-height:1.6;">Votre commande est prise en charge. Vous serez notifié par email à chaque mise à jour de statut.</p>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#1c1917;padding:22px 32px;text-align:center;">
    <p style="color:#a8a29e;font-size:11px;margin:0;">© Mayombe Market · contact@mayombe-market.com</p>
    <p style="color:#57534e;font-size:10px;margin:5px 0 0;">Brazzaville, République du Congo</p>
  </div>

</div>
</body></html>`,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email confirmation:', error)
        return { error: 'Erreur envoi email' }
    }
}

// Email de mise à jour de statut (envoyé à l'acheteur)
export async function sendOrderStatusEmail(
    customerEmail: string,
    customerName: string,
    orderId: string,
    newStatus: string,
    trackingNumber?: string,
    deliveryMode?: string,
    productNames?: string
) {
    const statusLabels: Record<string, { label: string; color: string; message: string }> = {
        confirmed: {
            label: 'Confirmée',
            color: '#22c55e',
            message: 'Votre commande a été confirmée et est en cours de préparation.',
        },
        shipped: {
            label: 'Expédiée',
            color: '#3b82f6',
            message: 'Votre commande est en route vers vous !',
        },
        delivered: {
            label: 'Livrée',
            color: '#10b981',
            message: 'Votre commande a été livrée. Merci pour votre achat !',
        },
        rejected: {
            label: 'Annulée',
            color: '#ef4444',
            message: 'Votre commande a été annulée. Contactez-nous pour plus d\'informations.',
        },
    }

    const status = statusLabels[newStatus]
    if (!status) return { error: 'Statut inconnu' }

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Commande ${status.label} — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: ${status.color}20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px; color: ${status.color};">●</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${escapeHtml(customerName)}</h2>
                        <p style="color: #64748b; font-size: 14px;">${status.message}</p>

                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0; display: inline-block;">
                            <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Statut</span><br/>
                            <span style="font-size: 18px; font-weight: bold; color: ${status.color};">${status.label}</span>
                        </div>

                        ${trackingNumber ? `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; margin: 16px 0;">
                            <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Numéro de suivi</span><br/>
                            <span style="font-size: 18px; font-weight: bold; color: #1e40af; letter-spacing: 2px;">${escapeHtml(trackingNumber)}</span>
                        </div>
                        ` : ''}

                        ${productNames ? `
                        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
                            <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Produit(s)</span><br/>
                            <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(productNames)}</span>
                        </div>
                        ` : ''}

                        ${deliveryMode ? `
                        <div style="background: ${deliveryMode === 'express' ? '#fff7ed' : '#f0fdf4'}; border: 1px solid ${deliveryMode === 'express' ? '#fed7aa' : '#bbf7d0'}; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
                            <span style="font-weight: bold; font-size: 14px; color: ${deliveryMode === 'express' ? '#ea580c' : '#16a34a'};">
                                ${deliveryMode === 'express' ? '⚡ Livraison Express (3-6H)' : '📦 Livraison Standard (6-48H)'}
                            </span>
                        </div>
                        ` : ''}
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error)
        console.error('[sendOrderStatusEmail] Resend:', detail)
        return { error: `Erreur envoi email: ${detail}` }
    }
}

/** Email envoyé aux vendeurs lorsqu’un admin rejette une commande en attente (Resend) */
export async function sendOrderRejectedVendorEmail(vendorEmail: string) {
    const subject = 'Mise à jour concernant votre commande sur Mayombe Market.'
    const bodyText =
        'Bonjour, nous vous informons que les conditions ne sont pas réunies pour l\'heure pour confirmer cette commande. Veuillez retenter une fois que tout est prêt.'

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: vendorEmail,
            subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="color: #0f172a; font-size: 15px; line-height: 1.6; margin: 0;">
                            ${escapeHtml(bodyText)}
                        </p>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error)
        console.error('[sendOrderRejectedVendorEmail] Resend:', detail, { to: vendorEmail })
        return { error: `Erreur envoi email: ${detail}` }
    }
}

// Email de nouvelle offre de négociation (envoyé au vendeur)
export async function sendNegotiationOfferEmail(
    sellerEmail: string,
    sellerName: string,
    buyerName: string,
    productName: string,
    initialPrice: number,
    proposedPrice: number
) {
    const discount = Math.round((1 - proposedPrice / initialPrice) * 100)

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: sellerEmail,
            subject: `Nouvelle offre de marchandage — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #f9731620; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">🤝</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${escapeHtml(sellerName)}</h2>
                        <p style="color: #64748b; font-size: 14px;">Un client souhaite négocier le prix d'un de vos produits.</p>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
                            <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; margin: 0 0 8px 0;">Produit</p>
                            <p style="font-size: 16px; font-weight: bold; color: #0f172a; margin: 0;">${escapeHtml(productName)}</p>
                        </div>

                        <div style="display: flex; gap: 16px; margin: 20px 0;">
                            <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 12px;">
                                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px 0;">Prix initial</p>
                                <p style="font-size: 18px; font-weight: bold; color: #64748b; text-decoration: line-through; margin: 0;">${initialPrice.toLocaleString('fr-FR')} F</p>
                            </div>
                            <div style="flex: 1; background: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 12px;">
                                <p style="font-size: 11px; color: #ea580c; text-transform: uppercase; margin: 0 0 4px 0;">Offre proposée (-${discount}%)</p>
                                <p style="font-size: 18px; font-weight: bold; color: #ea580c; margin: 0;">${proposedPrice.toLocaleString('fr-FR')} F</p>
                            </div>
                        </div>

                        <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">De la part de <strong>${escapeHtml(buyerName)}</strong></p>

                        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Connectez-vous à votre dashboard vendeur pour accepter ou refuser cette offre.</p>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email négociation offre:', error)
        return { error: 'Erreur envoi email' }
    }
}

// Email de notification pickup (colis récupéré, en route)
export async function sendPickupNotificationEmail(
    clientEmail: string,
    clientName: string,
    productName: string,
    logisticianName: string
) {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: clientEmail,
            subject: `Votre colis est en route ! — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #3b82f620; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">🏍️</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${escapeHtml(clientName)}</h2>
                        <p style="color: #64748b; font-size: 14px;">Votre colis "<strong>${escapeHtml(productName)}</strong>" a été récupéré chez le vendeur et est maintenant en route vers vous !</p>

                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; margin: 24px 0;">
                            <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Livreur</span><br/>
                            <span style="font-size: 16px; font-weight: bold; color: #1e40af;">${escapeHtml(logisticianName)}</span>
                        </div>

                        <p style="color: #64748b; font-size: 13px;">Vous serez notifié dès que le livreur arrivera chez vous.</p>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email pickup:', error)
        return { error: 'Erreur envoi email' }
    }
}

// Email de demande de confirmation de réception + notation
export async function sendDeliveryConfirmationRequestEmail(
    clientEmail: string,
    clientName: string,
    orderId: string,
    productName: string
) {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: clientEmail,
            subject: `Colis livré — Confirmez la réception ! — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #22c55e20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">📦</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${escapeHtml(clientName)}</h2>
                        <p style="color: #64748b; font-size: 14px;">Votre colis "<strong>${escapeHtml(productName)}</strong>" a été livré !</p>

                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 24px 0;">
                            <p style="color: #166534; font-weight: bold; font-size: 14px; margin: 0 0 8px 0;">Confirmez la réception</p>
                            <p style="color: #15803d; font-size: 13px; margin: 0;">Connectez-vous à votre dashboard pour confirmer que vous avez bien reçu votre colis et noter votre expérience.</p>
                        </div>

                        <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 14px; border-radius: 12px; margin: 16px 0;">
                            <p style="color: #ea580c; font-size: 12px; margin: 0;">⭐ Gagnez <strong>500 points de fidélité</strong> en notant votre expérience !</p>
                            <p style="color: #c2410c; font-size: 11px; margin: 4px 0 0 0;">1 000 points = 2 000 F de réduction</p>
                        </div>

                        <p style="color: #94a3b8; font-size: 11px; margin-top: 16px;">Sans réponse de votre part, la livraison sera auto-confirmée sous 24h.</p>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email confirmation réception:', error)
        return { error: 'Erreur envoi email' }
    }
}

// Email de confirmation d'abonnement vendeur
export async function sendSubscriptionConfirmationEmail(
    vendorEmail: string,
    vendorName: string,
    planName: string,
    planPrice: number,
    features: string[]
) {
    const featuresHtml = features
        .map(f => `<div style="display: flex; align-items: center; gap: 10px; padding: 8px 0;">
            <span style="width: 22px; height: 22px; border-radius: 8px; background: rgba(34,197,94,0.15); color: #22C55E; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">✓</span>
            <span style="color: #64748b; font-size: 13px;">${escapeHtml(f)}</span>
        </div>`)
        .join('')

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: vendorEmail,
            subject: `Plan ${planName} activé ! — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 22px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 36px;">🚀</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px; font-size: 22px;">Félicitations ${escapeHtml(vendorName)} !</h2>
                        <p style="color: #64748b; font-size: 15px; margin-bottom: 4px;">Votre plan <strong style="color: #f97316;">${escapeHtml(planName)}</strong> est maintenant actif.</p>
                        <p style="color: #94a3b8; font-size: 13px;">Paiement de ${planPrice.toLocaleString('fr-FR')} FCFA confirmé.</p>

                        <div style="background: #f8fafc; padding: 24px; border-radius: 16px; margin: 28px 0; text-align: left;">
                            <p style="font-size: 11px; color: #f97316; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">Vos avantages</p>
                            ${featuresHtml}
                        </div>

                        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">Connectez-vous à votre dashboard pour profiter de vos nouveaux avantages.</p>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email confirmation abonnement:', error)
        return { error: 'Erreur envoi email' }
    }
}

// Email de notification au vendeur quand commande livrée
export async function sendVendorDeliveryNotificationEmail(
    vendorEmail: string,
    vendorName: string,
    productName: string,
    vendorPayout: number,
    customerCity: string
) {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: vendorEmail,
            subject: `Commande livrée avec succès ! — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #22c55e20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">✅</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${escapeHtml(vendorName)}</h2>
                        <p style="color: #64748b; font-size: 14px;">Votre produit "<strong>${escapeHtml(productName)}</strong>" a été livré avec succès au client à ${escapeHtml(customerCity)} !</p>

                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 24px 0;">
                            <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; margin: 0 0 8px 0;">Votre revenu</p>
                            <p style="font-size: 24px; font-weight: bold; color: #22c55e; margin: 0;">${vendorPayout.toLocaleString('fr-FR')} FCFA</p>
                            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Les fonds seront libérés sous 48h.</p>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email vendeur livraison:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─────────────────────────────────────────────────────────
// Email de demande d'avis hôtelier (envoyé au client à la sortie)
// ─────────────────────────────────────────────────────────
export async function sendHotelReviewRequestEmail({
    guestEmail,
    guestName,
    hotelName,
    productName,
    reviewUrl,
}: {
    guestEmail: string
    guestName: string
    hotelName: string
    productName: string
    reviewUrl: string
}) {
    const safeGuest   = escapeHtml(guestName)
    const safeHotel   = escapeHtml(hotelName)
    const safeProduct = escapeHtml(productName)

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: guestEmail,
            subject: `Votre avis compte — ${safeHotel}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

                    <!-- Header -->
                    <div style="background: #08080E; padding: 30px; text-align: center; border-radius: 0 0 0 0;">
                        <h1 style="color: #F59E0B; margin: 0; font-size: 22px; font-style: italic; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">
                            Mayombe Market
                        </h1>
                        <p style="color: #888; font-size: 12px; margin: 6px 0 0 0;">Plateforme hôtelière au Congo-Brazzaville</p>
                    </div>

                    <!-- Corps -->
                    <div style="padding: 36px 30px; text-align: center;">
                        <div style="width: 70px; height: 70px; background: rgba(245,158,11,0.12); border-radius: 22px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
                            🏨
                        </div>

                        <h2 style="color: #0f172a; margin: 0 0 10px; font-size: 22px;">
                            Merci de votre séjour, ${safeGuest} !
                        </h2>
                        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
                            Vous avez récemment séjourné à <strong style="color: #F59E0B;">${safeHotel}</strong>
                            (${safeProduct}).
                        </p>
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 32px;">
                            Votre expérience nous aide à améliorer nos services et guide d'autres voyageurs.
                            <br/>Cela ne prend que 30 secondes !
                        </p>

                        <!-- CTA -->
                        <a href="${reviewUrl}"
                           style="display: inline-block; padding: 18px 48px; border-radius: 14px;
                                  background: linear-gradient(135deg, #F59E0B, #D97706);
                                  color: #ffffff; font-size: 16px; font-weight: 800;
                                  text-decoration: none; letter-spacing: 0.3px;
                                  box-shadow: 0 6px 24px rgba(245,158,11,0.35);">
                            ⭐ Laisser mon avis
                        </a>

                        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
                            Ce lien est valable 30 jours et ne peut être utilisé qu'une seule fois.
                        </p>
                    </div>

                    <!-- Note étoiles déco -->
                    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <div style="font-size: 22px; letter-spacing: 4px; margin-bottom: 6px;">★★★★★</div>
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                            Mayombe Market — contact@mayombe-market.com
                        </p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('[sendHotelReviewRequestEmail] error:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : demande de retour/litige (envoyé à l'admin) ──────────────────
export async function sendRetourRequestEmail({
    name,
    email,
    phone,
    orderRef,
    motif,
    description,
    images,
}: {
    name: string
    email: string
    phone?: string
    orderRef?: string
    motif: string
    description?: string
    images?: string[]
}) {
    const safeName  = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeMotif = escapeHtml(motif)
    const safeDesc  = description ? escapeHtml(description) : null
    const safePhone = phone ? escapeHtml(phone) : null
    const safeRef   = orderRef ? escapeHtml(orderRef) : null

    const imagesHtml = images && images.length > 0
        ? images.map((u, i) => `<a href="${u}" target="_blank"><img src="${u}" alt="Photo ${i+1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin:4px;" /></a>`).join('')
        : ''

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: 'contact@mayombe-market.com',
            replyTo: email,
            subject: `[Retour/Litige] ${safeName} — ${safeMotif}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 24px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 20px; font-style: italic; text-transform: uppercase;">Mayombe Market — Nouvelle réclamation</h1>
                    </div>
                    <div style="padding: 24px; space-y: 16px;">
                        <table style="width:100%; border-collapse:collapse; font-size:14px;">
                            <tr><td style="padding:8px 0; color:#64748b; width:140px;">Nom</td><td style="padding:8px 0; font-weight:bold;">${safeName}</td></tr>
                            <tr><td style="padding:8px 0; color:#64748b;">Email</td><td style="padding:8px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
                            ${safePhone ? `<tr><td style="padding:8px 0; color:#64748b;">Téléphone</td><td style="padding:8px 0;">${safePhone}</td></tr>` : ''}
                            ${safeRef ? `<tr><td style="padding:8px 0; color:#64748b;">N° commande</td><td style="padding:8px 0; font-family:monospace; background:#f8fafc; padding:4px 8px; border-radius:4px;">${safeRef}</td></tr>` : ''}
                            <tr><td style="padding:8px 0; color:#64748b;">Motif</td><td style="padding:8px 0; color:#f97316; font-weight:bold;">${safeMotif}</td></tr>
                        </table>
                        ${safeDesc ? `<div style="margin-top:16px; background:#f8fafc; padding:16px; border-radius:8px; border-left:3px solid #f97316;"><p style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin:0 0 8px;">Description</p><p style="font-size:14px;color:#334155;margin:0;line-height:1.6;">${safeDesc}</p></div>` : ''}
                        ${imagesHtml ? `<div style="margin-top:16px;"><p style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin:0 0 8px;">Photos jointes</p><div>${imagesHtml}</div></div>` : ''}
                    </div>
                    <div style="background:#f8fafc; padding:16px; text-align:center;">
                        <p style="color:#94a3b8; font-size:11px; margin:0;">Répondre directement à cet email pour contacter le client.</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email retour:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : accusé de réception (envoyé au client) ───────────────────────
export async function sendRetourAckEmail({
    name,
    email,
    motif,
}: {
    name: string
    email: string
    motif: string
}) {
    const safeName  = escapeHtml(name)
    const safeMotif = escapeHtml(motif)
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `Réclamation reçue — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>
                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #f9731620; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 28px;">📬</span></div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${safeName},</h2>
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Nous avons bien reçu votre réclamation concernant :<br/><strong style="color:#f97316;">${safeMotif}</strong></p>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:16px; border-radius:12px; margin:24px 0;">
                            <p style="color:#166534; font-size:14px; margin:0;">Notre équipe examinera votre dossier et vous recontactera <strong>sous 24 à 48 heures</strong> par email ou téléphone.</p>
                        </div>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email accusé:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : litige accepté (envoyé à l'acheteur) ─────────────────────────
export async function sendDisputeAcceptedEmail({
    buyerEmail,
    buyerName,
    note,
}: {
    buyerEmail: string
    buyerName: string
    note?: string
}) {
    const safeName = escapeHtml(buyerName)
    const safeNote = note ? escapeHtml(note) : null

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: buyerEmail,
            subject: `Votre réclamation a été acceptée — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #22c55e20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">✅</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonne nouvelle, ${safeName} !</h2>
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                            Votre réclamation a été <strong style="color: #22c55e;">acceptée</strong> par notre équipe.<br/>
                            Nous allons vous contacter dans les prochaines <strong>24 heures</strong> pour traiter votre dossier.
                        </p>

                        ${safeNote ? `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin: 24px 0; text-align: left;">
                            <p style="font-size: 11px; color: #16a34a; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0;">Message de notre équipe</p>
                            <p style="color: #15803d; font-size: 14px; margin: 0; line-height: 1.5;">${safeNote}</p>
                        </div>
                        ` : ''}

                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0;">
                            <p style="color: #64748b; font-size: 13px; margin: 0;">
                                Pensez à garder votre téléphone accessible.<br/>
                                Notre équipe vous contactera par téléphone ou email.
                            </p>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email litige accepté:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : litige rejeté (envoyé à l'acheteur) ──────────────────────────
export async function sendDisputeRejectedEmail({
    buyerEmail,
    buyerName,
    note,
}: {
    buyerEmail: string
    buyerName: string
    note?: string
}) {
    const safeName = escapeHtml(buyerName)
    const safeNote = note ? escapeHtml(note) : null

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: buyerEmail,
            subject: `Réponse concernant votre réclamation — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: #ef444420; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">ℹ️</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${safeName},</h2>
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                            Après examen de votre dossier, notre équipe n'a pas pu donner suite à votre réclamation.
                        </p>

                        ${safeNote ? `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; margin: 24px 0; text-align: left;">
                            <p style="font-size: 11px; color: #dc2626; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0;">Raison</p>
                            <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.5;">${safeNote}</p>
                        </div>
                        ` : ''}

                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0;">
                            <p style="color: #64748b; font-size: 13px; margin: 0;">
                                Si vous pensez qu'il y a une erreur, n'hésitez pas à nous contacter<br/>
                                à l'adresse <strong>contact@mayombe-market.com</strong>.
                            </p>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email litige rejeté:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : vendeur approuvé par l'admin ─────────────────────────────────
export async function sendVendorApprovedEmail(
    vendorEmail: string,
    vendorName: string,
    shopName: string,
    vendorType: string
) {
    const typeConfig: Record<string, { emoji: string; label: string; color: string; bg: string; border: string; tip: string }> = {
        patisserie: {
            emoji: '🎂',
            label: 'Pâtisserie',
            color: '#f43f5e',
            bg: '#fff1f2',
            border: '#fecdd3',
            tip: 'Publiez vos gâteaux, pâtisseries et créations sucrées pour attirer vos premiers clients !',
        },
        restaurant: {
            emoji: '🍽️',
            label: 'Restaurant',
            color: '#f59e0b',
            bg: '#fffbeb',
            border: '#fde68a',
            tip: 'Ajoutez vos plats du jour, menus et spécialités congolaises sur votre page restaurant.',
        },
        immobilier: {
            emoji: '🏠',
            label: 'Immobilier',
            color: '#3b82f6',
            bg: '#eff6ff',
            border: '#bfdbfe',
            tip: 'Publiez vos biens immobiliers et atteignez des milliers d\'acheteurs au Congo.',
        },
        hotel: {
            emoji: '🏨',
            label: 'Hôtellerie',
            color: '#a855f7',
            bg: '#faf5ff',
            border: '#e9d5ff',
            tip: 'Mettez en ligne vos chambres et suites pour accueillir vos premiers voyageurs.',
        },
        marketplace: {
            emoji: '🛍️',
            label: 'Marketplace',
            color: '#f97316',
            bg: '#fff7ed',
            border: '#fed7aa',
            tip: 'Publiez vos produits sur la marketplace pour toucher tous les clients de Mayombe.',
        },
    }

    const cfg = typeConfig[vendorType] ?? typeConfig['marketplace']
    const safeName = escapeHtml(vendorName)
    const safeShop = escapeHtml(shopName)

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: vendorEmail,
            subject: `Votre boutique "${safeShop}" est vérifiée ! — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <!-- Header -->
                    <div style="background: #08080E; padding: 30px; text-align: center;">
                        <h1 style="color: ${cfg.color}; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase; letter-spacing: 1px;">Mayombe Market</h1>
                        <p style="color: #888; font-size: 12px; margin: 6px 0 0 0;">${cfg.emoji} Espace ${cfg.label}</p>
                    </div>

                    <!-- Corps -->
                    <div style="padding: 36px 30px; text-align: center;">
                        <div style="width: 80px; height: 80px; background: ${cfg.bg}; border: 2px solid ${cfg.border}; border-radius: 24px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
                            ${cfg.emoji}
                        </div>

                        <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 22px;">
                            Félicitations, ${safeName} !
                        </h2>
                        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 6px;">
                            Votre boutique <strong style="color: ${cfg.color};">${safeShop}</strong> a été vérifiée par notre équipe.
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin: 0 0 32px;">
                            Vous pouvez désormais publier vos produits et recevoir des commandes.
                        </p>

                        <!-- Badge vérifié -->
                        <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50px; padding: 8px 20px; margin-bottom: 28px;">
                            <span style="color: #16a34a; font-weight: bold; font-size: 14px;">✓ Compte vérifié</span>
                        </div>

                        <!-- Conseil type -->
                        <div style="background: ${cfg.bg}; border: 1px solid ${cfg.border}; padding: 18px 20px; border-radius: 14px; margin: 0 0 28px; text-align: left;">
                            <p style="font-size: 11px; color: ${cfg.color}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Prochaine étape</p>
                            <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.6;">${cfg.tip}</p>
                        </div>

                        <!-- CTA -->
                        <a href="https://mayombe-market.com/vendor/dashboard"
                           style="display: inline-block; padding: 16px 40px; border-radius: 12px;
                                  background: linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc);
                                  color: #ffffff; font-size: 15px; font-weight: 800;
                                  text-decoration: none; letter-spacing: 0.3px;">
                            Accéder à mon dashboard →
                        </a>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('[sendVendorApprovedEmail] error:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : vendeur refusé par l'admin ───────────────────────────────────
export async function sendVendorRejectedEmail(
    vendorEmail: string,
    vendorName: string,
    reason: string
) {
    const safeName   = escapeHtml(vendorName)
    const safeReason = escapeHtml(reason)

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: vendorEmail,
            subject: `Suite à votre demande de vérification — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <!-- Header -->
                    <div style="background: #08080E; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase; letter-spacing: 1px;">Mayombe Market</h1>
                    </div>

                    <!-- Corps -->
                    <div style="padding: 36px 30px; text-align: center;">
                        <div style="width: 70px; height: 70px; background: #fef2f2; border: 2px solid #fecaca; border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
                            ⚠️
                        </div>

                        <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 22px;">
                            Bonjour ${safeName},
                        </h2>
                        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
                            Après examen de votre dossier, notre équipe n'a pas pu valider votre vérification pour le moment.
                        </p>

                        <!-- Motif -->
                        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 14px; margin: 0 0 28px; text-align: left;">
                            <p style="font-size: 11px; color: #dc2626; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Motif du refus</p>
                            <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">${safeReason}</p>
                        </div>

                        <!-- Que faire -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px 20px; border-radius: 14px; margin: 0 0 28px; text-align: left;">
                            <p style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Que faire ?</p>
                            <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.6;">
                                Corrigez les éléments mentionnés ci-dessus et soumettez une nouvelle demande depuis votre espace vendeur.
                                Notre équipe l'examinera dans les plus brefs délais.
                            </p>
                        </div>

                        <!-- CTA -->
                        <a href="https://mayombe-market.com/vendor/verification"
                           style="display: inline-block; padding: 16px 40px; border-radius: 12px;
                                  background: linear-gradient(135deg, #f97316, #ea580c);
                                  color: #ffffff; font-size: 15px; font-weight: 800;
                                  text-decoration: none; letter-spacing: 0.3px;">
                            Soumettre une nouvelle demande →
                        </a>

                        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
                            Des questions ? Contactez-nous à <strong>contact@mayombe-market.com</strong>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('[sendVendorRejectedEmail] error:', error)
        return { error: 'Erreur envoi email' }
    }
}

// ─── Email : alerte admin — nouvelle demande de vérification ──────────────
export async function sendAdminNewVerificationEmail(
    adminEmail: string,
    vendorName: string,
    shopName: string,
    vendorType: string,
    city: string
) {
    const typeLabels: Record<string, { label: string; emoji: string; color: string }> = {
        patisserie:  { label: 'Pâtisserie',  emoji: '🎂', color: '#f43f5e' },
        restaurant:  { label: 'Restaurant',  emoji: '🍽️', color: '#f59e0b' },
        immobilier:  { label: 'Immobilier',  emoji: '🏠', color: '#3b82f6' },
        hotel:       { label: 'Hôtellerie',  emoji: '🏨', color: '#a855f7' },
        marketplace: { label: 'Marketplace', emoji: '🛍️', color: '#f97316' },
    }

    const cfg = typeLabels[vendorType] ?? typeLabels['marketplace']
    const safeName = escapeHtml(vendorName)
    const safeShop = escapeHtml(shopName)
    const safeCity = escapeHtml(city)

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmail,
            subject: `[Admin] Nouvelle vérification vendeur — ${safeShop}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <!-- Header -->
                    <div style="background: #08080E; padding: 24px 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 20px; font-style: italic; text-transform: uppercase; letter-spacing: 1px;">Mayombe Market</h1>
                        <p style="color: #888; font-size: 12px; margin: 4px 0 0 0;">Panneau d'administration</p>
                    </div>

                    <!-- Corps -->
                    <div style="padding: 30px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <div style="width: 48px; height: 48px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">
                                🔔
                            </div>
                            <div>
                                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Nouvelle demande</p>
                                <h2 style="color: #0f172a; margin: 0; font-size: 18px;">Vérification vendeur à traiter</h2>
                            </div>
                        </div>

                        <!-- Fiche vendeur -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px 16px; color: #64748b; width: 130px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Vendeur</td>
                                    <td style="padding: 12px 16px; font-weight: bold; color: #0f172a;">${safeName}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px 16px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Boutique</td>
                                    <td style="padding: 12px 16px; font-weight: bold; color: #0f172a;">${safeShop}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px 16px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Type</td>
                                    <td style="padding: 12px 16px;">
                                        <span style="display: inline-block; background: ${cfg.color}15; color: ${cfg.color}; border: 1px solid ${cfg.color}40; border-radius: 50px; padding: 3px 12px; font-size: 13px; font-weight: bold;">
                                            ${cfg.emoji} ${cfg.label}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Ville</td>
                                    <td style="padding: 12px 16px; color: #0f172a;">${safeCity}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- CTA -->
                        <div style="text-align: center;">
                            <a href="https://mayombe-market.com/admin/verifications"
                               style="display: inline-block; padding: 14px 36px; border-radius: 10px;
                                      background: linear-gradient(135deg, #f97316, #ea580c);
                                      color: #ffffff; font-size: 14px; font-weight: 800;
                                      text-decoration: none; letter-spacing: 0.3px;">
                                Examiner le dossier →
                            </a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f8fafc; padding: 16px 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Email automatique — Mayombe Market Administration</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('[sendAdminNewVerificationEmail] error:', error)
        return { error: 'Erreur envoi email' }
    }
}

// Email de réponse à une négociation (envoyé à l'acheteur)
export async function sendNegotiationResponseEmail(
    buyerEmail: string,
    buyerName: string,
    productName: string,
    proposedPrice: number,
    accepted: boolean
) {
    const statusColor = accepted ? '#22c55e' : '#ef4444'
    const statusLabel = accepted ? 'Acceptée' : 'Refusée'
    const safeProduct = escapeHtml(productName)
    const statusMessage = accepted
        ? `Votre offre de ${proposedPrice.toLocaleString('fr-FR')} FCFA pour &laquo;${safeProduct}&raquo; a été acceptée ! Rendez-vous sur la page du produit pour acheter à ce prix.`
        : `Votre offre de ${proposedPrice.toLocaleString('fr-FR')} FCFA pour &laquo;${safeProduct}&raquo; a été refusée par le vendeur.`

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: buyerEmail,
            subject: `Offre ${statusLabel.toLowerCase()} — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: ${statusColor}20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px; color: ${statusColor};">●</span>
                        </div>
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${escapeHtml(buyerName)}</h2>
                        <p style="color: #64748b; font-size: 14px;">${statusMessage}</p>

                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0; display: inline-block;">
                            <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Offre</span><br/>
                            <span style="font-size: 18px; font-weight: bold; color: ${statusColor};">${statusLabel}</span>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
        })
        return { success: true }
    } catch (error) {
        console.error('Erreur envoi email négociation réponse:', error)
        return { error: 'Erreur envoi email' }
    }
}
