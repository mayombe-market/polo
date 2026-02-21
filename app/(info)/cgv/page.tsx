"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const articles = [
  {
    number: "01",
    title: "Objet",
    color: "#E8A838",
    content:
      "Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des transactions effectuées sur la plateforme Mayombe Market. En passant commande, vous acceptez sans réserve les présentes conditions.",
  },
  {
    number: "02",
    title: "Inscription et compte utilisateur",
    color: "#3B82F6",
    content:
      "Pour passer commande, vous devez créer un compte avec des informations exactes et à jour. Vous êtes responsable de la confidentialité de vos identifiants. Toute activité réalisée depuis votre compte est sous votre responsabilité.",
  },
  {
    number: "03",
    title: "Produits et prix",
    color: "#A855F7",
    items: [
      "Les produits sont décrits et présentés avec la plus grande exactitude possible.",
      "Les prix sont indiqués en Francs CFA (XAF) et incluent les taxes applicables.",
      "Les frais de livraison sont calculés séparément et affichés avant validation de la commande.",
      "Mayombe Market se réserve le droit de modifier les prix à tout moment, sans effet rétroactif sur les commandes déjà validées.",
    ],
  },
  {
    number: "04",
    title: "Commandes",
    color: "#F97316",
    content:
      "Toute commande validée constitue un engagement ferme. Vous recevrez une confirmation par SMS ou notification. En cas d'indisponibilité d'un produit après validation, nous vous en informerons et proposerons un remboursement ou un produit alternatif.",
  },
  {
    number: "05",
    title: "Paiement",
    color: "#F43F5E",
    intro: "Les moyens de paiement acceptés sont :",
    items: [
      "Mobile Money (MTN Mobile Money)",
      "Airtel Money",
      "Paiement à la livraison (selon disponibilité)",
    ],
    note: "Le paiement est sécurisé. Aucune information bancaire complète n'est stockée sur nos serveurs.",
  },
  {
    number: "06",
    title: "Livraison",
    color: "#06B6D4",
    items: [
      "Les délais de livraison sont estimatifs et dépendent de la localisation et de la disponibilité logistique.",
      "Mayombe Market met tout en œuvre pour respecter les délais annoncés.",
      "En cas de retard significatif, vous serez informé et pourrez annuler votre commande si vous le souhaitez.",
    ],
  },
  {
    number: "07",
    title: "Retours et remboursements",
    color: "#E8A838",
    content:
      "Les conditions de retour et de remboursement sont détaillées dans notre politique de retours. En résumé : tout produit endommagé, défectueux ou non conforme peut faire l'objet d'un échange ou d'un remboursement sous conditions.",
  },
  {
    number: "08",
    title: "Responsabilités",
    color: "#3B82F6",
    items: [
      "Mayombe Market agit en tant qu'intermédiaire entre acheteurs et vendeurs.",
      "Nous ne sommes pas responsables des défauts liés aux produits vendus par des tiers, mais nous nous engageons à intervenir en cas de litige.",
      "En cas de force majeure, nos obligations peuvent être suspendues sans indemnité.",
    ],
  },
  {
    number: "09",
    title: "Propriété intellectuelle",
    color: "#A855F7",
    content:
      "L'ensemble du contenu du site (textes, images, logos, design) est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable de Mayombe Market.",
  },
  {
    number: "10",
    title: "Modification des CGV",
    color: "#6b7280",
    content:
      "Mayombe Market se réserve le droit de modifier les présentes CGV à tout moment. Les modifications seront publiées sur cette page avec la date de mise à jour. Les CGV applicables sont celles en vigueur au moment de la commande.",
  },
];

export default function CGVPage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cgv-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .cgv-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .cgv-header {
          transition: background 0.3s ease;
        }
        .cgv-header:hover {
          filter: brightness(0.97);
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "24px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{
          fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Conditions Générales de Vente
        </h1>
        <button
          className="back-btn"
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 50,
            background: "#1a1a2e", border: "none",
            color: "#E8A838", fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "12px 20px 0",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, color: "#bbb",
      }}>
        <a href="/" style={{ color: "#ccc", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#E8A838"}
          onMouseLeave={e => e.currentTarget.style.color = "#ccc"}
        >Accueil</a>
        <span style={{ color: "#ddd" }}>›</span>
        <span style={{ color: "#999" }}>Conditions Générales de Vente</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>

        {/* TRUST BANNER */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "white", borderRadius: 16,
          padding: "20px 28px", marginBottom: 32,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          borderLeft: "4px solid #E8A838",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "#E8A83810",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: "linear-gradient(135deg, #E8A838, #F97316)",
            }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8A838", marginBottom: 2 }}>
              Transparence et confiance
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Nos conditions encadrent chaque transaction pour garantir une expérience juste et sécurisée pour tous.
            </div>
          </div>
        </div>

        {/* ARTICLES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {articles.map((a, idx) => {
            const isExpanded = expandedId === a.number;
            return (
              <div
                key={a.number}
                className="cgv-card"
                style={{
                  background: "white", borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${a.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? a.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                <button
                  className="cgv-header"
                  onClick={() => setExpandedId(isExpanded ? null : a.number)}
                  style={{
                    width: "100%", padding: "22px 28px",
                    border: "none",
                    background: isExpanded ? `${a.color}06` : "white",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpanded ? a.color : `${a.color}12`,
                    color: isExpanded ? "white" : a.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {a.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: a.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Article {a.number}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                      {a.title}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isExpanded ? `${a.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isExpanded ? a.color : "#999",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 28px 28px", paddingLeft: 92 }}>
                    {a.content && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: 0 }}>
                        {a.content}
                      </p>
                    )}

                    {a.intro && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: "0 0 14px" }}>
                        {a.intro}
                      </p>
                    )}

                    {a.items && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {a.items.map((item, ii) => (
                          <div key={ii} style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "10px 14px", borderRadius: 10, background: "#fafafa",
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6,
                              background: `${a.color}12`, color: a.color,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
                            }}>
                              ✓
                            </div>
                            <span style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.note && (
                      <div style={{
                        marginTop: 14, padding: "12px 16px", borderRadius: 10,
                        background: `${a.color}06`,
                        borderLeft: `3px solid ${a.color}`,
                        fontSize: 13, lineHeight: 1.7, color: "#555", fontStyle: "italic",
                      }}>
                        {a.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
