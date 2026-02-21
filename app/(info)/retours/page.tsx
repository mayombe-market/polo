"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const policies = [
  {
    number: "01",
    title: "Produit endommagé ou incorrect",
    color: "#F43F5E",
    content: "Si le produit reçu est endommagé, défectueux ou ne correspond pas à votre commande, nous proposons un remboursement ou un échange sans complication.",
    badge: { text: "Remboursement garanti", color: "#F43F5E" },
    note: null,
    steps: null,
  },
  {
    number: "02",
    title: "Changement d'avis",
    color: "#F97316",
    content: "Si le produit ne correspond pas à vos attentes mais est en bon état, nous offrons la possibilité d'un échange contre un autre produit de valeur équivalente.",
    badge: { text: "Échange possible", color: "#F97316" },
    note: "Il est de votre responsabilité de faire vos choix avec précision avant de confirmer la commande.",
    steps: null,
  },
  {
    number: "03",
    title: "Produits non éligibles",
    color: "#6b7280",
    content: "Certains produits périssables ou personnalisés ne sont pas éligibles aux retours ou remboursements.",
    badge: null,
    note: null,
    steps: null,
  },
  {
    number: "04",
    title: "Comment demander un retour ou un échange",
    color: "#E8A838",
    content: null,
    badge: null,
    note: null,
    steps: [
      { num: "1", text: "Contactez notre service client via WhatsApp, e-mail ou formulaire en ligne." },
      { num: "2", text: "Expliquez le problème et, si possible, joignez une photo du produit." },
      { num: "3", text: "Une fois le retour validé, nous organisons l'échange ou le remboursement dans un délai de 3 à 5 jours ouvrables." },
    ],
  },
  {
    number: "05",
    title: "Livraison des retours",
    color: "#3B82F6",
    content: "Nous pouvons organiser la collecte du produit ou vous indiquer un point de dépôt local, selon votre localisation et la logistique disponible.",
    badge: null,
    note: null,
    steps: null,
  },
];

export default function RetoursPage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .policy-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .policy-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .policy-header {
          transition: background 0.3s ease;
        }
        .policy-header:hover {
          filter: brightness(0.97);
        }
        .step-row {
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .step-row:hover {
          background: rgba(232,168,56,0.04) !important;
          border-color: rgba(232,168,56,0.2) !important;
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
          fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Retours & remboursements
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
        <span style={{ color: "#999" }}>Retours & remboursements</span>
      </div>

      {/* ══════════════ GUARANTEE BANNER ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "white", borderRadius: 16,
          padding: "20px 28px",
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
              Protection acheteur Mayombe Market
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Tous les achats sont couverts par notre politique de satisfaction. Échange ou remboursement en cas de problème.
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ POLICIES ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {policies.map((p, idx) => {
            const isExpanded = expandedId === p.number;
            return (
              <div
                key={p.number}
                className="policy-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${p.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? p.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                <button
                  className="policy-header"
                  onClick={() => setExpandedId(isExpanded ? null : p.number)}
                  style={{
                    width: "100%",
                    padding: "22px 28px",
                    border: "none",
                    background: isExpanded ? `${p.color}06` : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpanded ? p.color : `${p.color}12`,
                    color: isExpanded ? "white" : p.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {p.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: p.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Article {p.number}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                      {p.title}
                    </div>
                  </div>
                  {p.badge && !isExpanded && (
                    <span style={{
                      background: `${p.badge.color}12`,
                      color: p.badge.color,
                      padding: "4px 12px", borderRadius: 50,
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {p.badge.text}
                    </span>
                  )}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isExpanded ? `${p.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isExpanded ? p.color : "#999",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 28px 28px" }}>
                    {p.content && (
                      <p style={{
                        fontSize: 15, lineHeight: 1.8, color: "#555",
                        margin: 0, paddingLeft: 64,
                      }}>
                        {p.content}
                      </p>
                    )}

                    {p.badge && (
                      <div style={{ paddingLeft: 64, marginTop: 12 }}>
                        <span style={{
                          background: `${p.badge.color}12`,
                          color: p.badge.color,
                          padding: "6px 16px", borderRadius: 50,
                          fontSize: 13, fontWeight: 700,
                        }}>
                          ✓ {p.badge.text}
                        </span>
                      </div>
                    )}

                    {p.steps && (
                      <div style={{
                        paddingLeft: 64,
                        display: "flex", flexDirection: "column", gap: 12,
                      }}>
                        {p.steps.map((s, j) => (
                          <div
                            key={j}
                            className="step-row"
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 14,
                              padding: "14px 18px", borderRadius: 12,
                              background: "#fafafa", border: "1px solid #eee",
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: `${p.color}10`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 800, color: p.color,
                              flexShrink: 0,
                            }}>
                              {s.num}
                            </div>
                            <div>
                              <div style={{
                                fontSize: 11, fontWeight: 700, color: p.color,
                                textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
                              }}>
                                Étape {s.num}
                              </div>
                              <div style={{ fontSize: 15, color: "#444", lineHeight: 1.6 }}>
                                {s.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {p.note && (
                      <div style={{
                        marginTop: 16, padding: "14px 18px", borderRadius: 12,
                        background: `${p.color}06`,
                        borderLeft: `3px solid ${p.color}`,
                        fontSize: 13, lineHeight: 1.7, color: "#555",
                        marginLeft: 64, fontStyle: "italic",
                      }}>
                        {p.note}
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
