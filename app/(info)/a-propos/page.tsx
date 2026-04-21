"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const sections = [
  {
    id: "about",
    title: "Qu'est-ce que Mayombe Market ?",
    content:
      "Mayombe Market est la première marketplace congolaise qui connecte directement les vendeurs du Congo avec les clients du Congo. Notre mission est simple : permettre à tout entrepreneur, artisan, commerçant ou créateur basé en République du Congo de vendre ses produits en ligne, et à tout client congolais de les commander facilement, en toute confiance, avec livraison à domicile. Nous sommes un pont numérique entre ceux qui produisent et ceux qui consomment — entièrement fait au Congo, pour le Congo.",
    gradient: "linear-gradient(135deg, #1a1a2e, #2d2d4a)",
  },
  {
    id: "meaning",
    title: "Que signifie Mayombe Market ?",
    content:
      "Le Mayombe, c'est cette forêt majestueuse qui s'étend au cœur du Congo jusqu'à l'océan Atlantique — symbole de richesse, de vie et d'abondance. Comme elle, notre marché en ligne rassemble une diversité immense de produits, de vendeurs et de clients issus de tout le territoire congolais. Chaque produit sur Mayombe Market raconte une histoire congolaise. Chaque achat crée un lien direct entre un entrepreneur local et un foyer congolais.",
    gradient: "linear-gradient(135deg, #2d2d4a, #3a3a5c)",
  },
  {
    id: "origin",
    title: "Qui sont les vendeurs sur Mayombe Market ?",
    content:
      "Tous nos vendeurs sont basés en République du Congo. Ce sont des commerçants, artisans, créateurs, entrepreneurs et boutiques installés à Brazzaville, Pointe-Noire, Dolisie et dans d'autres villes du pays. Chaque vendeur est vérifié par notre équipe avant de pouvoir publier ses produits. En achetant sur Mayombe Market, vous soutenez directement l'économie locale et les entrepreneurs congolais.",
    gradient: "linear-gradient(135deg, #1e293b, #334155)",
  },
  {
    id: "mission",
    title: "Notre mission",
    content:
      "Nous croyons que chaque Congolais mérite d'avoir accès à un marché numérique fiable, simple et sécurisé. Du côté des vendeurs, nous leur offrons une vitrine en ligne professionnelle sans besoin de compétences techniques. Du côté des acheteurs, nous leur garantissons des produits réels, des paiements sécurisés via Mobile Money, et une livraison suivie jusqu'à leur porte. Ensemble, nous construisons le commerce de demain — ancré dans nos réalités, pensé pour notre quotidien.",
    gradient: "linear-gradient(135deg, #1a2e1a, #1e3a1e)",
  },
];

const strengths = [
  {
    title: "100% Vendeurs Congolais",
    desc: "Chaque vendeur sur Mayombe Market est vérifié et basé en République du Congo. Vous achetez local, vous soutenez l'économie congolaise directement.",
    color: "#E8A838",
    icon: "🇨🇬",
  },
  {
    title: "Paiement Mobile Money",
    desc: "Payez facilement via MTN Mobile Money ou Airtel Money — les moyens de paiement que vous utilisez déjà au quotidien. Aucune carte bancaire requise.",
    color: "#3B82F6",
    icon: "📱",
  },
  {
    title: "Livraison à domicile",
    desc: "Nous livrons partout en République du Congo. Standard, express ou inter-ville : recevez votre commande directement chez vous, à votre quartier.",
    color: "#A855F7",
    icon: "🚚",
  },
  {
    title: "Protection acheteur",
    desc: "Produit non reçu ou non conforme ? Notre système de litiges vous protège. Vous pouvez signaler un problème et notre équipe intervient rapidement.",
    color: "#F43F5E",
    icon: "🛡️",
  },
  {
    title: "Vitrine pour les vendeurs",
    desc: "Tout entrepreneur congolais peut créer sa boutique en ligne en quelques minutes, sans compétences techniques. Vendez vos produits dans tout le pays.",
    color: "#10B981",
    icon: "🏪",
  },
  {
    title: "Suivi en temps réel",
    desc: "Clients et vendeurs sont informés à chaque étape : confirmation, préparation, expédition, livraison. Tout est visible dans le tableau de bord.",
    color: "#F97316",
    icon: "🔔",
  },
];

