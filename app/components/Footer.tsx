'use client'

import Link from 'next/link'
import { SYSTEM_FONT_STACK } from '@/lib/systemFontStack'
import { MtnMomoLogo, AirtelMoneyLogo } from '@/app/components/MobileMoneyBranding'
import { BadgeCheck, Smartphone, Tag, Banknote, Mail, MapPin, Heart } from 'lucide-react'

const WA_HREF = 'https://wa.me/242068954321'

function trackWa() {
    void (async () => {
        try {
            const [{ trackBehaviorEvent }, { captureAnalyticsContext }] = await Promise.all([
                import('@/app/actions/behaviorAnalytics'),
                import('@/lib/analytics'),
            ])
            const ctx = captureAnalyticsContext()
            void trackBehaviorEvent({ session_id: ctx.session_id, event_type: 'whatsapp_contact_clicked', source: ctx.source, metadata: { location: 'footer' } })
        } catch {}
    })()
}

function WhatsAppIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
    )
}

const TRUST_BADGES = [
    { Icon: BadgeCheck, text: 'Vendeurs vérifiés',              color: '#E8A838' },
    { Icon: Smartphone, text: 'Paiement direct MTN / Airtel',  color: '#22C55E' },
    { Icon: Tag,        text: 'Publication gratuite',           color: '#3B82F6' },
]

const COLUMNS = [
    {
        title: 'ACHETEURS',
        links: [
            { label: 'Acheter en confiance', href: '/acheter-en-confiance', highlight: true },
            { label: 'Avis sur la plateforme', href: '/avis-mayombe-market' },
            { label: 'Comment commander', href: '/comment-commander' },
            { label: 'Livraison',          href: '/livraison' },
            { label: 'Retours',            href: '/retours' },
            { label: 'FAQ',                href: '/faq' },
        ],
    },
    {
        title: 'VENDEURS',
        links: [
            { label: 'Devenir vendeur',     href: '/devenir-vendeur', highlight: true },
            { label: 'Guide vendeur',       href: '/guide-vendeur' },
            { label: 'Conditions vendeurs', href: '/conditions-vendeurs' },
        ],
    },
    {
        title: 'INFORMATIONS LÉGALES',
        links: [
            { label: 'À propos',            href: '/a-propos' },
            { label: 'Notre mission',       href: '/mission' },
            { label: 'Presse',             href: '/presse' },
            { label: 'Mentions légales',    href: '/mentions-legales' },
            { label: 'CGU',                href: '/cgu' },
            { label: 'Confidentialité',     href: '/confidentialite' },
            { label: 'CGV',                href: '/cgv' },
        ],
    },
]

export default function Footer() {
    return (
        <footer style={{
            background: 'linear-gradient(180deg, #08080E, #060610)',
            fontFamily: SYSTEM_FONT_STACK,
            borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
            {/* ── Badges de confiance ── */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '18px 0' }}>
                <div style={{
                    maxWidth: 1100, margin: '0 auto', padding: '0 24px',
                    display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
                }}>
                    {TRUST_BADGES.map(b => (
                        <div key={b.text} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '8px 14px', borderRadius: 10,
                            background: `${b.color}08`, border: `1px solid ${b.color}18`,
                        }}>
                            <b.Icon size={13} color={b.color} strokeWidth={1.75} />
                            <span style={{ color: b.color, fontSize: 12, fontWeight: 700 }}>{b.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Grille principale ── */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 24px 36px' }}>
                <div className="ftr-grid">
                    {/* Colonne marque */}
                    <div>
                        <img
                            src="/logo.png"
                            alt="Mayombe Market"
                            className="ftr-logo"
                            style={{ height: 88, width: 'auto', objectFit: 'contain', marginBottom: 14 }}
                        />
                        <p style={{ color: '#777', fontSize: 13, lineHeight: 1.8, margin: '0 0 18px', maxWidth: 280 }}>
                            La marketplace congolaise qui connecte acheteurs et vendeurs locaux.
                            Paiements directs via Mobile Money — livraison organisée par chaque vendeur.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <a
                                href="mailto:mayombemarket@gmail.com"
                                style={{ color: '#666', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <Mail size={12} color="#666" /> mayombemarket@gmail.com
                            </a>
                            <span style={{ color: '#555', fontSize: 11, marginTop: -4, paddingLeft: 18 }}>
                                Réponse sous 48 h
                            </span>
                            <a
                                href={WA_HREF}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={trackWa}
                                style={{ color: '#25D366', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <WhatsAppIcon size={12} color="#25D366" /> WhatsApp : +242 06 895 43 21
                            </a>
                        </div>
                    </div>

                    {/* Colonnes liens */}
                    {COLUMNS.map(col => (
                        <div key={col.title}>
                            <h4 style={{
                                color: '#F0ECE2', fontSize: 11, fontWeight: 800,
                                letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 16px',
                            }}>
                                {col.title}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {col.links.map(link => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className="ftr-link"
                                        style={{
                                            color: link.highlight ? '#E8A838' : '#777',
                                            fontSize: 13,
                                            textDecoration: 'none',
                                            fontWeight: link.highlight ? 700 : 400,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {link.highlight && (
                                            <span style={{
                                                padding: '1px 5px', borderRadius: 4, fontSize: 8,
                                                fontWeight: 800, background: 'rgba(232,168,56,0.15)', color: '#E8A838',
                                            }}>
                                                NEW
                                            </span>
                                        )}
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Moyens de paiement ── */}
                <div style={{
                    marginTop: 32, paddingTop: 22,
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                    <span style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Paiement :
                    </span>
                    <MtnMomoLogo className="h-8 w-auto" />
                    <AirtelMoneyLogo className="h-8 w-auto" />
                    <span style={{
                        padding: '5px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        color: '#888', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <Banknote size={12} color="#888" strokeWidth={1.75} /> Cash à la livraison
                    </span>
                </div>
            </div>

            {/* ── Bas de page ── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px' }}>
                    <div className="ftr-bottom">
                        <span style={{ color: '#444', fontSize: 11 }}>
                            © {new Date().getFullYear()} Mayombe Market — Tous droits réservés
                        </span>

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Link href="/cgu"            style={{ color: '#3a3a3a', fontSize: 10, textDecoration: 'none' }}>CGU</Link>
                            <span style={{ color: '#222' }}>·</span>
                            <Link href="/confidentialite" style={{ color: '#3a3a3a', fontSize: 10, textDecoration: 'none' }}>Confidentialité</Link>
                            <span style={{ color: '#222' }}>·</span>
                            <span style={{ color: '#2e2e2e', fontSize: 10 }}>
                                Marketplace — transactions directes entre acheteurs et vendeurs
                            </span>
                        </div>

                        <span style={{ color: '#444', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} color="#444" />
                            Fait avec <Heart size={11} color="#E8A838" fill="#E8A838" style={{ margin: '0 2px' }} /> au Congo
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                .ftr-logo { transition: transform 0.3s ease; }
                .ftr-logo:hover { transform: scale(1.04); }
                .ftr-link:hover { color: #E8A838 !important; }
                .ftr-grid {
                    display: grid;
                    grid-template-columns: 1.4fr 1fr 1fr 1.1fr;
                    gap: 40px;
                }
                .ftr-bottom {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                }
                @media (max-width: 900px) {
                    .ftr-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
                }
                @media (max-width: 480px) {
                    .ftr-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
                    .ftr-bottom { flex-direction: column !important; align-items: center !important; text-align: center !important; }
                }
            `}</style>
        </footer>
    )
}
