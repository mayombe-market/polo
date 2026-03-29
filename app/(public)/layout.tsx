import PublicLayoutShell from './PublicLayoutShell'

/** Évite les 304 navigateur sur les fragments RSC → données produits / images incohérentes au refresh. */
export const fetchCache = 'force-no-store'

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <PublicLayoutShell>{children}</PublicLayoutShell>
}
