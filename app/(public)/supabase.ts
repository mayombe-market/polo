import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

// Compat: ancien import — retourne désormais le singleton partagé
export const supabase = getSupabaseBrowserClient()
