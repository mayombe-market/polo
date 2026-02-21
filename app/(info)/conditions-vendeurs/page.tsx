"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const conditions = [
  {
    id: "identite",
    number: "01",
    title: "Être légalement identifié",
    color: "#E8A838",
    items: [
      "Être majeur (18 ans minimum)",
      "Disposer d'une pièce d'identité valide",
      "Avoir un numéro de téléphone actif",
      "Être enregistré comme commerçant (si activité formelle)",
    ],
    note: "Au lancement, les vendeurs semi-formels sont également acceptés sous réserve d'une vérification d'identité rigoureuse.",
  },
  {
    id: "produits",
    number: "02",
    title: "Proposer des produits conformes",
    color: "#3B82F6",
    items: [
      "Produits légaux en République du Congo",
      "Aucune contrefaçon tolérée",
      "Pas de produits dangereux ou interdits",
      "Produits en bon état et conformes à leur description",
    ],
    note: null,
  },
  {
    id: "qualite",
    number: "03",
    title: "Respecter les standards de qualité",
    color: "#A855F7",
    items: [
      "Photos claires, réelles et fidèles au produit",
      "Description honnête et détaillée",
      "Prix transparent, sans frais cachés",
      "Disponibilité réelle du stock affichée",
    ],
    note: null,
  },
  {
    id: "logistique",
    number: "04",
    title: "Engagement logistique",
    color: "#F97316",
    items: [
      "Préparer les commandes sous 24 à 48 heures",
      "Être disponible pour la coordination des livraisons",
      "Respecter les délais annoncés aux clients",
      "Assurer le suivi jusqu'à la réception du colis",
    ],
    note: null,
  },
  {
    id: "valeurs",
    number: "05",
    title: "Adhérer aux valeurs de Mayombe Market",
    color: "#F43F5E",
    items: [
      "Honnêteté dans chaque transaction",
      "Respect et courtoisie envers les clients",
      "Professionnalisme en toutes circonstances",
      "Engagement envers le développement local congolais",
    ],
    note: null,
  },
];

export default function ConditionsVendeursPage() {
  const [expandedId, setExpandedId] = useState<string | null>("identite");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .cond-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .cond-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .cond-header-btn {
          transition: background 0.3s ease;
        }
        .cond-header-btn:hover {
          filter: brightness(0.97);
        }
        .cta-card {
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
        }
        .cta-card:hover {
          transform: perspective(800px) rotateY(1deg) rotateX(-1deg) translateZ(10px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.18);
        }
        .cta-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cta-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 768px) {
          .cond-card button { padding: 18px 20px !important; }
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
          Conditions vendeurs
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
        <span style={{ color: "#999" }}>Conditions vendeurs</span>
      </div>

      {/* ══════════════ INTRO ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>
        <p style={{
          fontSize: 15.5, lineHeight: 1.8, color: "#666", margin: 0,
          maxWidth: 620,
        }}>
          Rejoignez une communauté de vendeurs congolais engagés.
          Voici les critères à respecter pour vendre sur notre plateforme.
        </p>
      </div>

      {/* ══════════════ CONDITIONS ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {conditions.map((c, idx) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className="cond-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${c.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? c.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                <button
                  className="cond-header-btn"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  style={{
                    width: "100%",
                    padding: "24px 28px",
                    border: "none",
                    background: isExpanded ? `${c.color}08` : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpanded ? c.color : `${c.color}12`,
                    color: isExpanded ? "white" : c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {c.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: c.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Condition {c.number}
                    </div>
                    <div style={{
                      fontSize: 17, fontWeight: 700, color: "#1a1a2e",
                    }}>
                      {c.title}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isExpanded ? `${c.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isExpanded ? c.color : "#999",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 28px 28px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {c.items.map((item, i) => (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredItem(`${c.id}-${i}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 14,
                            padding: "12px 16px", borderRadius: 12,
                            background: hoveredItem === `${c.id}-${i}` ? `${c.color}06` : "#fafafa",
                            transition: "background 0.2s",
                          }}
                        >
                          <div style={{
                            width: 24, height: 24, borderRadius: 8,
                            background: `${c.color}12`, color: c.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1,
                          }}>
                            ✓
                          </div>
                          <span style={{
                            fontSize: 15, color: "#333", lineHeight: 1.6,
                          }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    {c.note && (
                      <div style={{
                        marginTop: 16, padding: "14px 18px", borderRadius: 12,
                        background: `${c.color}06`,
                        borderLeft: `3px solid ${c.color}`,
                        fontSize: 13, lineHeight: 1.7, color: "#555",
                        fontStyle: "italic",
                      }}>
                        {c.note}
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