const values = [
  {
    color: "#E8A838",
    title: "Mbongui — L'esprit communautaire",
    desc: "Comme dans nos villages, nous croyons à la force du collectif. Mayombe Market est un espace de partage où vendeurs et acheteurs forment une même communauté, unis par la solidarité et l'entraide.",
  },
  {
    color: "#3B82F6",
    title: "Mayombe — Richesse & Abondance",
    desc: "Inspirés par la forêt du Mayombe, poumon vert du Congo, nous valorisons la richesse naturelle de notre terre. Chaque produit reflète l'abondance et la diversité de notre patrimoine.",
  },
  {
    color: "#A855F7",
    title: "Bosembo — Intégrité & Honneur",
    desc: "Le Bosembo, c'est la parole donnée, le respect de l'autre et la droiture. Nous commerçons avec honnêteté, transparence et dignité, comme nos ancêtres nous l'ont enseigné.",
  },
  {
    color: "#F43F5E",
    title: "Libota — La Famille d'abord",
    desc: "Au Congo, la famille est le pilier de tout. Mayombe Market existe pour améliorer le quotidien de chaque foyer congolais en rendant les bons produits accessibles à tous, à des prix justes.",
  },
  {
    color: "#F97316",
    title: "Fiertés Congolaises",
    desc: "Nous portons fièrement nos racines. Soutenir les artisans, les créateurs et les entrepreneurs congolais est au cœur de notre mission. Le Congo a du talent, et le monde doit le savoir.",
  },
  {
    color: "#06B6D4",
    title: "Kimia — Paix & Unité",
    desc: "Kimia, c'est la paix en lingala. Nous bâtissons un marché où règnent le respect mutuel, la tolérance et l'unité entre tous les peuples, du Congo vers le monde entier.",
  },
];

