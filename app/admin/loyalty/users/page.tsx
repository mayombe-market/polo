import { redirect } from 'next/navigation'

/**
 * Stub : /admin/loyalty/users?id=<uuid> → redirige vers /admin/loyalty/users/[id]
 */
export default async function AdminLoyaltyUsersRedirect({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const params = await searchParams
    const id = params?.id?.trim()
    if (id) {
        redirect(`/admin/loyalty/users/${id}`)
    }
    redirect('/admin/loyalty')
}
