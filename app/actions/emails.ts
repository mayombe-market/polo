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
    const paymentLabel = data.paymentMethod === 'cash' ? 'Cash à la livraison' : 'Mobile Money'
    const safeName = escapeHtml(data.customerName)
    const safeCity = escapeHtml(data.city)
    const safeDistrict = escapeHtml(data.district)

    const itemsHtml = data.items
        .map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(item.name)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">x${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">${(item.price * item.quantity).toLocaleString('fr-FR')} FCFA</td>
            </tr>
        `)
        .join('')

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: data.customerEmail,
            subject: `Commande reçue — Mayombe Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #000000; padding: 30px; text-align: center;">
                        <h1 style="color: #f97316; margin: 0; font-size: 24px; font-style: italic; text-transform: uppercase;">Mayombe Market</h1>
                    </div>

                    <div style="padding: 30px;">
                        <h2 style="color: #0f172a; margin-bottom: 5px;">Merci ${safeName} !</h2>
                        <p style="color: #64748b; font-size: 14px;">Votre commande a bien été enregistrée. Voici le récapitulatif :</p>

                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #94a3b8;">Produit</th>
                                    <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #94a3b8;">Qté</th>
                                    <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #94a3b8;">Prix</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #64748b; font-size: 14px;">Total</span>
                                <span style="font-size: 24px; font-weight: bold; color: #f97316;">${data.total.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div style="margin-top: 8px;">
                                <span style="color: #64748b; font-size: 13px;">Paiement : ${paymentLabel}</span>
                            </div>
                            <div style="margin-top: 4px;">
                                <span style="color: #64748b; font-size: 13px;">Livraison : ${safeCity}, ${safeDistrict}</span>
                            </div>
                            ${data.deliveryMode ? `
                            <div style="margin-top: 8px; background: ${data.deliveryMode === 'express' ? '#fff7ed' : '#f0fdf4'}; border: 1px solid ${data.deliveryMode === 'express' ? '#fed7aa' : '#bbf7d0'}; padding: 10px 14px; border-radius: 8px;">
                                <span style="font-weight: bold; color: ${data.deliveryMode === 'express' ? '#ea580c' : '#16a34a'}; font-size: 13px;">
                                    ${data.deliveryMode === 'express' ? '⚡ Express (3-6H)' : '📦 Standard (6-48H)'}
                                </span>
                                <span style="color: #64748b; font-size: 12px;"> — ${(data.deliveryFee || 0).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            ` : ''}
                        </div>

                        ${data.paymentMethod === 'mobile_money' ? `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin: 20px 0;">
                            <p style="color: #166534; font-weight: bold; font-size: 13px; margin: 0 0 8px 0;">Paiement Mobile Money</p>
                            <p style="color: #15803d; font-size: 13px; margin: 0;">Envoyez <strong>${data.total.toLocaleString('fr-FR')} FCFA</strong> au <strong>06 938 71 69</strong> via MTN MoMo ou Airtel Money.</p>
                        </div>
                        ` : ''}

                        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">Vous recevrez un email à chaque mise à jour de votre commande.</p>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mayombe Market — contact@mayombe-market.com</p>
                    </div>
                </div>
            `,
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