export default function AProposPage() {
  const [activeTab, setActiveTab] = useState("about");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes spinSlow {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(40px) rotateX(10deg); }
          to { opacity: 1; transform: translateY(0) rotateX(0deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes tiltIn {
          from { opacity: 0; transform: perspective(800px) rotateY(-15deg) translateX(-30px); }
          to { opacity: 1; transform: perspective(800px) rotateY(0deg) translateX(0); }
        }
        @keyframes float3d {
          0%, 100% { transform: perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0); }
          25% { transform: perspective(600px) rotateX(3deg) rotateY(5deg) translateZ(10px); }
          50% { transform: perspective(600px) rotateX(-2deg) rotateY(-3deg) translateZ(20px); }
          75% { transform: perspective(600px) rotateX(4deg) rotateY(-5deg) translateZ(10px); }
        }
        @keyframes valueOrbit {
          from { transform: rotate(0deg) translateX(6px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(6px) rotate(-360deg); }
        }
        .about-section-card {
          animation: tiltIn 0.6s ease-out both;
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
        }
        .about-section-card:hover {
          transform: perspective(800px) rotateY(3deg) rotateX(-2deg) translateZ(20px) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important;
        }
        .strength-card {
          animation: cardEntrance 0.5s ease-out both;
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
        }
        .strength-card:hover {
          transform: perspective(600px) rotateX(-5deg) rotateY(5deg) translateZ(30px) scale(1.03) !important;
          box-shadow: 0 25px 50px rgba(0,0,0,0.2) !important;
        }
        .value-card {
          animation: float3d 6s ease-in-out infinite;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .value-card:hover {
          animation-play-state: paused;
          transform: perspective(600px) translateZ(40px) scale(1.05) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.12) !important;
        }
        .tab-btn {
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          position: relative;
          overflow: hidden;
        }
        .tab-btn::after {
          content: '';
          position: absolute;
          bottom: 0; left: 50%; width: 0; height: 2px;
          background: #E8A838;
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        .tab-btn:hover::after {
          width: 80%;
        }
        .tab-btn:hover {
          transform: translateY(-2px) scale(1.02);
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 900px) {
          .strengths-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .values-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .strengths-grid { grid-template-columns: 1fr !important; }
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
          À propos de nous
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
        <span style={{ color: "#999" }}>À propos de nous</span>
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
        {/* Tab Navigation */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "center",
          margin: "40px 0 32px", flexWrap: "wrap",
        }}>
          {[
            { id: "about", label: "À propos" },
            { id: "strengths", label: "Nos atouts" },
            { id: "values", label: "Nos valeurs" },
          ].map((tab) => (
            <button
              key={tab.id}
              className="tab-btn"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 28px",
                borderRadius: 50,
                border: "2px solid",
                borderColor: activeTab === tab.id ? "#1a1a2e" : "#e0e0e0",
                background: activeTab === tab.id
                  ? "linear-gradient(135deg, #1a1a2e, #2d2d4a)"
                  : "white",
                color: activeTab === tab.id ? "#E8A838" : "#555",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: activeTab === tab.id
                  ? "0 4px 20px rgba(26,26,46,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── About Sections ── */}
        {activeTab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {sections.map((s, i) => (
              <div
                key={s.id}
                className="about-section-card"
                style={{
                  background: "white",
                  borderRadius: 20,
                  padding: 0,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  animationDelay: `${i * 0.15}s`,
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <div style={{
                  background: s.gradient,
                  padding: "20px 32px",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: -20, right: -20,
                    width: 100, height: 100, borderRadius: "50%",
                    background: "rgba(232,168,56,0.06)",
                    animation: `heroOrb 5s ease-in-out infinite ${i}s`,
                  }} />
                  <h2 style={{
                    fontSize: 20, fontWeight: 800, color: "white",
                    margin: 0, position: "relative", zIndex: 1,
                  }}>
                    {s.title}
                  </h2>
                </div>
                <div style={{ padding: "24px 32px 28px" }}>
                  <p style={{
                    fontSize: 15.5, lineHeight: 1.9, color: "#444", margin: 0,
                  }}>
                    {s.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Strengths ── */}
        {activeTab === "strengths" && (
          <div>
            <h2 style={{
              textAlign: "center", fontSize: 28, fontWeight: 800,
              marginBottom: 36,
              background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Les atouts de Mayombe Market
            </h2>
            <div
              className="strengths-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                perspective: "1000px",
              }}
            >
              {strengths.map((s, i) => (
                <div
                  key={i}
                  className="strength-card"
                  style={{
                    background: "white",
                    borderRadius: 20,
                    padding: 28,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    animationDelay: `${i * 0.12}s`,
                    borderTop: `4px solid ${s.color}`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, right: 0,
                    width: 60, height: 60,
                    background: `linear-gradient(135deg, ${s.color}15, transparent)`,
                    borderBottomLeftRadius: 40,
                  }} />
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `linear-gradient(135deg, ${s.color}20, ${s.color}08)`,
                    border: `2px solid ${s.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16, fontSize: 22,
                    position: "relative",
                  }}>
                    {(s as any).icon || "✦"}
                  </div>
                  <h3 style={{
                    fontSize: 17, fontWeight: 700, marginBottom: 10, color: s.color,
                  }}>
                    {s.title}
                  </h3>
                  <p style={{
                    fontSize: 14, color: "#666", lineHeight: 1.7, margin: 0,
                  }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Values ── */}
        {activeTab === "values" && (
          <div>
            <h2 style={{
              textAlign: "center", fontSize: 28, fontWeight: 800,
              marginBottom: 36,
              background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Nos Valeurs — Enracinées au Congo
            </h2>
            <div
              className="values-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
                perspective: "800px",
              }}
            >
              {values.map((v, i) => (
                <div
                  key={i}
                  className="value-card"
                  style={{
                    background: "white",
                    borderRadius: 20,
                    padding: 28,
                    textAlign: "center",
                    border: `2px solid ${v.color}20`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                    animationDelay: `${i * 0.5}s`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, transparent, ${v.color}, transparent)`,
                    backgroundSize: "200% 100%",
                    animation: "shimmer 3s linear infinite",
                  }} />
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${v.color}18, ${v.color}08)`,
                    border: `2px solid ${v.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                    position: "relative",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      background: `linear-gradient(135deg, ${v.color}, ${v.color}88)`,
                      animation: "spinSlow 4s linear infinite",
                    }} />
                  </div>
                  <h3 style={{
                    fontSize: 16, fontWeight: 700, color: v.color,
                    marginBottom: 10,
                  }}>
                    {v.title}
                  </h3>
                  <p style={{
                    fontSize: 13.5, color: "#555", lineHeight: 1.7, margin: 0,
                  }}>
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
