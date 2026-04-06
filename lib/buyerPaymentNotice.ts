/** Types d’avis paiement posés par l’admin — affichage carte in-app acheteur (pas d’email/SMS). */
export type BuyerPaymentNoticeType = 'invalid_code' | 'partial_payment' | 'no_payment' | 'resend_code'

export const BUYER_PAYMENT_NOTICE_TYPES: BuyerPaymentNoticeType[] = [
    'invalid_code',
    'partial_payment',
    'no_payment',
    'resend_code',
]

export function isBuyerPaymentNoticeType(v: string | null | undefined): v is BuyerPaymentNoticeType {
    return v === 'invalid_code' || v === 'partial_payment' || v === 'no_payment' || v === 'resend_code'
}

export function copyForBuyerPaymentNotice(type: BuyerPaymentNoticeType): { title: string; body: string } {
    switch (type) {
        case 'invalid_code':
            return {
                title: 'Code de transaction',
                body:
                    'Bonjour, le code de transaction envoyé est invalide. Merci de vérifier et de renvoyer le bon code.',
            }
        case 'partial_payment':
            return {
                title: 'Paiement incomplet',
                body:
                    'Bonjour, nous avons reçu un paiement partiel. Merci de compléter le montant restant pour valider votre commande. Sans cela, elle ne sera pas prise en compte.',
            }
        case 'no_payment':
            return {
                title: 'Paiement non reçu',
                body:
                    'Bonjour, nous n’avons reçu aucun paiement pour votre commande. Veuillez effectuer le transfert pour valider votre achat. Sans paiement, votre commande pourra être annulée.',
            }
        case 'resend_code':
            return {
                title: 'Nouveau code requis',
                body:
                    'Bonjour, merci de renvoyer le code de transaction à 10 chiffres reçu par SMS après votre paiement Mobile Money ou Airtel Money.',
            }
        default:
            return { title: 'Information', body: 'Merci de traiter votre commande.' }
    }
}
