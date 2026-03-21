import { redirect } from 'next/navigation'

/** Alias /settings → paramètres vendeur (dashboard) */
export default function SettingsAliasPage() {
    redirect('/vendor/dashboard?tab=settings')
}
