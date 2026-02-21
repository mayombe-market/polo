"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const sections: Section[] = [
  {
    number: "01",
    title: "Données que nous collectons",
    color: "#E8A838",
    content: null,
    groups: [
      {
        label: "Informations personnelles",
        items: ["Nom", "Adresse", "Numéro de téléphone", "E-mail"],
      },
      {
        label: "Informations de paiement",
        items: ["Mobile Money", "Airtel Money", "Autres méthodes de paiement"],
        note: "Nous ne stockons pas vos informations bancaires complètes.",
      },
      {
        label: "Informations de navigation",
        items: ["Pages consultées", "Produits regardés", "Préférences et cookies"],
      },
      {
        label: "Communications",
        items: ["Messages et demandes via notre service client"],
      },
    ],
  },
  {
    number: "02",
    title: "Utilisation de vos données",
    color: "#3B82F6",
    items: [
      "Traiter et suivre vos commandes",
      "Gérer les paiements et livraisons",
      "Améliorer nos produits et services",
      "Communiquer avec vous sur votre commande ou nos promotions (si vous acceptez)",
      "Analyser le trafic et améliorer l'expérience utilisateur sur notre site",
    ],
  },
  {
    number: "03",
    title: "Partage des données",
    color: "#A855F7",
    intro: "Nous ne vendons jamais vos informations personnelles à des tiers. Nous pouvons partager vos données avec :",
    items: [
      "Nos partenaires logistiques pour la livraison des commandes",
      "Nos prestataires techniques pour le fonctionnement du site et l'analyse des données",
      "Les autorités lorsque la loi l'exige",
    ],
  },
  {
    number: "04",
    title: "Sécurité des données",
    color: "#F43F5E",
    intro: "Nous utilisons des mesures de sécurité appropriées pour protéger vos informations contre :",
    items: [
      "L'accès non autorisé",
      "La perte ou la divulgation accidentelle",
      "Les modifications non autorisées",
    ],
  },
  {
    number: "05",
    title: "Vos droits",
    color: "#F97316",
    intro: "Vous avez le droit de :",
    items: [
      "Accéder à vos données personnelles",
      "Corriger ou mettre à jour vos informations",
      "Demander la suppression de vos données",
      "Refuser certaines utilisations de vos données (marketing, cookies)",
    ],
    note: "Pour exercer vos droits, contactez notre service client.",
  },
  {
    number: "06",
    title: "Conservation des données",
    color: "#06B6D4",
    content: "Vos données sont conservées uniquement le temps nécessaire pour remplir la finalité pour laquelle elles ont été collectées, conformément à la loi et à la sécurité de vos informations.",
  },
  {
    number: "07",
    title: "Modifications de la politique",
    color: "#6b7280",
    content: "Nous pouvons mettre à jour cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec la date de mise à jour.",
  },
];

interface Group {
  label: string;
  items: string[];
  note?: string;
}

interface Section {
  number: string;
  title: string;
  color: string;
  content?: string | null;
  intro?: string;
  items?: string[];
  groups?: Group[];
  note?: string;
}

export default function ConfidentialitePage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .priv-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .priv-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .priv-header {
          transition: background 0.3s ease;
        }
        .priv-header:hover {
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

      {/* ══════════════ TOP BAR ══════════════ */}
      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "24px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{
          fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Politique de confidentialité
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
        <span style={{ color: "#999" }}>Politique de confidentialité</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>

        {/* ══════════════ TRUST BANNER ══════════════ */}
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
              Vos données sont en sécurité
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Nous ne vendons jamais vos informations. Elles sont protégées et utilisées uniquement pour améliorer votre expérience.
            </div>
          </div>
        </div>

        {/* ══════════════ SECTIONS ══════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((s, idx) => {
            const isExpanded = expandedId === s.number;
            return (
              <div
                key={s.number}
                className="priv-card"
                style={{
                  background: "white", borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${s.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? s.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                <button
                  className="priv-header"
                  onClick={() => setExpandedId(isExpanded ? null : s.number)}
                  style={{
                    width: "100%", padding: "22px 28px",
                    border: "none",
                    background: isExpanded ? `${s.color}06` : "white",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpanded ? s.color : `${s.color}12`,
                    color: isExpanded ? "white" : s.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {s.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: s.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Article {s.number}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                      {s.title}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isExpanded ? `${s.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isExpanded ? s.color : "#999",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 28px 28px", paddingLeft: 92 }}>
                    {s.content && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: 0 }}>
                        {s.content}
                      </p>
                    )}

                    {s.intro && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: "0 0 14px" }}>
                        {s.intro}
                      </p>
                    )}

                    {s.groups && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {s.groups.map((g, gi) => (
                          <div key={gi} style={{
                            background: "#fafafa", borderRadius: 12,
                            padding: "16px 18px", border: "1px solid #eee",
                          }}>
                            <div style={{
                              display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                            }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: `${s.color}12`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <div style={{
                                  width: 10, height: 10, borderRadius: 3,
                                  background: s.color, opacity: 0.6,
                                }} />
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
                                {g.label}
                              </span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {g.items.map((item, ii) => (
                                <span key={ii} style={{
                                  background: `${s.color}10`, color: s.color,
                                  padding: "4px 14px", borderRadius: 50,
                                  fontSize: 13, fontWeight: 600,
                                }}>
                                  {item}
                                </span>
                              ))}
                            </div>
                            {g.note && (
                              <div style={{
                                marginTop: 10, fontSize: 12, color: "#888", fontStyle: "italic",
                              }}>
                                {g.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {s.items && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {s.items.map((item, ii) => (
                          <div key={ii} style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "10px 14px", borderRadius: 10, background: "#fafafa",
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6,
                              background: `${s.color}12`, color: s.color,
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

                    {s.note && (
                      <div style={{
                        marginTop: 14, padding: "12px 16px", borderRadius: 10,
                        background: `${s.color}06`,
                        borderLeft: `3px solid ${s.color}`,
                        fontSize: 13, lineHeight: 1.7, color: "#555", fontStyle: "italic",
                      }}>
                        {s.note}
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
