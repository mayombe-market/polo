"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const features = [
  {
    title: "Livraison rapide et fiable",
    desc: "Nous livrons vos produits en ville et dans les zones périphériques, grâce à notre réseau de partenaires logistiques fiables.",
    color: "#E8A838",
  },
  {
    title: "Suivi en temps réel",
    desc: "Dès que votre commande est confirmée, vous recevez des notifications à chaque étape : préparation, expédition et livraison.",
    color: "#3B82F6",
  },
  {
    title: "Sécurité et soin",
    desc: "Chaque produit est emballé avec soin pour garantir qu'il arrive chez vous en parfait état.",
    color: "#A855F7",
  },
];

const deliveryOptions = [
  {
    title: "Livraison standard",
    delay: "1 à 5 jours",
    detail: "Selon votre localisation",
    color: "#3B82F6",
  },
  {
    title: "Livraison express",
    delay: "24 à 48h",
    detail: "Disponible dans certaines zones",
    color: "#E8A838",
  },
];

const pricingInfo = [
  "Calculés automatiquement en fonction du poids, du volume et de la distance",
  "Possibilité de livraison gratuite sur certaines promotions ou pour certaines commandes",
];

const trackingSteps = [
  { label: "Commande confirmée", color: "#E8A838" },
  { label: "En préparation", color: "#3B82F6" },
  { label: "En livraison", color: "#F97316" },
  { label: "Livrée", color: "#A855F7" },
];

export default function LivraisonPage() {
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .livr-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .livr-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
          transform: translateY(-4px);
        }
        .opt-card {
          animation: condCardIn 0.4s ease-out both;
          transition: all 0.3s ease;
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 640px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .options-grid { grid-template-columns: 1fr !important; }
          .tracking-row { gap: 4px !important; }
          .tracking-line { width: 20px !important; }
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
          Livraison
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
        <span style={{ color: "#999" }}>Livraison</span>
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
              Livraison partout au Congo
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Rapide, fiable et soignée. Vos produits livrés jusque chez vous.
            </div>
          </div>
        </div>

        {/* FEATURES CARDS */}
        <div
          className="features-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="livr-card"
              style={{
                background: "white",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                borderTop: `4px solid ${f.color}`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${f.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 5,
                  background: f.color, opacity: 0.7,
                }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* TRACKING TIMELINE */}
        <div style={{
          background: "white", borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          marginBottom: 36,
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 800, margin: "0 0 28px", textAlign: "center",
            background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Suivi de votre commande
          </h2>
          <div
            className="tracking-row"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              flexWrap: "wrap", gap: 0,
            }}
          >
            {trackingSteps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: `${step.color}12`,
                    border: `3px solid ${step.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 8px",
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: step.color,
                    }} />
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: step.color, maxWidth: 90,
                  }}>
                    {step.label}
                  </div>
                </div>
                {i < trackingSteps.length - 1 && (
                  <div
                    className="tracking-line"
                    style={{
                      width: "clamp(20px, 6vw, 60px)", height: 3,
                      background: `linear-gradient(90deg, ${step.color}, ${trackingSteps[i + 1].color})`,
                      borderRadius: 2, margin: "0 8px", marginBottom: 28,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DELIVERY OPTIONS */}
        <h2 style={{
          fontSize: 20, fontWeight: 800, margin: "0 0 20px", textAlign: "center",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Options de livraison
        </h2>
        <div
          className="options-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {deliveryOptions.map((opt, i) => (
            <div
              key={i}
              className="opt-card"
              onMouseEnter={() => setHoveredOption(i)}
              onMouseLeave={() => setHoveredOption(null)}
              style={{
                background: "white",
                borderRadius: 16,
                padding: 28,
                border: `2px solid ${hoveredOption === i ? opt.color + "40" : opt.color + "15"}`,
                textAlign: "center",
                boxShadow: hoveredOption === i
                  ? `0 12px 32px ${opt.color}18`
                  : "0 2px 8px rgba(0,0,0,0.04)",
                transform: hoveredOption === i ? "translateY(-6px)" : "translateY(0)",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${opt.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: opt.color, opacity: 0.7,
                }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", margin: "0 0 12px" }}>
                {opt.title}
              </h3>
              <div style={{
                display: "inline-block",
                background: opt.color,
                color: "white",
                padding: "6px 18px", borderRadius: 50,
                fontSize: 15, fontWeight: 700,
                marginBottom: 10,
              }}>
                {opt.delay}
              </div>
              <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{opt.detail}</p>
            </div>
          ))}
        </div>

        {/* PRICING */}
        <div style={{
          background: "white", borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 800, margin: "0 0 20px", textAlign: "center",
            background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Frais de livraison
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pricingInfo.map((text, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 18px", borderRadius: 12,
                background: "#fafafa", border: "1px solid #eee",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "#E8A83810",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 4,
                    background: "#E8A838", opacity: 0.6,
                  }} />
                </div>
                <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: 0 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
