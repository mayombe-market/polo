import { redirect } from 'next/navigation'

/** Ancienne URL : tout est sous /admin/ads (onglet Campagnes vendeurs). */
export default function AdminAdCampaignsRedirectPage() {
    redirect('/admin/ads?tab=vendeurs')
}
