import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * Passe en `expired` les campagnes actives dont `end_date` est dépassée.
 * Protégé par `Authorization: Bearer ${CRON_SECRET}` — à appeler depuis Vercel Cron
 * avec les variables CRON_SECRET et SUPABASE_SERVICE_ROLE_KEY.
 */
export async function GET(request: Request) {
    const auth = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    if (!secret || auth !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
        return new Response('Missing SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
    }

    const supabase = createClient(url, key)
    const now = new Date().toISOString()

    const { error } = await supabase
        .from('vendor_ad_campaigns')
        .update({ status: 'expired', updated_at: now })
        .eq('status', 'active')
        .lt('end_date', now)

    if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    return Response.json({ ok: true })
}
