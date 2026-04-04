import { redirect } from 'next/navigation'

/** Ancienne URL : tout est regroupé sous /admin/ads (#campagnes-vendeurs). */
export default function AdminAdCampaignsRedirectPage() {
    redirect('/admin/ads#campagnes-vendeurs')
}
