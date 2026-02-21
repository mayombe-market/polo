"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const cookieTypes = [
  {
    name: "Cookies essentiels",
    desc: "Nécessaires au fonctionnement du site (ex. mémorisation de votre session ou panier).",
    color: "#E8A838",
    required: true,
  },
  {
    name: "Cookies de performance",
    desc: "Nous aident à comprendre comment les visiteurs utilisent le site pour améliorer l'expérience.",
    color: "#3B82F6",
    required: false,
  },
  {
    name: "Cookies fonctionnels",
    desc: "Mémorisent vos préférences (langue, choix de ville, mode d'affichage).",
    color: "#A855F7",
    required: false,
  },
  {
    name: "Cookies marketing",
    desc: "Permettent de vous proposer des contenus ou promotions adaptées à vos intérêts.",
    color: "#F97316",
    required: false,
  },
];

const sections = [
  {
    number: "01",
    title: "Consentement",
    color: "#A855F7",
    content: "En continuant à naviguer sur le site, vous acceptez l'utilisation des cookies. Vous pouvez modifier vos préférences à tout moment via les paramètres cookies disponibles sur le site.",
  },
  {
    number: "02",
    title: "Gestion et suppression des cookies",
    color: "#F97316",
    content: "Vous pouvez supprimer ou bloquer les cookies directement depuis votre navigateur, mais certaines fonctionnalités du site pourraient ne plus fonctionner correctement.",
  },
  {
    number: "03",
    title: "Protection de vos données",
    color: "#F43F5E",
    content: "Les informations collectées via les cookies ne sont jamais vendues et sont utilisées uniquement pour améliorer votre expérience sur Mayombe Market.",
  },
];

export default function CookiesPage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const [toggles, setToggles] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: false });
  const router = useRouter();

  const handleToggle = (idx: number) => {
    setToggles((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cookie-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .cookie-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .cookie-header {
          transition: background 0.3s ease;
        }
        .cookie-header:hover {
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
          fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Politique de cookies
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
        <span style={{ color: "#999" }}>Politique de cookies</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>

        {/* ══════════════ WHAT IS A COOKIE ══════════════ */}
        <div style={{
          background: "white", borderRadius: 16,
          padding: "28px 32px", marginBottom: 32,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          borderLeft: "4px solid #E8A838",
          display: "flex", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "#E8A83810",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 6,
              background: "linear-gradient(135deg, #E8A838, #F97316)",
            }} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}>
              Qu'est-ce qu'un cookie ?
            </h2>
            <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: 0 }}>
              Un cookie est un petit fichier enregistré sur votre appareil lorsque vous naviguez sur notre site. Il permet de mémoriser vos préférences, améliorer votre expérience et nous aider à analyser la performance de notre site.
            </p>
          </div>
        </div>

        {/* ══════════════ COOKIE TYPES WITH TOGGLES ══════════════ */}
        <h2 style={{
          fontSize: 20, fontWeight: 800, margin: "0 0 20px", textAlign: "center",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Les types de cookies que nous utilisons
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
          {cookieTypes.map((c, i) => (
            <div
              key={i}
              className="cookie-card"
              style={{
                background: "white", borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: 16,
                border: `1px solid ${c.color}12`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${c.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: c.color, opacity: 0.7,
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
                    {c.name}
                  </span>
                  {c.required && (
                    <span style={{
                      background: `${c.color}12`, color: c.color,
                      padding: "2px 10px", borderRadius: 50,
                      fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: 1,
                    }}>
                      Obligatoire
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 }}>
                  {c.desc}
                </p>
              </div>
              <div
                onClick={() => !c.required && handleToggle(i)}
                style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: c.required || toggles[i] ? c.color : "#ddd",
                  cursor: c.required ? "not-allowed" : "pointer",
                  position: "relative",
                  transition: "background 0.3s",
                  flexShrink: 0,
                  opacity: c.required ? 0.7 : 1,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "white",
                  position: "absolute", top: 3,
                  left: c.required || toggles[i] ? 25 : 3,
                  transition: "left 0.3s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════ OTHER SECTIONS ══════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((s, idx) => {
            const isExpanded = expandedId === s.number;
            return (
              <div
                key={s.number}
                className="cookie-card"
                style={{
                  background: "white", borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${s.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? s.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                <button
                  className="cookie-header"
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
                  <div style={{ padding: "0 28px 24px" }}>
                    <p style={{
                      fontSize: 15, lineHeight: 1.8, color: "#555",
                      margin: 0, paddingLeft: 64,
                    }}>
                      {s.content}
                    </p>
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
