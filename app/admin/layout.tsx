import Header from '@/app/components/Header'
import { Toaster } from 'sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />
            {children}
        </>
    )
}
