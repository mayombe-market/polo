import Header from '@/app/components/Header'
import { Toaster } from 'sonner'

export default function VendorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />
            <div className="vendor-area">
                {children}
            </div>
        </>
    )
}
