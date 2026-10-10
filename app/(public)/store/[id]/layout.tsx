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
        .select('store_name, shop_name, first_name, avatar_url, bio, shop_banner')
        .eq('id', id)
        .maybeSingle()

    const label =
        data?.store_name ||
        data?.shop_name ||
        data?.first_name ||
        'Boutique'
    const title = sanitizePageTitleSegment(String(label), 60)
    const description = data?.bio || `Découvrez les produits de ${title} sur Mayombe Market`
    const image = data?.shop_banner || data?.avatar_url || null

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            ...(image ? { images: [image] } : {}),
        },
    }
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return children
}
