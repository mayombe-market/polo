import type { Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sanitizePageTitleSegment } from '@/lib/sanitizeUserDisplay'

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params
    if (!id || !UUID_RE.test(id)) {
        return { title: 'Boutique' }
    }

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

    const { data } = await supabase
        .from('profiles')
        .select('store_name, shop_name, first_name')
        .eq('id', id)
        .maybeSingle()

    const label =
        data?.store_name ||
        data?.shop_name ||
        data?.first_name ||
        'Boutique'
    return { title: sanitizePageTitleSegment(String(label), 60) }
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return children
}
