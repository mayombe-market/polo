import { redirect } from 'next/navigation'

/** Alias « édition profil vendeur » → paramètres dashboard */
export default function VendorProfileEditPage() {
    redirect('/vendor/dashboard?tab=settings')
}
