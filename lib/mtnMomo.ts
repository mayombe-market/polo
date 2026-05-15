const BASE_URL = process.env.MTN_MOMO_BASE_URL!
const USER_ID = process.env.MTN_MOMO_USER_ID!
const API_KEY = process.env.MTN_MOMO_API_KEY!
const SUB_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY!
const ENV = process.env.MTN_MOMO_ENVIRONMENT ?? 'sandbox'

export async function getMomoToken(): Promise<string> {
    const credentials = Buffer.from(`${USER_ID}:${API_KEY}`).toString('base64')
    const res = await fetch(`${BASE_URL}/collection/token/`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': SUB_KEY,
            'X-Target-Environment': ENV,
        },
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`MTN token error ${res.status}: ${text}`)
    }
    const data = await res.json()
    return data.access_token as string
}

export interface RequestToPayInput {
    amount: number
    currency: string
    externalId: string
    partyId: string        // numéro de téléphone du client
    payerMessage: string
    payeeNote: string
}

export async function requestToPay(referenceId: string, input: RequestToPayInput): Promise<void> {
    const token = await getMomoToken()
    const callbackUrl = process.env.MTN_MOMO_CALLBACK_URL
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': ENV,
        'Ocp-Apim-Subscription-Key': SUB_KEY,
        'Content-Type': 'application/json',
    }
    if (callbackUrl) headers['X-Callback-Url'] = callbackUrl
    const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            amount: String(input.amount),
            currency: input.currency,
            externalId: input.externalId,
            payer: { partyIdType: 'MSISDN', partyId: input.partyId },
            payerMessage: input.payerMessage,
            payeeNote: input.payeeNote,
        }),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`MTN requestToPay error ${res.status}: ${text}`)
    }
}

export async function getPaymentStatus(referenceId: string): Promise<{
    status: 'SUCCESSFUL' | 'FAILED' | 'PENDING'
    reason?: string
}> {
    const token = await getMomoToken()
    const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': ENV,
            'Ocp-Apim-Subscription-Key': SUB_KEY,
        },
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`MTN status error ${res.status}: ${text}`)
    }
    const data = await res.json()
    return { status: data.status, reason: data.reason }
}
