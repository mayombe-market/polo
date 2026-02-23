import Header from '@/app/components/Header'
import { Toaster } from 'sonner'
import AdminNav from './AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <AdminNav />
            <Toaster position="top-right" richColors closeButton />
            {children}
        </>
    )
}
