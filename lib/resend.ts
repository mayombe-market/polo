import { Resend } from 'resend'

const isStaging = process.env.NEXT_PUBLIC_STAGING_MODE === 'true'

function createResendClient(): Resend {
    if (isStaging || !process.env.RESEND_API_KEY) {
        return {
            emails: {
                send: async (payload: any) => {
                    console.log('[STAGING] Email supprimé:', payload?.to, '|', payload?.subject)
                    return { data: { id: 'staging-mock' }, error: null }
                }
            }
        } as unknown as Resend
    }
    return new Resend(process.env.RESEND_API_KEY)
}

export const resend = createResendClient()

export const FROM_EMAIL = 'Mayombe Market <noreply@mayombe-market.com>'
