import { NextResponse } from 'next/server'

// Route désactivée — le paiement MTN MoMo est désormais manuel (saisie du transaction ID par le client)
export async function POST() {
    return NextResponse.json(
        { error: 'Cette route est désactivée. Le paiement MTN MoMo est manuel.' },
        { status: 410 }
    )
}
