"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const engagements = [
  {
    title: "Accès pour tous",
    desc: "Des produits de qualité à des prix que chaque famille congolaise peut se permettre.",
    color: "#E8A838",
  },
  {
    title: "Vendeurs congolais d'abord",
    desc: "Priorité aux artisans et entrepreneurs locaux pour valoriser le savoir-faire du Congo.",
    color: "#F97316",
  },
  {
    title: "Livraison fiable",
    desc: "Un réseau logistique adapté aux réalités du terrain congolais, jusque dans les quartiers.",
    color: "#3B82F6",
  },
  {
    title: "Économie locale",
    desc: "Chaque achat sur Mayombe Market soutient l'économie congolaise et crée de l'emploi chez nous.",
    color: "#F43F5E",
  },
];

export default function MissionPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(30px) rotateX(8deg); }
          to { opacity: 1; transform: translateY(0) rotateX(0deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float3d {
          0%, 100% { transform: perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0); }
          25% { transform: perspective(600px) rotateX(2deg) rotateY(3deg) translateZ(8px); }
          50% { transform: perspective(600px) rotateX(-1deg) rotateY(-2deg) translateZ(14px); }
          75% { transform: perspective(600px) rotateX(2deg) rotateY(-3deg) translateZ(8px); }
        }
        @keyframes orbFloat {
          0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          33% { transform: translate(20px, -15px) scale(1.15); opacity: 0.7; }
          66% { transform: translate(-15px, 10px) scale(0.9); opacity: 0.5; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
        }
        @keyframes spinSlow {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes valueOrbit {
          from { transform: rotate(0deg) translateX(6px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(6px) rotate(-360deg); }
        }
        .mission-card {
          animation: cardEntrance 0.6s ease-out both;
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
        }
        .mission-card:hover {
          transform: perspective(800px) rotateY(2deg) rotateX(-1deg) translateZ(15px) !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15) !important;
        }
        .engagement-card {
          animation: float3d 6s ease-in-out infinite;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .engagement-card:hover {
          animation-play-state: paused;
          transform: perspective(600px) translateZ(30px) scale(1.04) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.12) !important;
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 768px) {
          .engagements-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══════════════ TOP BAR ══════════════ */}
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "24px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Notre Mission
        </h1>
        <button
          className="back-btn"
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 50,
            background: "#1a1a2e",
            border: "none",
            color: "#E8A838", fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "12px 20px 0",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, color: "#bbb",
      }}>
        <a href="/" style={{ color: "#ccc", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#E8A838"}
          onMouseLeave={e => e.currentTarget.style.color = "#ccc"}
        >Accueil</a>
        <span style={{ color: "#ddd" }}>›</span>
        <span style={{ color: "#999" }}>Notre mission</span>
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* ── Mission ── */}
        <div
          className="mission-card"
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #2d2d4a)",
            borderRadius: 20,
            padding: "48px 40px",
            color: "white",
            position: "relative",
            overflow: "hidden",
            marginBottom: 24,
            animationDelay: "0s",
          }}
        >
          {/* Animated orbs */}
          <div style={{
            position: "absolute", top: -30, right: -30,
            width: 140, height: 140, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,168,56,0.08), transparent 70%)",
            animation: "orbFloat 7s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -20, left: "30%",
            width: 100, height: 100, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.06), transparent 70%)",
            animation: "orbFloat 5s ease-in-out infinite reverse",
            pointerEvents: "none",
          }} />

          <div style={{
            fontSize: 12, textTransform: "uppercase", letterSpacing: 3,
            color: "#E8A838", marginBottom: 12, fontWeight: 700,
            position: "relative", zIndex: 1,
          }}>
            Notre Mission
          </div>
          <h2 style={{
            fontSize: 26, fontWeight: 800, margin: "0 0 24px", lineHeight: 1.3,
            position: "relative", zIndex: 1,
          }}>
            Transformer le commerce au Congo
          </h2>
          <p style={{
            fontSize: 15.5, lineHeight: 1.9, opacity: 0.85, margin: "0 0 16px",
            position: "relative", zIndex: 1,
          }}>
            Mayombe Market est né pour relever un double défi. D'un côté,
            permettre à chaque Congolais — en ville comme dans les zones plus
            éloignées — d'accéder facilement à des produits de qualité, à des
            prix justes, sans complications ni attentes interminables. De
            l'autre, offrir aux artisans, créateurs et entrepreneurs congolais
            une véritable vitrine digitale pour développer leur activité,
            élargir leur clientèle et valoriser leur savoir-faire. Notre
            ambition est simple : connecter les territoires, rapprocher les
            communautés et rendre le commerce accessible partout.
          </p>
          <p style={{
            fontSize: 15.5, lineHeight: 1.9, opacity: 0.85, margin: 0,
            position: "relative", zIndex: 1,
          }}>
            Nous construisons ce pont. Mayombe Market connecte ceux qui créent
            et ceux qui achètent, avec la conviction que le commerce en ligne
            peut changer la vie des familles congolaises au quotidien. Chaque
            commande passée, c'est un foyer qui trouve ce dont il a besoin et un
            vendeur congolais qui vit de son travail.
          </p>
        </div>

        {/* ── Vision ── */}
        <div
          className="mission-card"
          style={{
            background: "white",
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
            position: "relative",
            overflow: "hidden",
            marginBottom: 40,
            border: "1px solid rgba(0,0,0,0.04)",
            animationDelay: "0.15s",
          }}
        >
          {/* Shimmer top line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, transparent, #E8A838, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }} />
          {/* Decorative orb */}
          <div style={{
            position: "absolute", top: -20, right: -20,
            width: 120, height: 120, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,168,56,0.05), transparent 70%)",
            animation: "orbFloat 8s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          <div style={{
            fontSize: 12, textTransform: "uppercase", letterSpacing: 3,
            color: "#E8A838", marginBottom: 12, fontWeight: 700,
            position: "relative", zIndex: 1,
          }}>
            Notre Vision
          </div>
          <h2 style={{
            fontSize: 26, fontWeight: 800, margin: "0 0 24px", lineHeight: 1.3,
            color: "#1a1a2e",
            position: "relative", zIndex: 1,
          }}>
            Devenir LA référence du e-commerce en République du Congo
          </h2>
          <p style={{
            fontSize: 15.5, lineHeight: 1.9, color: "#444", margin: 0,
            position: "relative", zIndex: 1,
          }}>
            Nous rêvons d'un Congo où chaque foyer peut commander en ligne en
            toute confiance, où chaque vendeur trouve ses clients sans barrières,
            et où « acheter congolais » devient un réflexe de fierté. Mayombe
            Market ambitionne de devenir la première plateforme de commerce en
            ligne du pays — un espace où la qualité, l'accessibilité et
            l'identité congolaise ne font qu'un.
          </p>
        </div>

        {/* ── Engagements ── */}
        <h3 style={{
          textAlign: "center", fontSize: 22, fontWeight: 800, marginBottom: 24,
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Nos Engagements Concrets
        </h3>
        <div
          className="engagements-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            perspective: "800px",
          }}
        >
          {engagements.map((e, i) => (
            <div
              key={i}
              className="engagement-card"
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: "white",
                borderRadius: 18,
                padding: 26,
                textAlign: "center",
                border: `2px solid ${e.color}18`,
                boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
                animationDelay: `${i * 0.4}s`,
                position: "relative",
                overflow: "hidden",
                cursor: "default",
              }}
            >
              {/* Shimmer top accent */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, transparent, ${e.color}, transparent)`,
                backgroundSize: "200% 100%",
                animation: "shimmer 3s linear infinite",
              }} />
              {/* Animated icon */}
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: `linear-gradient(135deg, ${e.color}15, ${e.color}08)`,
                border: `2px solid ${e.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
                position: "relative",
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 5,
                  background: `linear-gradient(135deg, ${e.color}, ${e.color}88)`,
                  animation: "spinSlow 4s linear infinite",
                }} />
              </div>
              <h4 style={{
                fontSize: 15, fontWeight: 700, color: e.color,
                margin: "0 0 8px",
              }}>
                {e.title}
              </h4>
              <p style={{
                fontSize: 13, color: "#555", lineHeight: 1.65, margin: 0,
              }}>
                {e.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
