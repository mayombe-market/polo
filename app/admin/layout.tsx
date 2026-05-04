import Header from '@/app/components/Header'
import { Toaster } from 'sonner'
import AdminNav from './AdminNav'
import AdminAlarmBanner from './AdminAlarmBanner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Alarme sonore + visuelle — se superpose à tout le reste */}
            <AdminAlarmBanner />
            <Header />
            <AdminNav />
            <Toaster position="top-right" richColors closeButton />
            {children}
        </>
    )
}
