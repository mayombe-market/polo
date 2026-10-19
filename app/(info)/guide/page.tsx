'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Search, ShoppingCart, CreditCard, Truck, Star, MessageCircle,
    Store, PackagePlus, Wallet, Share2, Users, ShieldCheck,
    ChevronRight, ArrowRight, CheckCircle2, Phone, MapPin,
    BookOpen, UserCircle
} from 'lucide-react'
import type { Metadata } from 'next'

type Tab = 'buyer' | 'seller'

const BUYER_STEPS = [
    {
        icon: Search,
        color: '#3B82F6',
        bg: '#EFF6FF',
        num: '01',
        title: 'Chercher un produit',
        desc: 'Utilisez la barre de recherche ou parcourez les catégories pour trouver ce dont vous avez besoin parmi les vendeurs locaux.',
    },
    {
        icon: Star,
        color: '#F59E0B',
        bg: '#FFFBEB',
        num: '02',
        title: 'Vérifier le vendeur',
        desc: 'Consultez la boutique du vendeur, ses avis clients, sa note et son badge de réputation (Vérifié, Bien évalué, Vendeur de confiance).',
    },
    {
        icon: ShoppingCart,
        color: '#8B5CF6',
        bg: '#F5F3FF',
        num: '03',
        title: 'Ajouter au panier & commander',
        desc: 'Ajoutez vos articles au panier. Renseignez votre nom, ville, quartier et point de repère. Vous pouvez commander sans créer de compte.',
    },
    {
        icon: CreditCard,
        color: '#10B981',
        bg: '#ECFDF5',
        num: '04',
        title: 'Payer directement au vendeur',
        desc: 'Transférez le montant via MTN MoMo ou Airtel Money directement au numéro du vendeur. Saisissez le code SMS à 10 chiffres pour confirmer.',
    },
    {
        icon: Truck,
        color: '#F97316',
        bg: '#FFF7ED',
        num: '05',
        title: 'Choisir votre livraison',
        desc: 'Retrait en boutique (gratuit), livraison par le vendeur, express (3–6h) ou standard (6–48h). Les frais et délais sont affichés à la commande.',
    },
    {
        icon: MessageCircle,
        color: '#06B6D4',
        bg: '#ECFEFF',
        num: '06',
        title: 'Contacter le vendeur',
        desc: 'Chaque boutique affiche un numéro WhatsApp. Si vous avez une question ou un problème, contactez le vendeur directement.',
    },
]

const SELLER_BENEFITS = [
    { icon: Store, color: '#3B82F6', text: 'Boutique en ligne gratuite avec votre nom, logo et description' },
    { icon: PackagePlus, color: '#8B5CF6', text: 'Produits illimités avec photos, prix et stock' },
    { icon: Wallet, color: '#10B981', text: 'Paiements directs sur votre numéro MTN MoMo ou Airtel Money' },
    { icon: Share2, color: '#F97316', text: 'Lien de boutique partageable sur WhatsApp en un clic' },
    { icon: Users, color: '#EC4899', text: 'Visibilité auprès de tous les acheteurs de Mayombe Market' },
    { icon: ShieldCheck, color: '#F59E0B', text: 'Badge Vendeur vérifié après validation de vos documents' },
]

const SELLER_STEPS = [
    {
        num: '01',
        title: 'Créer votre compte',
        desc: 'Inscrivez-vous gratuitement avec votre numéro de téléphone ou email.',
    },
    {
        num: '02',
        title: 'Passer en mode Vendeur',
        desc: 'Dans vos paramètres, choisissez le rôle Vendeur et renseignez le nom de votre boutique.',
    },
    {
        num: '03',
        title: 'Soumettre vos documents',
        desc: 'Envoyez votre RCCM, NIU et une photo de CNI pour obtenir le badge Vendeur vérifié.',
    },
    {
        num: '04',
        title: 'Publier vos produits',
        desc: 'Ajoutez vos articles avec photos, prix, description et quantité disponible.',
    },
    {
        num: '05',
        title: 'Recevoir et gérer les commandes',
        desc: 'Vous recevez une notification à chaque commande. Confirmez la réception du paiement et organisez la livraison.',
    },
]

