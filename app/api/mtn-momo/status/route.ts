import { NextResponse } from 'next/server'

// Route désactivée — la vérification automatique du statut MTN n'est plus utilisée
export async function GET() {
    return NextResponse.json(
        { error: 'Cette route est désactivée. La confirmation est faite manuellement par l\'admin.' },
        { status: 410 }
    )
}
