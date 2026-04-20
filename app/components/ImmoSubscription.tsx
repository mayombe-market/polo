'use client'

import { useState, useRef, useEffect } from 'react'
import { IMMO_PLANS, type ImmoPlan } from '@/lib/immoPlans'
import { SubscriptionCheckout } from './SellerSubscription'
import { SYSTEM_FONT_STACK } from '@/lib/systemFontStack'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

// ═══════════════════════════════════════════════════════
// TOOLTIP DARK — réutilisable dans tout ce fichier
// ═══════════════════════════════════════════════════════
function ImmoTooltip({ text, alignRight }: { text: string; alignRight?: boolean }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
                style={{
                    width: 16, height: 16, borderRadius: 5,
                    background: open ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    color: '#3B82F6', fontSize: 9, fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, transition: 'all 0.15s',
                }}
            >
                ?
            </button>
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 22,
                    ...(alignRight ? { right: 0 } : { left: 0 }),
                    zIndex: 9999,
                    width: 220,
                    background: '#1A1A2E',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                    pointerEvents: 'none',
                }}>
                    <p style={{ color: '#C0BAA8', fontSize: 11, margin: 0, lineHeight: 1.7 }}>
                        {text}
                    </p>
                </div>
            )}
        </div>
    )
}

// Descriptions des fonctionnalités (lookup partagé modal + cards)
const FEATURE_TOOLTIPS: Record<string, string> = {
    '📋': 'Nombre de biens que vous pouvez avoir en ligne en même temps. Supprimer une annonce libère immédiatement une place.',
    '📷': 'Nombre maximum de photos par annonce. Les annonces avec 8+ photos reçoivent en moyenne 3× plus de contacts.',
    '📅': 'Durée avant masquage automatique de l\'annonce. Vous recevrez un rappel pour la renouveler depuis votre tableau de bord.',
    '⏳': 'Nos équipes vérifient la conformité et l\'authenticité de l\'annonce avant publication (délai max 48h).',
    '🏅': 'Badge "Agent" ou "Agence certifiée" affiché sur chaque annonce et votre profil. Il rassure les acheteurs sur votre sérieux.',
    '📞': 'Votre numéro de téléphone s\'affiche directement sur l\'annonce. Les prospects vous appellent en un clic, sans passer par le chat.',
    '🎥': 'Intégrez l\'URL d\'une visite virtuelle filmée sur YouTube. Les acheteurs visualisent le bien avant même de vous contacter.',
    '⚡': 'Vos annonces sont en ligne instantanément, 24h/24, sans validation préalable de notre équipe.',
    '📊': 'Consultez les vues de chaque annonce et les demandes de contact reçues. Permet d\'ajuster prix et photos pour maximiser l\'intérêt.',
    '⬆️': 'Propulsez une annonce en tête des résultats et dans la section "Recommandés" pendant 7 jours. Idéal pour les biens urgents.',
    '🏗️': 'Une page publique avec logo, description et toutes vos annonces regroupées. Partageable sur WhatsApp comme carte de visite digitale.',
}

// Descriptions des lignes de la modale de comparaison
const ROW_TOOLTIPS: Record<string, string> = {
    'Prix mensuel': 'Prélevé chaque 30 jours ou en paiement annuel unique (−20%). Paiement par MTN MoMo ou Airtel Money directement depuis votre téléphone.',
    'Annonces simultanées': 'Nombre de biens actifs en même temps. Supprimer ou archiver une annonce libère immédiatement une place.',
    'Durée par annonce': 'Au-delà de cette durée, l\'annonce est masquée automatiquement. Vous recevrez un rappel pour la renouveler.',
    'Photos par annonce': 'Les annonces avec 8+ photos reçoivent en moyenne 3× plus de contacts. Privilégiez des photos en lumière naturelle.',
    'Publication directe': 'Particulier : vos annonces passent par une modération (48h max) avant d\'être visibles sur la plateforme. Agent et Agence publient instantanément.',
    'Badge sur annonces': 'Un badge "Agent" ou "Agence certifiée" s\'affiche sur chaque annonce et votre profil. Il distingue les pros des particuliers.',
    'Téléphone visible': 'Votre numéro apparaît directement sur l\'annonce. Les prospects vous appellent en un clic, sans intermédiaire.',
    'Lien vidéo YouTube': 'Intégrez une URL YouTube pour une visite virtuelle. Les acheteurs visualisent le bien avant même de vous appeler.',
    'Statistiques': 'Nombre de vues et demandes de contact par annonce. Indispensable pour ajuster vos prix et améliorer vos photos.',
    'Mises en avant / mois': 'Chaque boost positionne une annonce en tête des résultats et dans la section "Recommandés" pendant 7 jours.',
    'Page agence dédiée': 'Une page publique avec votre logo, vos coordonnées et toutes vos annonces. Partageable sur WhatsApp comme carte de visite.',
    'Numéro unique obligatoire': 'Un seul compte vendeur par numéro de téléphone. Protège les acheteurs des faux profils et des doublons.',
}

