'use server'

import { resend, FROM_EMAIL } from '@/lib/resend'

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
}

// Email de confirmation de commande (envoyé à l'acheteur)
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
    const paymentLabel = data.paymentMethod === 'cash' ? 'Cash à la livraison' : 'Mobile Money'

    const itemsHtml = data.items
        .map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${item.name}</td>
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
                        <h2 style="color: #0f172a; margin-bottom: 5px;">Merci ${data.customerName} !</h2>
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
                                <span style="color: #64748b; font-size: 13px;">Livraison : ${data.city}, ${data.district}</span>
                            </div>
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
    trackingNumber?: string
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
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${customerName}</h2>
                        <p style="color: #64748b; font-size: 14px;">${status.message}</p>

                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0; display: inline-block;">
                            <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Statut</span><br/>
                            <span style="font-size: 18px; font-weight: bold; color: ${status.color};">${status.label}</span>
                        </div>

                        ${trackingNumber ? `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; margin: 16px 0;">
                            <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Numéro de suivi</span><br/>
                            <span style="font-size: 18px; font-weight: bold; color: #1e40af; letter-spacing: 2px;">${trackingNumber}</span>
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
    } catch (error) {
        console.error('Erreur envoi email statut:', error)
        return { error: 'Erreur envoi email' }
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
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${sellerName}</h2>
                        <p style="color: #64748b; font-size: 14px;">Un client souhaite négocier le prix d'un de vos produits.</p>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
                            <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; margin: 0 0 8px 0;">Produit</p>
                            <p style="font-size: 16px; font-weight: bold; color: #0f172a; margin: 0;">${productName}</p>
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

                        <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">De la part de <strong>${buyerName}</strong></p>

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
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${clientName}</h2>
                        <p style="color: #64748b; font-size: 14px;">Votre colis "<strong>${productName}</strong>" a été récupéré chez le vendeur et est maintenant en route vers vous !</p>

                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; margin: 24px 0;">
                            <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Livreur</span><br/>
                            <span style="font-size: 16px; font-weight: bold; color: #1e40af;">${logisticianName}</span>
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
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${clientName}</h2>
                        <p style="color: #64748b; font-size: 14px;">Votre colis "<strong>${productName}</strong>" a été livré !</p>

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
    const statusMessage = accepted
        ? `Votre offre de ${proposedPrice.toLocaleString('fr-FR')} FCFA pour "${productName}" a été acceptée ! Rendez-vous sur la page du produit pour acheter à ce prix.`
        : `Votre offre de ${proposedPrice.toLocaleString('fr-FR')} FCFA pour "${productName}" a été refusée par le vendeur.`

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
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Bonjour ${buyerName}</h2>
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
