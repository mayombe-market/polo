import Header from '../components/Header'
import Footer from '../components/Footer'
import { Toaster } from 'sonner'

export default function InfoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer />
        </>
    )
}
