import Link from 'next/link'
import ForgotPassword from '@/app/components/ForgotPassword'

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <Link
                href="/"
                className="mb-8 text-slate-500 text-sm font-semibold hover:text-orange-400 transition-colors no-underline"
            >
                ← Mayombe Market
            </Link>
            <ForgotPassword />
        </div>
    )
}
