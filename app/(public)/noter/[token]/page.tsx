import Link from 'next/link'
import type { Metadata } from 'next'
import { getRatingContext } from '@/lib/orderRatingServer'
import RateOrderForm from './RateOrderForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Noter ma commande',
    robots: { index: false, follow: false },
}

export default async function NoterPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const ctx = await getRatingContext(token)

    if (ctx.state === 'invalid') {
        return (
            <Shell>
                <p className="text-4xl mb-3">🔗</p>
                <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Lien invalide</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Ce lien de notation n’est pas reconnu. Scannez à nouveau le QR code de l’étiquette.</p>
                <Link href="/marketplace" className="inline-block px-6 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black">Découvrir Mayombe Market</Link>
            </Shell>
        )
    }

    return (
        <Shell>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2">Commande {ctx.orderNumber}</p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {ctx.firstName ? `${ctx.firstName}, comment` : 'Comment'} s’est passée votre commande chez <span className="text-orange-500">{ctx.shopName}</span> ?
            </h1>
            <div className="flex justify-center gap-2 my-5">
                {ctx.products.map((p, i) => (
                    p.img
                        ? <img key={i} src={p.img} alt={p.name} className="w-16 h-20 rounded-xl object-cover border border-slate-200 dark:border-white/10" />
                        : <div key={i} className="w-16 h-20 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-2xl">📦</div>
                ))}
            </div>

            {ctx.state === 'already_rated' && (
                <div className="rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-5">
                    <p className="text-sm font-black text-green-700 dark:text-green-400">Merci, votre avis a déjà été enregistré 🙏</p>
                </div>
            )}
            {ctx.state === 'not_ready' && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-5">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Cette commande n’est pas encore confirmée par le vendeur. Revenez après la réception de votre colis.</p>
                </div>
            )}
            {ctx.state === 'open' && <RateOrderForm token={token} shopName={ctx.shopName} />}
        </Shell>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[70vh] bg-stone-50 dark:bg-slate-950 px-4 py-10">
            <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                {children}
            </div>
        </div>
    )
}
