"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  {
    number: "01",
    title: "Sélectionnez votre produit",
    desc: "Cliquez sur le produit qui vous intéresse, directement depuis la grille ou la liste. Parcourez nos catégories ou utilisez la recherche pour trouver exactement ce qu'il vous faut.",
    color: "#E8A838",
  },
  {
    number: "02",
    title: "Renseignez vos informations",
    desc: "Indiquez votre nom, numéro de téléphone et adresse de livraison — ville, quartier ou point de repère. C'est tout ce dont nous avons besoin pour vous livrer.",
    color: "#3B82F6",
  },
  {
    number: "03",
    title: "Choisissez votre mode de paiement",
    desc: null,
    color: "#A855F7",
    payments: [
      { name: "Mobile Money", detail: "MTN Mobile Money" },
      { name: "Airtel Money", detail: "Airtel Money" },
      { name: "Paiement à la livraison", detail: "Payez en main propre" },
    ],
  },
  {
    number: "04",
    title: "Confirmez votre commande",
    desc: "Après validation, votre commande est enregistrée instantanément et le vendeur est informé. Vous recevez une confirmation par SMS ou notification.",
    color: "#F97316",
  },
  {
    number: "05",
    title: "Suivez votre commande",
    desc: "Vous recevrez une notification à chaque étape de la livraison pour suivre l'évolution de votre commande jusqu'à sa réception. Restez informé en temps réel.",
    color: "#F43F5E",
  },
];

export default function CommentCommanderPage() {
  const [activeStep, setActiveStep] = useState(0);
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressPulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; }
          50% { box-shadow: 0 0 0 6px transparent; }
        }
        .step-card {
          animation: stepIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .step-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .step-header {
          transition: background 0.3s ease;
        }
        .step-header:hover {
          filter: brightness(0.97);
        }
        .progress-dot {
          transition: all 0.3s ease;
        }
        .progress-dot:hover {
          transform: scale(1.15);
        }
        .payment-row {
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .payment-row:hover {
          background: rgba(168,85,247,0.04) !important;
          border-color: rgba(168,85,247,0.2) !important;
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 768px) {
          .progress-bar { gap: 0 !important; }
          .progress-dot { width: 36px !important; height: 36px !important; font-size: 13px !important; }
          .progress-line { width: clamp(16px, 5vw, 40px) !important; }
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
          Comment commander
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
        <span style={{ color: "#999" }}>Comment commander</span>
      </div>

      {/* ══════════════ INTRO ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>
        <p style={{
          fontSize: 15.5, lineHeight: 1.8, color: "#666", margin: 0, maxWidth: 540,
        }}>
          Commander un produit est simple et rapide. Suivez ces 5 étapes et recevez votre commande chez vous.
        </p>
      </div>

      {/* ══════════════ PROGRESS BAR ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 0" }}>
        <div className="progress-bar" style={{
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40,
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <button
                className="progress-dot"
                onClick={() => setActiveStep(i)}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: `3px solid ${i <= activeStep ? step.color : "#e0e0e0"}`,
                  background: i === activeStep ? step.color : i < activeStep ? `${step.color}15` : "white",
                  color: i === activeStep ? "white" : i < activeStep ? step.color : "#ccc",
                  fontSize: 15, fontWeight: 800,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i < activeStep ? "✓" : step.number}
              </button>
              {i < steps.length - 1 && (
                <div className="progress-line" style={{
                  width: "clamp(24px, 8vw, 80px)", height: 3,
                  background: i < activeStep ? steps[i + 1].color : "#e0e0e0",
                  transition: "background 0.3s", borderRadius: 2,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ══════════════ STEPS ══════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((step, i) => {
            const isActive = i === activeStep;
            return (
              <div
                key={i}
                className="step-card"
                onClick={() => setActiveStep(i)}
                style={{
                  background: "white",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isActive
                    ? `0 8px 32px ${step.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isActive ? step.color + "30" : "transparent"}`,
                  cursor: "pointer",
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div className="step-header" style={{
                  padding: "20px 28px",
                  background: isActive ? `${step.color}06` : "white",
                  display: "flex", alignItems: "center", gap: 16,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: isActive ? step.color : `${step.color}12`,
                    color: isActive ? "white" : step.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 800, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {step.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: step.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Étape {step.number}
                    </div>
                    <div style={{
                      fontSize: 17, fontWeight: 700, color: "#1a1a2e",
                    }}>
                      {step.title}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isActive ? `${step.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isActive ? step.color : "#999",
                    transform: isActive ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </div>

                {isActive && (
                  <div style={{ padding: "0 28px 28px" }}>
                    {step.desc && (
                      <p style={{
                        fontSize: 15, lineHeight: 1.8, color: "#555",
                        margin: "0 0 4px", paddingLeft: 68,
                      }}>
                        {step.desc}
                      </p>
                    )}

                    {step.payments && (
                      <div style={{
                        paddingLeft: 68,
                        display: "flex", flexDirection: "column", gap: 10, marginTop: 4,
                      }}>
                        <p style={{
                          fontSize: 15, color: "#555", margin: "0 0 8px", lineHeight: 1.7,
                        }}>
                          Sélectionnez l'option qui vous convient le mieux :
                        </p>
                        {step.payments.map((p, j) => (
                          <div
                            key={j}
                            className="payment-row"
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              padding: "14px 18px", borderRadius: 12,
                              background: "#fafafa",
                              border: "1px solid #eee",
                            }}
                          >
                            <div style={{
                              width: 40, height: 40, borderRadius: 10,
                              background: `${step.color}10`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}>
                              <div style={{
                                width: 12, height: 12, borderRadius: "50%",
                                background: step.color, opacity: 0.7,
                              }} />
                            </div>
                            <div>
                              <div style={{
                                fontSize: 15, fontWeight: 700, color: "#1a1a2e",
                              }}>
                                {p.name}
                              </div>
                              <div style={{
                                fontSize: 13, color: "#888",
                              }}>
                                {p.detail}
                              </div>
                            </div>
                          </div>
                        ))}
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
