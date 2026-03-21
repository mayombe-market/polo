import { redirect } from 'next/navigation'

/** Paramètres boutique (slogan, etc.) : même UI que le dashboard onglet Paramètres */
export default function VendorSettingsPage() {
    redirect('/vendor/dashboard?tab=settings')
}
