import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import RequiredCityClient from '@/app/components/RequiredCityClient'
import { sanitizeInternalNext } from '@/lib/requiredCityNext'

export default async function RequiredCityPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>
}) {
    const sp = await searchParams
    const safeNext = sanitizeInternalNext(sp.next)

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        /* ignore */
                    }
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/?redirect=${encodeURIComponent('/required-city')}`)
    }

    const { data: row } = await supabase.from('profiles').select('city').eq('id', user.id).maybeSingle()

    if (row?.city?.trim()) {
        redirect(safeNext)
    }

    return <RequiredCityClient safeNext={safeNext} />
}
