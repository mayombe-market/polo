"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Badge {
  text: string;
  color: string;
}

interface Tip {
  text: string;
}

interface FAQ {
  number: string;
  q: string;
  color: string;
  a?: string;
  intro?: string;
  items?: string[];
  badge?: Badge;
  tips?: Tip[];
  note?: string;
}

const faqs: FAQ[] = [
  {
    number: "01",
    q: "Comment devenir vendeur sur Mayombe Market ?",
    color: "#E8A838",
    a: "Il suffit de remplir le formulaire \"Devenir vendeur\", fournir vos informations (nom, contact, activité) ainsi qu'une pièce d'identité pour vérification. Après validation par notre équipe, vous pourrez commencer à vendre.",
  },
  {
    number: "02",
    q: "Qui peut vendre sur la plateforme ?",
    color: "#3B82F6",
    a: "Tout artisan, commerçant, créateur ou entrepreneur proposant des produits légaux et conformes aux réglementations en vigueur.",
  },
  {
    number: "03",
    q: "Y a-t-il des frais pour s'inscrire ?",
    color: "#A855F7",
    a: "L'inscription est gratuite. Mayombe Market applique une commission sur chaque vente réalisée (selon les conditions définies).",
    badge: { text: "Inscription gratuite", color: "#E8A838" },
  },
  {
    number: "04",
    q: "Comment ajouter un produit ?",
    color: "#F97316",
    intro: "Depuis votre tableau de bord vendeur :",
    items: [
      "Ajoutez un titre clair",
      "Téléchargez des photos de qualité",
      "Rédigez une description précise",
      "Indiquez le prix et le stock disponible",
    ],
  },
  {
    number: "05",
    q: "Comment suis-je informé d'une commande ?",
    color: "#F43F5E",
    a: "Vous recevez une notification dès qu'un client passe commande. Vous devez préparer le produit dans le délai indiqué.",
  },
  {
    number: "06",
    q: "Comment fonctionne le paiement ?",
    color: "#3B82F6",
    a: "Le paiement s'effectue via les solutions proposées sur la plateforme (Mobile Money, Airtel Money, etc.). Les fonds sont transférés selon les modalités définies après confirmation de la livraison.",
  },
  {
    number: "07",
    q: "Que se passe-t-il en cas de retour ?",
    color: "#F43F5E",
    items: [
      "Si le produit est endommagé ou incorrect : remboursement ou échange.",
      "En cas de changement d'avis du client : échange possible selon les conditions.",
    ],
    note: "Le vendeur doit coopérer avec le service client pour résoudre la situation rapidement.",
  },
  {
    number: "08",
    q: "Puis-je modifier mes prix ou mon stock ?",
    color: "#A855F7",
    a: "Oui. Il est de votre responsabilité de maintenir vos informations à jour afin d'éviter les erreurs ou annulations.",
  },
  {
    number: "09",
    q: "Comment améliorer mes ventes ?",
    color: "#E8A838",
    tips: [
      { text: "Utilisez des photos claires et professionnelles" },
      { text: "Rédigez des descriptions détaillées" },
      { text: "Respectez les délais de préparation" },
      { text: "Proposez des prix compétitifs" },
    ],
  },
  {
    number: "10",
    q: "Puis-je vendre dans plusieurs villes ?",
    color: "#06B6D4",
    a: "Oui, sous réserve de la disponibilité logistique et des zones couvertes par Mayombe Market.",
  },
];

export default function FAQPage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .faq-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .faq-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .faq-header {
          transition: background 0.3s ease;
        }
        .faq-header:hover {
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
          FAQ Vendeurs
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
        <span style={{ color: "#999" }}>FAQ</span>
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
              Questions fréquentes
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Les réponses aux questions les plus fréquentes de nos vendeurs sur Mayombe Market.
            </div>
          </div>
        </div>

        {/* FAQS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {faqs.map((f, idx) => {
            const isExpanded = expandedId === f.number;
            return (
              <div
                key={f.number}
                className="faq-card"
                style={{
                  background: "white", borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${f.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? f.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                <button
                  className="faq-header"
                  onClick={() => setExpandedId(isExpanded ? null : f.number)}
                  style={{
                    width: "100%", padding: "22px 28px",
                    border: "none",
                    background: isExpanded ? `${f.color}06` : "white",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpanded ? f.color : `${f.color}12`,
                    color: isExpanded ? "white" : f.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {f.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: f.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Question {f.number}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                      {f.q}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isExpanded ? `${f.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isExpanded ? f.color : "#999",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 28px 28px", paddingLeft: 92 }}>
                    {f.a && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: 0 }}>
                        {f.a}
                      </p>
                    )}

                    {f.badge && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{
                          background: `${f.badge.color}12`,
                          color: f.badge.color,
                          padding: "6px 16px", borderRadius: 50,
                          fontSize: 13, fontWeight: 700,
                        }}>
                          ✓ {f.badge.text}
                        </span>
                      </div>
                    )}

                    {f.intro && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: "0 0 12px" }}>
                        {f.intro}
                      </p>
                    )}

                    {f.items && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {f.items.map((item, ii) => (
                          <div key={ii} style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "10px 14px", borderRadius: 10, background: "#fafafa",
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6,
                              background: `${f.color}12`, color: f.color,
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

                    {f.tips && (
                      <div
                        className="tips-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 10,
                        }}
                      >
                        {f.tips.map((tip, j) => (
                          <div key={j} className="tip-card" style={{
                            background: "#fafafa", borderRadius: 12,
                            padding: "16px 14px", textAlign: "center",
                            border: "1px solid #eee",
                          }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 10,
                              background: `${f.color}10`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              margin: "0 auto 8px",
                            }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: 3,
                                background: f.color, opacity: 0.6,
                              }} />
                            </div>
                            <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                              {tip.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {f.note && (
                      <div style={{
                        marginTop: 14, padding: "12px 16px", borderRadius: 10,
                        background: `${f.color}06`,
                        borderLeft: `3px solid ${f.color}`,
                        fontSize: 13, lineHeight: 1.7, color: "#555", fontStyle: "italic",
                      }}>
                        {f.note}
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
