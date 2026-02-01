export default function VendorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="vendor-area">
            {/* Ici, on n'affiche pas le même header que le public */}
            {children}
        </div>
    )
}