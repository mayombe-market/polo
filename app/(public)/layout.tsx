import PublicLayoutShell from './PublicLayoutShell'

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <PublicLayoutShell>{children}</PublicLayoutShell>
}