export default function GuidePage() {
    const [tab, setTab] = useState<Tab>('buyer')

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            {/* Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-stone-900 to-orange-950 text-white pb-16 pt-10 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
                        <BookOpen size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Guide Mayombe Market</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-3">
                        Comment fonctionne<br />
                        <span className="text-orange-400">Mayombe Market ?</span>
                    </h1>
                    <p className="text-white/70 text-sm max-w-md mx-auto">
                        La marketplace congolaise qui connecte acheteurs et vendeurs locaux. Paiement direct, livraison organisée par le vendeur.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-2xl mx-auto px-4 -mt-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-1.5 flex gap-1.5 shadow-lg">
                    <button
                        onClick={() => setTab('buyer')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            tab === 'buyer'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <ShoppingCart size={16} />
                        Je suis acheteur
                    </button>
                    <button
                        onClick={() => setTab('seller')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            tab === 'seller'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <Store size={16} />
                        Je suis vendeur
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
                {tab === 'buyer' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase italic tracking-tighter dark:text-white mb-6">
                            Comment passer une commande
                        </h2>
                        {BUYER_STEPS.map((step) => (
                            <div
                                key={step.num}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex gap-4"
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: step.bg }}
                                >
                                    <step.icon size={20} style={{ color: step.color }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest"
                                            style={{ color: step.color }}
                                        >
                                            Étape {step.num}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold dark:text-white mb-1">{step.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}

                        {/* Note importante */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4 mt-2">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">À savoir</p>
                            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 leading-relaxed">
                                <li>• Le paiement se fait directement au vendeur (pas à Mayombe Market)</li>
                                <li>• La livraison est organisée par le vendeur selon ses disponibilités</li>
                                <li>• En cas de problème, contactez d'abord le vendeur via WhatsApp</li>
                            </ul>
                        </div>

                        <div className="pt-2">
                            <Link
                                href="/marketplace"
                                className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase italic text-sm hover:bg-orange-600 transition-colors"
                            >
                                Explorer la marketplace <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}

                {tab === 'seller' && (
                    <div className="space-y-6">
                        {/* Pitch */}
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Pourquoi vendre sur Mayombe Market ?</p>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-3">
                                Votre boutique en ligne, gratuite et prête en 10 minutes
                            </h2>
                            <p className="text-sm opacity-90 leading-relaxed">
                                Rejoignez les vendeurs congolais qui touchent de nouveaux acheteurs chaque jour, sans frais d'inscription ni abonnement obligatoire.
                            </p>
                        </div>

                        {/* Avantages */}
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Ce que vous obtenez</h3>
                            <div className="space-y-2.5">
                                {SELLER_BENEFITS.map((b, i) => (
                                    <div
                                        key={i}
                                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: b.color + '15' }}
                                        >
                                            <b.icon size={16} style={{ color: b.color }} />
                                        </div>
                                        <p className="text-sm font-medium dark:text-white">{b.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Étapes */}
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Comment démarrer</h3>
                            <div className="space-y-3">
                                {SELLER_STEPS.map((step) => (
                                    <div key={step.num} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                                                {step.num}
                                            </div>
                                            {step.num !== '05' && <div className="w-px flex-1 bg-orange-200 dark:bg-orange-900/40 mt-1" />}
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-sm font-bold dark:text-white mb-0.5">{step.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="space-y-3 pt-2">
                            <Link
                                href="/devenir-vendeur"
                                className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase italic text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                Créer ma boutique gratuitement <ArrowRight size={16} />
                            </Link>
                            <p className="text-center text-[10px] text-slate-400">
                                Inscription gratuite · Vérification sous 24–48h · Aucune commission cachée
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
