import { Toaster } from 'sonner'

export default function LogisticianLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Toaster position="top-center" richColors closeButton />
            <div className="logistician-area">
                {children}
            </div>
        </>
    )
}
