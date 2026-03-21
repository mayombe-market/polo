import { redirect } from 'next/navigation'

/** Alias URL : /store/[id] → page boutique publique /seller/[id] */
export default async function StoreAliasPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/seller/${id}`)
}
