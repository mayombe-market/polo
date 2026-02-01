import { createBrowserClient } from '@supabase/ssr'

// C'est la nouvelle version propre pour Next.js
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)