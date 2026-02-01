import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Cet outil permettra à tes composants de parler à Supabase
export const supabase = createClientComponentClient()