// ═══════════════════════════════════════════════════════
// MODAL COMPARAISON — table complète des 3 plans
// ═══════════════════════════════════════════════════════
export function ImmoPlanComparisonModal({ onClose }: { onClose: () => void }) {
    const rows: { label: string; icon: string; values: (string | boolean)[] }[] = [
        { label: 'Prix mensuel',           icon: '💰', values: ['Gratuit', '20 000 FCFA', '50 000 FCFA'] },
        { label: 'Annonces simultanées',   icon: '📋', values: ['3', '15', 'Illimitées ∞'] },
        { label: 'Durée par annonce',      icon: '📅', values: ['30 jours', '60 jours', 'Permanente'] },
        { label: 'Photos par annonce',     icon: '📷', values: ['5', '12', '20'] },
        { label: 'Publication directe',    icon: '⚡', values: [false, true, true] },
        { label: 'Badge sur annonces',     icon: '🏅', values: ['Aucun', '"Agent"', '"Agence certifiée" 🥇'] },
        { label: 'Téléphone visible',      icon: '📞', values: [false, true, true] },
        { label: 'Lien vidéo YouTube',     icon: '🎥', values: [false, true, true] },
        { label: 'Statistiques',           icon: '📊', values: ['Aucune', 'Basiques', 'Complètes'] },
        { label: 'Mises en avant / mois',  icon: '⬆️', values: ['0', '1', '5'] },
        { label: 'Page agence dédiée',     icon: '🏗️', values: [false, false, true] },
        { label: 'Numéro unique obligatoire', icon: '🔒', values: [true, true, true] },
    ]

    const COLS = IMMO_PLANS

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                overflowY: 'auto', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'center', padding: '24px 8px',
                fontFamily: SYSTEM_FONT_STACK,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 700,
                    background: '#12121C',
                    borderRadius: 28, border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'visible',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 24px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '28px 28px 0 0',
                    background: '#12121C',
                }}>
                    <div>
                        <h2 style={{ color: '#F0ECE2', fontSize: 20, fontWeight: 800, margin: 0 }}>
                            Comparaison des plans immobilier
                        </h2>
                        <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>
                            Cliquez sur <span style={{ color: '#3B82F6', fontWeight: 700 }}>?</span> pour comprendre chaque fonctionnalité
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none', color: '#888',
                            fontSize: 18, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Column headers */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                    padding: '16px 16px 8px',
                    background: 'rgba(255,255,255,0.01)',
                }}>
                    <div />
                    {COLS.map(plan => (
                        <div key={plan.id} style={{ textAlign: 'center', padding: '0 4px' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 40, height: 40, borderRadius: 12,
                                background: plan.gradient,
                                fontSize: 20, marginBottom: 6,
                                boxShadow: `0 4px 12px ${plan.shadowColor}`,
                            }}>
                                {plan.emoji}
                            </div>
                            <div style={{ color: plan.color, fontSize: 13, fontWeight: 800 }}>
                                {plan.name}
                            </div>
                            <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
                                {plan.price === 0 ? 'Gratuit' : `${fmt(plan.price)} F/mois`}
                            </div>
                            {plan.popular && (
                                <div style={{
                                    marginTop: 4, display: 'inline-block',
                                    padding: '2px 8px', borderRadius: 6,
                                    background: `${plan.color}15`,
                                    color: plan.color, fontSize: 9, fontWeight: 800,
                                }}>
                                    POPULAIRE
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Rows */}
                <div style={{ padding: '0 16px 24px' }}>
                    {rows.map((row, i) => (
                        <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                            alignItems: 'center',
                            padding: '10px 8px',
                            borderRadius: 10,
                            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                            position: 'relative',
                        }}>
                            {/* Label + tooltip */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>{row.icon}</span>
                                <span style={{ color: '#C0BAA8', fontSize: 12 }}>{row.label}</span>
                                {ROW_TOOLTIPS[row.label] && (
                                    <ImmoTooltip text={ROW_TOOLTIPS[row.label]} />
                                )}
                            </div>
                            {/* Values */}
                            {row.values.map((val, j) => {
                                const plan = COLS[j]
                                return (
                                    <div key={j} style={{ textAlign: 'center' }}>
                                        {typeof val === 'boolean' ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 22, height: 22, borderRadius: 6,
                                                background: val ? `${plan.color}20` : 'rgba(255,255,255,0.03)',
                                                color: val ? plan.color : '#333',
                                                fontSize: 11, fontWeight: 800,
                                            }}>
                                                {val ? '✓' : '—'}
                                            </span>
                                        ) : (
                                            <span style={{
                                                color: val === 'Gratuit' || val === 'Aucun' || val === 'Aucune' || val === '0'
                                                    ? '#555' : '#F0ECE2',
                                                fontSize: 11, fontWeight: val.includes('∞') || val.includes('Illimitées') ? 800 : 400,
                                            }}>
                                                {val}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Anti-cheat note */}
                <div style={{
                    margin: '0 16px 24px',
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(232,168,56,0.04)',
                    border: '1px solid rgba(232,168,56,0.12)',
                }}>
                    <p style={{ color: '#E8A838', fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
                        🔒 <strong>Un seul compte par numéro de téléphone.</strong> Les annonces du plan Particulier sont
                        modérées avant publication pour garantir la qualité de l&apos;annuaire.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// PRICING SECTION IMMOBILIER — avec boutons "?"
// ═══════════════════════════════════════════════════════
export function ImmoPricingSection({
    currentPlan,
    onSelectPlan,
    billing,
    setBilling,
    onSkip,
}: {
    currentPlan: string
    onSelectPlan: (plan: ImmoPlan) => void
    billing: string
    setBilling: (b: string) => void
    onSkip?: () => void
}) {
    const [showComparison, setShowComparison] = useState(false)

    return (
        <div>
            {showComparison && <ImmoPlanComparisonModal onClose={() => setShowComparison(false)} />}

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                {/* Badge catégorie */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 20, marginBottom: 14,
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
                }}>
                    <span style={{ fontSize: 8, color: '#3B82F6' }}>●</span>
                    <span style={{ color: '#3B82F6', fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>
                        PLANS IMMOBILIER
                    </span>
                </div>

                {/* Titre + bouton ? (ouvre la modale de comparaison complète) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
                    <h2 style={{ color: '#F0ECE2', fontSize: 24, fontWeight: 800, margin: 0 }}>
                        Choisissez votre plan
                    </h2>
                    <button
                        onClick={() => setShowComparison(true)}
                        title="Voir la comparaison complète des plans"
                        style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(59,130,246,0.12)',
                            border: '1.5px solid rgba(59,130,246,0.25)',
                            color: '#3B82F6', fontSize: 13, fontWeight: 900,
                            cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                    >
                        ?
                    </button>
                </div>
                <p style={{ color: '#666', fontSize: 13, margin: '0 0 20px' }}>
                    Annonces immobilières au Congo-Brazzaville
                </p>

                {/* Toggle mensuel / annuel */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 0,
                    padding: 4, borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <button
                        onClick={() => setBilling('monthly')}
                        style={{
                            padding: '10px 20px', borderRadius: 11, border: 'none',
                            background: billing === 'monthly' ? 'rgba(59,130,246,0.12)' : 'transparent',
                            color: billing === 'monthly' ? '#3B82F6' : '#666',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        Mensuel
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        style={{
                            padding: '10px 20px', borderRadius: 11, border: 'none',
                            background: billing === 'yearly' ? 'rgba(34,197,94,0.12)' : 'transparent',
                            color: billing === 'yearly' ? '#4ADE80' : '#666',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        Annuel
                        <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                            background: 'rgba(34,197,94,0.15)', color: '#4ADE80',
                        }}>
                            -20%
                        </span>
                    </button>
                </div>
            </div>

            {/* Plan cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {IMMO_PLANS.map((plan) => {
                    const price = plan.price === 0 ? 0
                        : billing === 'monthly' ? plan.price : Math.round(plan.yearlyPrice / 12)
                    const isCurrent = plan.id === currentPlan

                    return (
                        <div key={plan.id} style={{
                            borderRadius: 24, overflow: 'visible',
                            background: plan.popular ? `${plan.color}06` : 'rgba(255,255,255,0.02)',
                            border: plan.popular ? `2px solid ${plan.color}30` : '1px solid rgba(255,255,255,0.04)',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                        }}>
                            {/* Popular banner */}
                            {plan.popular && (
                                <div style={{
                                    background: plan.gradient,
                                    padding: '6px 0', textAlign: 'center',
                                    borderRadius: '22px 22px 0 0',
                                }}>
                                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
                                        🏅 LE CHOIX DES PROFESSIONNELS
                                    </span>
                                </div>
                            )}

                            <div style={{ padding: '24px 22px' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 18,
                                        background: plan.gradient,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 26, boxShadow: `0 4px 16px ${plan.shadowColor}`,
                                        flexShrink: 0,
                                    }}>
                                        {plan.emoji}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ color: '#F0ECE2', fontSize: 20, fontWeight: 800, margin: 0 }}>
                                            {plan.name} {plan.icon}
                                        </h3>
                                        <p style={{ color: '#777', fontSize: 12, margin: '2px 0 0' }}>
                                            {plan.tagline}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        {plan.price === 0 ? (
                                            <div style={{ color: '#4ADE80', fontSize: 24, fontWeight: 800 }}>
                                                Gratuit
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                                    <span style={{ color: plan.color, fontSize: 26, fontWeight: 800 }}>
                                                        {fmt(price)}
                                                    </span>
                                                    <span style={{ color: '#666', fontSize: 12 }}>F/mois</span>
                                                </div>
                                                {billing === 'yearly' && (
                                                    <span style={{ color: '#4ADE80', fontSize: 11, fontWeight: 600 }}>
                                                        -{fmt(plan.price * 12 - plan.yearlyPrice)} F/an
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Key metrics avec tooltips */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    {[
                                        {
                                            value: plan.maxListings === -1 ? '∞' : String(plan.maxListings),
                                            label: 'Annonces',
                                            tip: FEATURE_TOOLTIPS['📋'],
                                        },
                                        {
                                            value: plan.listingDurationDays === -1 ? '∞' : `${plan.listingDurationDays}j`,
                                            label: 'Durée',
                                            tip: FEATURE_TOOLTIPS['📅'],
                                        },
                                        {
                                            value: String(plan.maxPhotos),
                                            label: 'Photos',
                                            tip: FEATURE_TOOLTIPS['📷'],
                                        },
                                    ].map((metric, mi) => (
                                        <div key={mi} style={{
                                            flex: 1, padding: '10px', borderRadius: 12,
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            textAlign: 'center',
                                            position: 'relative',
                                        }}>
                                            <div style={{ color: plan.color, fontSize: 18, fontWeight: 800 }}>
                                                {metric.value}
                                            </div>
                                            <div style={{
                                                color: '#666', fontSize: 10,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2,
                                            }}>
                                                {metric.label}
                                                <ImmoTooltip text={metric.tip} alignRight={mi === 2} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Features avec tooltips */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                                    gap: 6, marginBottom: 18,
                                }}>
                                    {plan.features.map((f, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '6px 8px', borderRadius: 8,
                                            background: f.highlight ? `${plan.color}08` : 'transparent',
                                        }}>
                                            <span style={{
                                                width: 18, height: 18, borderRadius: 6, fontSize: 8,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                                background: f.included ? `${plan.color}15` : 'rgba(255,255,255,0.03)',
                                                color: f.included ? plan.color : '#333',
                                            }}>
                                                {f.included ? '✓' : '—'}
                                            </span>
                                            <span style={{
                                                color: f.included ? (f.highlight ? '#F0ECE2' : '#999') : '#333',
                                                fontSize: 11, fontWeight: f.highlight ? 700 : 400,
                                                flex: 1,
                                            }}>
                                                {f.text}
                                            </span>
                                            {FEATURE_TOOLTIPS[f.icon] && (
                                                <ImmoTooltip text={FEATURE_TOOLTIPS[f.icon]} alignRight />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                {isCurrent ? (
                                    <div style={{
                                        padding: '14px 0', borderRadius: 14, textAlign: 'center',
                                        border: `1.5px solid ${plan.color}33`,
                                        background: `${plan.color}08`,
                                        color: plan.color, fontSize: 14, fontWeight: 700,
                                    }}>
                                        ✓ Votre plan actuel
                                    </div>
                                ) : plan.price === 0 ? (
                                    onSkip ? (
                                        <button
                                            onClick={onSkip}
                                            style={{
                                                width: '100%', padding: '14px 0', borderRadius: 14,
                                                background: 'rgba(255,255,255,0.04)',
                                                color: '#888',
                                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                                border: '1.5px solid rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            Commencer gratuitement
                                        </button>
                                    ) : null
                                ) : (
                                    <button
                                        onClick={() => onSelectPlan(plan)}
                                        style={{
                                            width: '100%', padding: '15px 0', borderRadius: 14,
                                            background: plan.popular ? plan.gradient : 'rgba(255,255,255,0.04)',
                                            color: plan.popular ? '#fff' : plan.color,
                                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                            boxShadow: plan.popular ? `0 6px 20px ${plan.shadowColor}` : 'none',
                                            transition: 'all 0.2s ease',
                                            border: plan.popular ? 'none' : `1.5px solid ${plan.color}30`,
                                        }}
                                    >
                                        {plan.popular ? '🔑 Passer au plan Agent' : `Choisir ${plan.name}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Note sécurité */}
            <div style={{
                marginTop: 20, padding: '14px 16px', borderRadius: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: 10,
            }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                <p style={{ color: '#666', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
                    Un seul compte par numéro de téléphone. Les annonces du plan Particulier sont
                    modérées avant publication. Paiement via MTN Mobile Money ou Airtel Money.
                </p>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// OVERLAY COMPLET (pricing + checkout) — utilisable standalone
// ═══════════════════════════════════════════════════════
export function ImmoUpgradeOverlay({
    currentPlan,
    onClose,
}: {
    currentPlan: string
    onClose: () => void
}) {
    const [view, setView] = useState<'pricing' | 'checkout'>('pricing')
    const [billing, setBilling] = useState('monthly')
    const [selectedPlan, setSelectedPlan] = useState<ImmoPlan | null>(null)

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            overflowY: 'auto',
        }}>
            <div style={{
                maxWidth: 560, margin: '0 auto', padding: '24px 16px',
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #08080E, #0D0D14, #08080E)',
                fontFamily: SYSTEM_FONT_STACK,
            }}>
                {view === 'pricing' && (
                    <>
                        <button
                            onClick={onClose}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'none', border: 'none', color: '#888',
                                fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0,
                            }}
                        >
                            ← Retour au dashboard
                        </button>
                        <ImmoPricingSection
                            currentPlan={currentPlan}
                            billing={billing}
                            setBilling={setBilling}
                            onSelectPlan={(plan) => {
                                setSelectedPlan(plan)
                                setView('checkout')
                            }}
                            onSkip={onClose}
                        />
                    </>
                )}

                {view === 'checkout' && selectedPlan && (
                    <SubscriptionCheckout
                        plan={selectedPlan}
                        billing={billing}
                        onBack={() => setView('pricing')}
                        onComplete={() => { window.location.reload() }}
                    />
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// OVERLAY RÉACTIVATION IMMOBILIER
// ═══════════════════════════════════════════════════════
export function ImmoReactivationOverlay({
    currentPlan,
    onClose,
    onChangeFormula,
}: {
    currentPlan: string
    onClose: () => void
    onChangeFormula: () => void
}) {
    const [billing, setBilling] = useState('monthly')
    const [showCheckout, setShowCheckout] = useState(false)
    const planObj = IMMO_PLANS.find(p => p.id === currentPlan) ?? IMMO_PLANS[1]
    const price = planObj.price === 0 ? 0
        : billing === 'monthly' ? planObj.price : Math.round(planObj.yearlyPrice / 12)
    const savings = planObj.price > 0
        ? Math.round(((planObj.price * 12 - planObj.yearlyPrice) / (planObj.price * 12)) * 100)
        : 0

    if (showCheckout) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                overflowY: 'auto',
            }}>
                <div style={{
                    maxWidth: 560, margin: '0 auto', padding: '24px 16px',
                    minHeight: '100vh',
                    background: 'linear-gradient(180deg, #08080E, #0D0D14, #08080E)',
                    fontFamily: SYSTEM_FONT_STACK,
                }}>
                    <SubscriptionCheckout
                        plan={planObj}
                        billing={billing}
                        onBack={() => setShowCheckout(false)}
                        onComplete={() => window.location.reload()}
                    />
                </div>
            </div>
        )
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            overflowY: 'auto',
        }}>
            <div style={{
                maxWidth: 480, margin: '0 auto', padding: '28px 16px',
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #08080E, #0D0D14, #08080E)',
                fontFamily: SYSTEM_FONT_STACK,
            }}>
                <button
                    onClick={onClose}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', color: '#888',
                        fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0,
                    }}
                >
                    ← Retour au dashboard
                </button>

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 64, height: 64, borderRadius: 20,
                        background: planObj.gradient,
                        fontSize: 32, marginBottom: 16,
                        boxShadow: `0 8px 24px ${planObj.shadowColor}`,
                    }}>
                        {planObj.emoji}
                    </div>
                    <h2 style={{ color: '#F0ECE2', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>
                        Réactiver votre abonnement
                    </h2>
                    <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
                        Remettez vos annonces{' '}
                        <span style={{ color: planObj.color, fontWeight: 700 }}>{planObj.name}</span>{' '}
                        en ligne.
                    </p>
                </div>

                {/* Toggle billing */}
                {planObj.price > 0 && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: 0,
                        background: '#1A1A28', borderRadius: 14, padding: 4,
                        marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        {(['monthly', 'yearly'] as const).map(b => (
                            <button
                                key={b}
                                onClick={() => setBilling(b)}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 10,
                                    background: billing === b ? planObj.color : 'transparent',
                                    color: billing === b ? '#fff' : '#888',
                                    fontWeight: 700, fontSize: 13, border: 'none',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                {b === 'monthly' ? 'Mensuel' : 'Annuel'}
                                {b === 'yearly' && savings > 0 && (
                                    <span style={{
                                        marginLeft: 6, fontSize: 10, fontWeight: 800,
                                        background: billing === 'yearly' ? 'rgba(255,255,255,0.25)' : '#2A2A3A',
                                        color: billing === 'yearly' ? '#fff' : '#4ADE80',
                                        padding: '1px 6px', borderRadius: 6,
                                    }}>
                                        -{savings}%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Plan card */}
                <div style={{
                    background: '#12121C', borderRadius: 24,
                    border: `1.5px solid ${planObj.color}40`,
                    padding: '24px 20px', marginBottom: 20,
                    boxShadow: `0 8px 32px ${planObj.shadowColor}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <span style={{ color: planObj.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Votre plan
                            </span>
                            <h3 style={{ color: '#F0ECE2', fontSize: 24, fontWeight: 900, margin: '4px 0 0' }}>
                                {planObj.icon} {planObj.name}
                            </h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: planObj.color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                                {planObj.price === 0 ? 'Gratuit' : `${fmt(price)} F`}
                            </div>
                            {planObj.price > 0 && (
                                <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                                    {billing === 'monthly' ? '/ mois' : '/ mois (annuel)'}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                        {planObj.features.filter(f => f.included).slice(0, 4).map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 14 }}>{f.icon}</span>
                                <span style={{ color: '#C0BAA8', fontSize: 13, flex: 1 }}>{f.text}</span>
                                {FEATURE_TOOLTIPS[f.icon] && (
                                    <ImmoTooltip text={FEATURE_TOOLTIPS[f.icon]} alignRight />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setShowCheckout(true)}
                    style={{
                        width: '100%', padding: '16px',
                        background: planObj.gradient,
                        color: '#fff', fontWeight: 800, fontSize: 16,
                        borderRadius: 16, border: 'none', cursor: 'pointer',
                        boxShadow: `0 8px 24px ${planObj.shadowColor}`,
                        marginBottom: 16,
                    }}
                >
                    Réactiver mon abonnement {planObj.name} {planObj.icon}
                </button>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={onChangeFormula}
                        style={{
                            background: 'none', border: 'none',
                            color: '#888', fontSize: 13, cursor: 'pointer',
                            textDecoration: 'underline', textUnderlineOffset: 3,
                        }}
                    >
                        Changer de formule →
                    </button>
                </div>
            </div>
        </div>
    )
}
