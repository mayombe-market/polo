import Link from 'next/link'
import { ShieldCheck, Star, Truck, CreditCard, MessageCircle, Users, Award, CheckCircle, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Acheter en confiance | Mayombe Market',
    description: 'Découvrez toutes les garanties Mayombe Market : vendeurs vérifiés, paiement sécurisé Mobile Money, livraison locale et support 7j/7.',
}

const GUARANTEES = [
    {
        Icon: ShieldCheck,
        title: 'Vendeurs vérifiés',
        color: '#059669',
        points: [
            'Chaque vendeur soumet ses pièces justificatives (RCCM, NIU, CNI).',
            'Notre équipe valide manuellement chaque dossier avant activation.',
            'Un badge ✅ indique les vendeurs dont l\'identité est confirmée.',
            'Les comptes suspects sont suspendus immédiatement.',
        ],
    },
    {
        Icon: CreditCard,
        title: 'Paiement Mobile Money sécurisé',
        color: '#D97706',
        points: [
            'Paiement via MTN MoMo ou Airtel Money — sans carte bancaire.',
            'Vous entrez votre numéro de transaction après le paiement.',
            'Le vendeur vérifie la réception de votre paiement sur son compte.',
            'Votre commande n\'est confirmée qu\'après sa vérification — vous êtes prévenu à chaque étape.',
        ],
    },
    {
        Icon: Truck,
        title: 'Livraison fiable',
        color: '#2563EB',
        points: [
            'Nos partenaires livrent à Brazzaville et Pointe-Noire.',
            'Vous recevez un numéro de suivi pour chaque commande.',
            'Confirmez la réception depuis votre espace client.',
            'Paiement à la livraison disponible sur certaines commandes.',
        ],
    },
    {
        Icon: Star,
        title: 'Système d\'évaluation transparent',
        color: '#6366F1',
        points: [
            'Seuls les acheteurs ayant reçu une commande peuvent noter.',
            'Notes du vendeur, de la livraison et de la plateforme.',
            'Les avis sont publics et non modifiables par le vendeur.',
            'Les badges de réputation reflètent l\'historique réel.',
        ],
    },
    {
        Icon: MessageCircle,
        title: 'Support 7j/7',
        color: '#A855F7',
        points: [
            'Une équipe disponible tous les jours pour vous aider.',
            'Contactez-nous via la messagerie intégrée ou WhatsApp.',
            'Réclamations traitées sous 24 heures ouvrées.',
            'Médiation en cas de litige acheteur / vendeur.',
        ],
    },
    {
        Icon: Users,
        title: 'Communauté locale',
        color: '#EC4899',
        points: [
            'Vendeurs et acheteurs basés au Congo Brazzaville.',
            'Soutenez l\'économie locale avec chaque achat.',
            'Boutiques physiques vérifiées pour un contact direct.',
            'Réseau de confiance ancré dans la communauté congolaise.',
        ],
    },
]

const STEPS = [
    { step: '1', label: 'Parcourez les produits', desc: 'Filtrez par catégorie, prix ou ville.' },
    { step: '2', label: 'Choisissez un vendeur vérifié', desc: 'Repérez le badge ✅ et lisez les avis.' },
    { step: '3', label: 'Passez votre commande', desc: 'Sélectionnez votre mode de livraison.' },
    { step: '4', label: 'Payez via Mobile Money', desc: 'MTN MoMo ou Airtel Money, en toute sécurité.' },
    { step: '5', label: 'Confirmez votre paiement', desc: 'Entrez l\'ID de transaction pour valider.' },
    { step: '6', label: 'Recevez et évaluez', desc: 'Confirmez la réception et notez le vendeur.' },
]

export default function AcheterEnConfiancePage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-br from-green-600 via-green-500 to-orange-500 text-white">
                <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-8 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Retour à l&apos;accueil
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Mayombe Market</p>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Acheter en confiance</h1>
                        </div>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed max-w-xl">
                        Mayombe Market est la première marketplace congolaise vérifiée.
                        Voici toutes nos garanties pour que chaque achat soit sûr et serein.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-8 pb-20">

                {/* Stats rapides */}
                <div className="grid grid-cols-3 gap-3 mb-10">
                    {[
                        { emoji: '✅', value: '100%', label: 'Vendeurs vérifiés manuellement' },
                        { emoji: '📱', value: 'Mobile Money', label: 'Paiement local sécurisé' },
                        { emoji: '7j/7', value: 'Support', label: 'Équipe disponible' },
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center shadow-sm">
                            <p className="text-xl font-black dark:text-white">{s.value}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 leading-tight">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Nos garanties */}
                <div className="mb-12">
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2">Nos engagements</p>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-8">Toutes nos garanties</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {GUARANTEES.map(({ Icon, title, color, points }) => (
                            <div key={title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: color + '18', border: `1px solid ${color}25` }}>
                                        <Icon size={18} style={{ color }} />
                                    </div>
                                    <h3 className="text-sm font-black dark:text-white">{title}</h3>
                                </div>
                                <ul className="space-y-2">
                                    {points.map(p => (
                                        <li key={p} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                            <CheckCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color }} />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comment ça marche */}
                <div className="mb-12">
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2">Processus</p>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-8">Comment acheter en 6 étapes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {STEPS.map(s => (
                            <div key={s.step} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-black">
                                    {s.step}
                                </div>
                                <div>
                                    <p className="text-sm font-bold dark:text-white">{s.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Badges vendeurs */}
                <div className="mb-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <Award size={18} className="text-orange-500" />
                        <h2 className="text-lg font-black dark:text-white">Comprendre les badges vendeurs</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { emoji: '🆕', label: 'Nouveau vendeur', desc: 'Vient de rejoindre la plateforme. Aidez-le avec un premier avis !', color: '#2563EB' },
                            { emoji: '✅', label: 'Vendeur vérifié', desc: 'Identité et documents contrôlés par notre équipe.', color: '#059669' },
                            { emoji: '⭐', label: 'Bien évalué', desc: 'Note moyenne ≥ 4,5/5 sur au moins 10 avis clients.', color: '#6366F1' },
                            { emoji: '🏆', label: 'Vendeur de confiance', desc: '30+ ventes confirmées, note ≥ 4,5/5 et 10+ avis clients.', color: '#D97706' },
                        ].map(b => (
                            <div key={b.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: b.color + '10' }}>
                                <span className="text-xl leading-none">{b.emoji}</span>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: b.color }}>{b.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center py-10 px-6 bg-gradient-to-br from-green-600 via-green-500 to-orange-500 rounded-3xl text-white">
                    <p className="text-2xl font-black uppercase italic tracking-tighter mb-2">Prêt à acheter en toute sécurité ?</p>
                    <p className="text-white/80 text-sm mb-6">Des milliers de produits livrés à Brazzaville et Pointe-Noire.</p>
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-white text-green-600 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-white/90 transition-colors shadow-lg"
                    >
                        Explorer la marketplace
                    </Link>
                </div>
            </div>
        </div>
    )
}
