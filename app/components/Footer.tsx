"use client";

import { useState } from "react";
import Link from "next/link";
import {
    MtnMomoLogo,
    AirtelMoneyLogo,
    MobileMoneyTrustLine,
} from "@/app/components/MobileMoneyBranding";
import { SYSTEM_FONT_STACK } from "@/lib/systemFontStack";
import {
    Building2, ShoppingBag, LifeBuoy, Scale,
    Lock, ShieldCheck, BadgeCheck, Truck,
    Globe, Mail, Phone, MessageCircle,
    Smartphone, Banknote, Heart, MapPin,
} from "lucide-react";

// ─── SVG brand icons réseaux sociaux ──────────────────────────────────────────
function FacebookIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    )
}

function InstagramIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none" />
        </svg>
    )
}

function TikTokIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
        </svg>
    )
}

function WhatsAppIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
    )
}

function XIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    )
}

export default function Footer() {
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);

    const handleSubscribe = () => {
        if (email.includes("@")) {
            setSubscribed(true);
            setTimeout(() => setSubscribed(false), 4000);
            setEmail("");
        }
    };

    const columns = [
        {
            Icon: Building2,
            title: "ENTREPRISE",
            links: [
                { label: "À propos de nous", href: "/a-propos" },
                { label: "Notre mission", href: "/mission" },
                { label: "Presse", href: "/presse" },
            ],
        },
        {
            Icon: ShoppingBag,
            title: "VENDEURS",
            links: [
                { label: "Devenir vendeur", href: "/devenir-vendeur", highlight: true },
                { label: "Centre vendeur", href: "/vendeur" },
                { label: "Tarification & commissions", href: "/tarification" },
                { label: "Guide vendeur", href: "/guide-vendeur" },
                { label: "Conditions vendeurs", href: "/conditions-vendeurs" },
            ],
        },
        {
            Icon: LifeBuoy,
            title: "ASSISTANCE",
            links: [
                { label: "Comment commander", href: "/comment-commander" },
                { label: "Livraison", href: "/livraison" },
                { label: "Retours & remboursements", href: "/retours" },
                { label: "FAQ", href: "/faq" },
                { label: "Service client", href: "/contact" },
            ],
        },
        {
            Icon: Scale,
            title: "LÉGAL",
            links: [
                { label: "Mentions légales", href: "/mentions-legales" },
                { label: "CGU", href: "/cgu" },
                { label: "Conditions Générales de Vente", href: "/cgv" },
                { label: "Politique de confidentialité", href: "/confidentialite" },
                { label: "Politique de cookies", href: "/cookies" },
            ],
        },
    ];

    const socials = [
        { Component: FacebookIcon,  label: "Facebook",  href: "#", bg: "rgba(24,119,242,0.12)",  border: "rgba(24,119,242,0.25)",  color: "#1877F2" },
        { Component: InstagramIcon, label: "Instagram", href: "#", bg: "rgba(225,48,108,0.12)",  border: "rgba(225,48,108,0.25)",  color: "#E1306C" },
        { Component: TikTokIcon,    label: "TikTok",    href: "#", bg: "rgba(255,0,80,0.12)",    border: "rgba(255,0,80,0.25)",    color: "#FF0050" },
        { Component: WhatsAppIcon,  label: "WhatsApp",  href: "#", bg: "rgba(37,211,102,0.12)",  border: "rgba(37,211,102,0.25)", color: "#25D366" },
        { Component: XIcon,         label: "Twitter/X", href: "#", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "#ccc" },
    ];

    const trustBadges = [
        { Icon: Lock,       text: "Paiement sécurisé",   color: "#22C55E" },
        { Icon: ShieldCheck, text: "Protection acheteur", color: "#3B82F6" },
        { Icon: BadgeCheck, text: "Vendeurs vérifiés",    color: "#E8A838" },
        { Icon: Truck,      text: "Livraison suivie",     color: "#A855F7" },
    ];

    return (
        <footer style={{
            background: "linear-gradient(180deg, #08080E, #060610)",
            fontFamily: SYSTEM_FONT_STACK,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            position: "relative",
            overflow: "hidden",
        }}>

            {/* Subtle gradient glow */}
            <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 600, height: 300,
                background: "radial-gradient(ellipse, rgba(232,168,56,0.03) 0%, transparent 70%)",
                pointerEvents: "none",
            }} />

            {/* ══════════════ COUNTRY BAR ══════════════ */}
            <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{
                    maxWidth: 1100, margin: "0 auto", padding: "0 24px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
                    flexWrap: "wrap",
                }}>
                    <span style={{ color: "#555", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Globe size={13} color="#555" /> Disponible au :
                    </span>
                    <div className="footer-country-pills" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {[
                            { flag: "🇨🇬", name: "Congo",    active: true },
                            { flag: "🇨🇩", name: "RD Congo", active: false },
                            { flag: "🇨🇲", name: "Cameroun", active: false },
                            { flag: "🇬🇦", name: "Gabon",    active: false },
                            { flag: "🇸🇳", name: "Sénégal",  active: false },
                        ].map(c => (
                            <span key={c.name} style={{
                                padding: "5px 12px", borderRadius: 8,
                                fontSize: 12, fontWeight: 600,
                                background: c.active ? "rgba(232,168,56,0.08)" : "rgba(255,255,255,0.02)",
                                border: c.active ? "1px solid rgba(232,168,56,0.2)" : "1px solid rgba(255,255,255,0.04)",
                                color: c.active ? "#E8A838" : "#444",
                                cursor: c.active ? "default" : "not-allowed",
                            }}>
                                {c.flag} {c.name} {!c.active && <span style={{ fontSize: 9, opacity: 0.6 }}>Bientôt</span>}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ TRUST BADGES ══════════════ */}
            <div style={{ padding: "24px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{
                    maxWidth: 1100, margin: "0 auto", padding: "0 24px",
                    display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap",
                }} className="footer-trust-badges">
                    {trustBadges.map(b => (
                        <div key={b.text} className="footer-trust-badge" style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 18px", borderRadius: 12,
                            background: `${b.color}08`, border: `1px solid ${b.color}18`,
                        }}>
                            <b.Icon size={15} color={b.color} strokeWidth={1.75} />
                            <span style={{ color: b.color, fontSize: 12, fontWeight: 700 }}>{b.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ MAIN FOOTER ══════════════ */}
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 40px" }}>
                <div className="footer-main-grid" style={{
                    display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 40,
                }}>
                    {/* ── Brand column ── */}
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <img
                                src="/logo.png"
                                alt="Mayombe Market"
                                className="footer-logo"
                                style={{ height: 80, width: "auto", objectFit: "contain" }}
                            />
                        </div>

                        <p className="footer-brand-text" style={{
                            color: "#777", fontSize: 13, lineHeight: 1.8, margin: "0 0 20px", maxWidth: 280,
                        }}>
                            Votre destination mode & lifestyle au cœur de l'Afrique.
                            Nous connectons les créateurs locaux aux amoureux du style.
                            Chaque achat soutient un entrepreneur congolais.
                        </p>

                        {/* Newsletter */}
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ color: "#999", fontSize: 12, fontWeight: 600, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                                <Mail size={12} color="#999" /> Recevez nos bons plans
                            </p>
                            <div style={{
                                display: "flex", gap: 0, borderRadius: 12, overflow: "hidden",
                                border: "1.5px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)",
                            }}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="votre@email.com"
                                    onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                                    style={{
                                        flex: 1, padding: "12px 14px", border: "none",
                                        background: "transparent", color: "#F0ECE2",
                                        fontSize: 13, outline: "none", minWidth: 0,
                                    }}
                                />
                                <button
                                    onClick={handleSubscribe}
                                    style={{
                                        padding: "12px 18px", border: "none",
                                        background: subscribed ? "#22C55E" : "linear-gradient(135deg, #E8A838, #D4782F)",
                                        color: "#fff", fontSize: 12, fontWeight: 700,
                                        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.3s ease",
                                    }}
                                >
                                    {subscribed ? "✓ Inscrit !" : "S'inscrire"}
                                </button>
                            </div>
                        </div>

                        {/* Social links */}
                        <div style={{ display: "flex", gap: 8 }}>
                            {socials.map(s => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    title={s.label}
                                    style={{
                                        width: 40, height: 40, borderRadius: 12,
                                        background: s.bg, border: `1px solid ${s.border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        textDecoration: "none", transition: "all 0.2s ease", transform: "scale(1)",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                >
                                    <s.Component size={17} color={s.color} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* ── Link columns ── */}
                    {columns.slice(0, 3).map(col => (
                        <div key={col.title}>
                            <h4 style={{
                                color: "#F0ECE2", fontSize: 12, fontWeight: 800,
                                letterSpacing: 1.2, textTransform: "uppercase",
                                margin: "0 0 18px",
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <col.Icon size={13} color="#F0ECE2" strokeWidth={1.75} />
                                {col.title}
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {col.links.map(link => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        onMouseEnter={() => setHoveredLink(link.label)}
                                        onMouseLeave={() => setHoveredLink(null)}
                                        style={{
                                            color: hoveredLink === link.label ? "#E8A838" : link.highlight ? "#E8A838" : "#777",
                                            fontSize: 13, textDecoration: "none",
                                            fontWeight: link.highlight ? 700 : 400,
                                            transition: "color 0.2s ease",
                                            display: "flex", alignItems: "center", gap: 6,
                                        }}
                                    >
                                        {link.highlight && <span style={{
                                            padding: "1px 6px", borderRadius: 4, fontSize: 8, fontWeight: 800,
                                            background: "rgba(232,168,56,0.15)", color: "#E8A838",
                                        }}>NEW</span>}
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Legal + Paiements ── */}
                <div style={{
                    marginTop: 36, paddingTop: 28,
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
                }} className="footer-legal-grid">
                    {/* Legal */}
                    <div>
                        <h4 style={{
                            color: "#F0ECE2", fontSize: 12, fontWeight: 800,
                            letterSpacing: 1.2, textTransform: "uppercase",
                            margin: "0 0 14px",
                            display: "flex", alignItems: "center", gap: 8,
                        }}>
                            <Scale size={13} color="#F0ECE2" strokeWidth={1.75} />
                            LÉGAL
                        </h4>
                        <div className="footer-legal-links" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {columns[3].links.map(link => (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    onMouseEnter={() => setHoveredLink(link.label)}
                                    onMouseLeave={() => setHoveredLink(null)}
                                    style={{
                                        color: hoveredLink === link.label ? "#E8A838" : "#666",
                                        fontSize: 12, textDecoration: "none",
                                        padding: "6px 14px", borderRadius: 8,
                                        background: "rgba(255,255,255,0.02)",
                                        border: "1px solid rgba(255,255,255,0.04)",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Paiements */}
                    <div>
                        <h4 style={{
                            color: "#F0ECE2", fontSize: 12, fontWeight: 800,
                            letterSpacing: 1.2, textTransform: "uppercase",
                            margin: "0 0 14px",
                            display: "flex", alignItems: "center", gap: 8,
                        }}>
                            <Smartphone size={13} color="#F0ECE2" strokeWidth={1.75} />
                            MOYENS DE PAIEMENT
                        </h4>
                        <div className="footer-payment-pills" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                                <MtnMomoLogo className="h-9 w-auto" />
                                <AirtelMoneyLogo className="h-9 w-auto" />
                                <span style={{
                                    padding: "6px 14px", borderRadius: 8,
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "#aaa", fontSize: 12, fontWeight: 600,
                                    display: "flex", alignItems: "center", gap: 6,
                                }}>
                                    <Banknote size={13} color="#aaa" strokeWidth={1.75} />
                                    Cash à la livraison
                                </span>
                            </div>
                            <MobileMoneyTrustLine className="text-[#9ca3af]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════ BOTTOM BAR ══════════════ */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>

                    {/* Company legal info */}
                    <div className="footer-company-info" style={{
                        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 14,
                    }}>
                        {[
                            "MAYOMBE MARKET SARL",
                            "Siège social : Avenue de la Paix, Brazzaville, Congo",
                            "RCCM : CG-BZV-01-2026-B14-00247",
                            "NIF : 2026-031-0058",
                        ].map((info, i) => (
                            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ color: "#444", fontSize: 11 }}>{info}</span>
                                {i < 3 && <span className="footer-dot" style={{ color: "#2a2a2a", margin: "0 2px" }}>·</span>}
                            </span>
                        ))}
                    </div>

                    {/* Contact */}
                    <div className="footer-contact-line" style={{
                        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 14,
                    }}>
                        <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                            <Mail size={11} color="#555" /> contact@mayombemarket.com
                        </span>
                        <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                            <Phone size={11} color="#555" /> +242 06 895 43 21
                        </span>
                        <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                            <WhatsAppIcon size={11} color="#555" /> WhatsApp : +242 06 895 43 21
                        </span>
                    </div>

                    <div style={{ height: 1, background: "rgba(255,255,255,0.03)", margin: "0 0 14px" }} />

                    {/* Copyright */}
                    <div className="footer-bottom-row" style={{
                        display: "flex", flexWrap: "wrap", justifyContent: "space-between",
                        alignItems: "center", gap: 12,
                    }}>
                        <span style={{ color: "#444", fontSize: 11 }}>
                            © 2026 Mayombe Market — Tous droits réservés
                        </span>

                        <p className="footer-disclaimer" style={{
                            color: "#3a3a3a", fontSize: 10, margin: 0,
                            maxWidth: 420, textAlign: "center", lineHeight: 1.6,
                        }}>
                            Mayombe Market est une marketplace qui connecte vendeurs indépendants et acheteurs.
                            Les transactions sont effectuées directement entre le vendeur et l'acheteur.
                            Mayombe Market agit en qualité d'intermédiaire technique et ne peut être tenu responsable
                            des produits vendus par les vendeurs tiers.
                        </p>

                        <span style={{ color: "#444", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                            <MapPin size={11} color="#444" />
                            Fait avec
                            <Heart size={11} color="#E8A838" fill="#E8A838" style={{ margin: "0 2px" }} />
                            au Congo
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════════ STYLES ══════════════ */}
            <style>{`
                @keyframes footerLogoGlow {
                    0%, 100% { filter: brightness(1) drop-shadow(0 0 0px rgba(232,168,56,0)); }
                    50% { filter: brightness(1.15) drop-shadow(0 0 12px rgba(232,168,56,0.35)); }
                }
                .footer-logo { animation: footerLogoGlow 3s ease-in-out infinite; transition: transform 0.3s ease; }
                .footer-logo:hover { transform: scale(1.05); }
                @media (max-width: 768px) {
                    .footer-main-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
                    .footer-legal-grid { grid-template-columns: 1fr !important; }
                    .footer-bottom-row { flex-direction: column !important; align-items: center !important; text-align: center !important; }
                    .footer-country-pills { justify-content: center !important; }
                    .footer-trust-badges { gap: 8px !important; }
                    .footer-trust-badge { padding: 8px 12px !important; }
                    .footer-brand-text { max-width: 100% !important; }
                    .footer-company-info { flex-direction: column !important; align-items: center !important; gap: 4px !important; }
                    .footer-company-info .footer-dot { display: none !important; }
                    .footer-contact-line { flex-direction: column !important; align-items: center !important; gap: 8px !important; }
                    .footer-disclaimer { max-width: 100% !important; }
                    .footer-legal-links a, .footer-payment-pills span { font-size: 11px !important; padding: 5px 10px !important; }
                }
            `}</style>
        </footer>
    );
}
