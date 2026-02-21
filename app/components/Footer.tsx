"use client";

import { useState } from "react";

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
      icon: "🏢",
      title: "ENTREPRISE",
      links: [
        { label: "À propos de nous", href: "/a-propos" },
        { label: "Notre mission", href: "/mission" },
        { label: "Presse", href: "/presse" },
      ],
    },
    {
      icon: "🛍️",
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
      icon: "🛒",
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
      icon: "⚖️",
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
    { icon: "📘", label: "Facebook", href: "#", bg: "rgba(24,119,242,0.12)", border: "rgba(24,119,242,0.25)", color: "#1877F2" },
    { icon: "📸", label: "Instagram", href: "#", bg: "rgba(225,48,108,0.12)", border: "rgba(225,48,108,0.25)", color: "#E1306C" },
    { icon: "🎵", label: "TikTok", href: "#", bg: "rgba(255,0,80,0.12)", border: "rgba(255,0,80,0.25)", color: "#FF0050" },
    { icon: "💬", label: "WhatsApp", href: "#", bg: "rgba(37,211,102,0.12)", border: "rgba(37,211,102,0.25)", color: "#25D366" },
    { icon: "🐦", label: "Twitter/X", href: "#", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "#ccc" },
  ];

  const trustBadges = [
    { icon: "🔐", text: "Paiement sécurisé", color: "#22C55E" },
    { icon: "🛡️", text: "Protection acheteur", color: "#3B82F6" },
    { icon: "✅", text: "Vendeurs vérifiés", color: "#E8A838" },
    { icon: "🚚", text: "Livraison suivie", color: "#A855F7" },
  ];

  const payments = ["💳 Visa", "💳 Mastercard", "📱 MTN MoMo", "📱 Airtel Money", "💵 Cash"];

  return (
    <footer style={{
      background: "linear-gradient(180deg, #08080E, #060610)",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      borderTop: "1px solid rgba(255,255,255,0.04)",
      position: "relative",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Subtle gradient glow */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 300,
        background: "radial-gradient(ellipse, rgba(232,168,56,0.03) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ══════════════ COUNTRY BAR ══════════════ */}
      <div style={{
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          flexWrap: "wrap",
        }}>
          <span style={{ color: "#555", fontSize: 12, fontWeight: 600 }}>🌍 Disponible au :</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[
              { flag: "🇨🇬", name: "Congo", active: true },
              { flag: "🇨🇩", name: "RD Congo", active: false },
              { flag: "🇨🇲", name: "Cameroun", active: false },
              { flag: "🇬🇦", name: "Gabon", active: false },
              { flag: "🇸🇳", name: "Sénégal", active: false },
            ].map(c => (
              <span key={c.name} style={{
                padding: "5px 12px", borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: c.active ? "rgba(232,168,56,0.08)" : "rgba(255,255,255,0.02)",
                border: c.active ? "1px solid rgba(232,168,56,0.2)" : "1px solid rgba(255,255,255,0.04)",
                color: c.active ? "#E8A838" : "#444",
                cursor: c.active ? "default" : "not-allowed",
                transition: "all 0.2s ease",
              }}>
                {c.flag} {c.name} {!c.active && <span style={{ fontSize: 9, opacity: 0.6 }}>Bientôt</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════ TRUST BADGES ══════════════ */}
      <div style={{
        padding: "24px 0",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "0 24px",
          display: "flex", justifyContent: "center", gap: 16,
          flexWrap: "wrap",
        }}>
          {trustBadges.map(b => (
            <div key={b.text} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 12,
              background: `${b.color}08`,
              border: `1px solid ${b.color}18`,
            }}>
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              <span style={{ color: b.color, fontSize: 12, fontWeight: 700 }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ MAIN FOOTER ══════════════ */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "48px 24px 40px",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 40,
        }}>
          {/* ── Brand column ── */}
          <div>
            {/* Logo */}
            <div style={{ marginBottom: 16 }}>
              <img
                src="/logo.png"
                alt="Mayombe Market"
                className="footer-logo"
                style={{ height: 80, width: "auto", objectFit: "contain" }}
              />
            </div>

            <p style={{
              color: "#777", fontSize: 13, lineHeight: 1.8, margin: "0 0 20px",
              maxWidth: 280,
            }}>
              Votre destination mode & lifestyle au cœur de l'Afrique.
              Nous connectons les créateurs locaux aux amoureux du style.
              Chaque achat soutient un entrepreneur congolais.
            </p>

            {/* Newsletter */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#999", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>
                📬 Recevez nos bons plans
              </p>
              <div style={{
                display: "flex", gap: 0, borderRadius: 12, overflow: "hidden",
                border: "1.5px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
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
                    cursor: "pointer", whiteSpace: "nowrap",
                    transition: "all 0.3s ease",
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
                    fontSize: 18, textDecoration: "none",
                    transition: "all 0.2s ease",
                    transform: "scale(1)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {s.icon}
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
                <span style={{ fontSize: 14 }}>{col.icon}</span>
                {col.title}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(link => (
                  <a
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
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Legal column (full width row below) ── */}
        <div style={{
          marginTop: 36, paddingTop: 28,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
        }}>
          {/* Legal links */}
          <div>
            <h4 style={{
              color: "#F0ECE2", fontSize: 12, fontWeight: 800,
              letterSpacing: 1.2, textTransform: "uppercase",
              margin: "0 0 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>⚖️</span>
              LÉGAL
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {columns[3].links.map(link => (
                <a
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
                </a>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <h4 style={{
              color: "#F0ECE2", fontSize: 12, fontWeight: 800,
              letterSpacing: 1.2, textTransform: "uppercase",
              margin: "0 0 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>💳</span>
              MOYENS DE PAIEMENT
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {payments.map(p => (
                <span key={p} style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#888", fontSize: 12, fontWeight: 500,
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ BOTTOM BAR ══════════════ */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(0,0,0,0.2)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          padding: "20px 24px",
        }}>
          {/* Company legal info */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center",
            gap: 8, marginBottom: 14,
          }}>
            {[
              "MAYOMBE MARKET SARL",
              "Siège social : Avenue de la Paix, Brazzaville, Congo",
              "RCCM : CG-BZV-01-2026-B14-00247",
              "NIF : 2026-031-0058",
            ].map((info, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#444", fontSize: 11 }}>{info}</span>
                {i < 3 && <span style={{ color: "#2a2a2a", margin: "0 2px" }}>·</span>}
              </span>
            ))}
          </div>

          {/* Contact line */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center",
            gap: 16, marginBottom: 14,
          }}>
            <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              📧 contact@mayombemarket.com
            </span>
            <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              📞 +242 06 895 43 21
            </span>
            <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              💬 WhatsApp : +242 06 895 43 21
            </span>
          </div>

          {/* Divider */}
          <div style={{
            height: 1, background: "rgba(255,255,255,0.03)",
            margin: "0 0 14px",
          }} />

          {/* Copyright + bottom text */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "space-between",
            alignItems: "center", gap: 12,
          }}>
            <span style={{ color: "#444", fontSize: 11 }}>
              © 2026 Mayombe Market — Tous droits réservés
            </span>

            <p style={{
              color: "#3a3a3a", fontSize: 10, margin: 0,
              maxWidth: 420, textAlign: "center", lineHeight: 1.6,
            }}>
              Mayombe Market est une marketplace qui connecte vendeurs indépendants et acheteurs.
              Les transactions sont effectuées directement entre le vendeur et l'acheteur.
              Mayombe Market agit en qualité d'intermédiaire technique et ne peut être tenu responsable
              des produits vendus par les vendeurs tiers.
            </p>

            <span style={{ color: "#444", fontSize: 11 }}>
              🇨🇬 Fait avec ❤️ au Congo
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════ MOBILE VERSION ══════════════ */}
      <style>{`
        @keyframes footerLogoGlow {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 0px rgba(232,168,56,0));
          }
          50% {
            filter: brightness(1.15) drop-shadow(0 0 12px rgba(232,168,56,0.35));
          }
        }
        .footer-logo {
          animation: footerLogoGlow 3s ease-in-out infinite;
          transition: transform 0.3s ease;
        }
        .footer-logo:hover {
          transform: scale(1.05);
        }
        @media (max-width: 768px) {
          footer > div:nth-child(4) > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          footer > div:nth-child(4) > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
