"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  num: string;
  text: string;
}

interface Tip {
  text: string;
}

interface Section {
  number: string;
  title: string;
  color: string;
  items?: string[];
  steps?: Step[];
  tips?: Tip[];
  note?: string;
}

const sections: Section[] = [
  {
    number: "01",
    title: "Pourquoi devenir vendeur ?",
    color: "#E8A838",
    items: [
      "Accédez à une plateforme e-commerce qui connecte la ville et les zones éloignées",
      "Valorisez vos produits et votre savoir-faire auprès d'une clientèle plus large",
      "Gagnez en visibilité grâce à nos outils marketing et logistiques",
    ],
  },
  {
    number: "02",
    title: "Comment créer votre compte vendeur",
    color: "#3B82F6",
    steps: [
      { num: "1", text: "Rendez-vous sur la page \"Devenir Vendeur\"" },
      { num: "2", text: "Remplissez vos informations : nom, adresse, téléphone, email, type d'activité" },
      { num: "3", text: "Fournissez une pièce d'identité pour vérification" },
      { num: "4", text: "Attendez la validation de votre compte par l'équipe Mayombe Market" },
    ],
  },
  {
    number: "03",
    title: "Ajouter vos produits",
    color: "#A855F7",
    items: [
      "Titre clair et descriptif",
      "Photos de qualité montrant le produit sous différents angles",
      "Description détaillée : dimensions, matériaux, usage, couleurs",
      "Prix transparent et indication du stock disponible",
    ],
    note: "Soyez précis : toute erreur dans les informations peut entraîner des retours ou des insatisfactions client.",
  },
  {
    number: "04",
    title: "Gestion des commandes",
    color: "#F97316",
    items: [
      "Vérifiez régulièrement vos commandes dans votre tableau de bord vendeur",
      "Préparez les commandes dans les délais indiqués",
      "Confirmez l'expédition et informez le client si nécessaire",
      "Suivez les livraisons pour assurer la satisfaction client",
    ],
  },
  {
    number: "05",
    title: "Paiement",
    color: "#F43F5E",
    items: [
      "Les paiements se font via Mayombe Market selon votre mode choisi (Mobile Money, Airtel Money, etc.)",
      "Les fonds sont généralement transférés après confirmation de la livraison ou selon le mode choisi",
    ],
  },
  {
    number: "06",
    title: "Retours et remboursement",
    color: "#6b7280",
    items: [
      "Pour tout produit endommagé ou non conforme, collaborez avec le client et l'équipe service client",
      "Respectez nos conditions de retour et échange pour garantir la satisfaction et la confiance",
    ],
  },
  {
    number: "07",
    title: "Bonnes pratiques",
    color: "#06B6D4",
    tips: [
      { text: "Mettez régulièrement à jour votre stock et vos prix" },
      { text: "Répondez rapidement aux messages clients" },
      { text: "Soignez vos photos et descriptions" },
      { text: "Respectez les délais de livraison pour fidéliser vos clients" },
    ],
  },
];

export default function GuideVendeurPage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .guide-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .guide-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .guide-header {
          transition: background 0.3s ease;
        }
        .guide-header:hover {
          filter: brightness(0.97);
        }
        .tip-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .tip-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 640px) {
          .tips-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "24px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Guide Vendeurs
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
        <span style={{ color: "#999" }}>Guide vendeurs</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>

        {/* BANNER */}
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
              Espace vendeur
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Tout ce que vous devez savoir pour vendre sur Mayombe Market et développer votre activité.
            </div>
          </div>
        </div>

        {/* SECTIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((s, idx) => {
            const isExpanded = expandedId === s.number;
            return (
              <div
                key={s.number}
                className="guide-card"
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
                  className="guide-header"
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
                      Section {s.number}
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
                    {/* Numbered steps */}
                    {s.steps && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {s.steps.map((step, j) => (
                          <div key={j} style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "14px 18px", borderRadius: 12,
                            background: "#fafafa", border: "1px solid #eee",
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: s.color, color: "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 800, flexShrink: 0,
                            }}>
                              {step.num}
                            </div>
                            <span style={{ fontSize: 15, color: "#444", lineHeight: 1.6 }}>
                              {step.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tips grid */}
                    {s.tips && (
                      <div
                        className="tips-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 12,
                        }}
                      >
                        {s.tips.map((tip, j) => (
                          <div key={j} className="tip-card" style={{
                            background: "#fafafa", borderRadius: 12,
                            padding: "18px 16px", textAlign: "center",
                            border: "1px solid #eee",
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: `${s.color}10`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              margin: "0 auto 10px",
                            }}>
                              <div style={{
                                width: 12, height: 12, borderRadius: 4,
                                background: s.color, opacity: 0.6,
                              }} />
                            </div>
                            <span style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                              {tip.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Standard items */}
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

                    {/* Note */}
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
