"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const articles = [
  {
    number: "01",
    title: "Objet",
    color: "#E8A838",
    content: "Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation du site Mayombe Market. En utilisant ce site, vous acceptez ces conditions dans leur intégralité.",
  },
  {
    number: "02",
    title: "Accès au site",
    color: "#3B82F6",
    items: [
      "L'accès au site est gratuit et ouvert à tous.",
      "Certaines fonctionnalités, comme la commande de produits, nécessitent la création d'un compte et la fourniture d'informations exactes.",
      "Mayombe Market se réserve le droit de modifier, suspendre ou interrompre temporairement ou définitivement l'accès au site, pour maintenance ou raison technique.",
    ],
  },
  {
    number: "03",
    title: "Compte utilisateur",
    color: "#A855F7",
    items: [
      "Pour utiliser certaines fonctionnalités, l'utilisateur doit s'inscrire et créer un compte.",
      "L'utilisateur est responsable de la confidentialité de ses identifiants et mots de passe.",
      "Toute utilisation du compte est considérée comme réalisée par l'utilisateur titulaire du compte.",
    ],
  },
  {
    number: "04",
    title: "Obligations de l'utilisateur",
    color: "#F97316",
    intro: "L'utilisateur s'engage à :",
    items: [
      "Fournir des informations exactes et à jour lors de la création de son compte et lors des commandes.",
      "Respecter la législation en vigueur et ne pas publier de contenus illicites, diffamatoires ou offensants.",
      "Ne pas utiliser le site pour toute activité commerciale non autorisée.",
    ],
  },
  {
    number: "05",
    title: "Propriété intellectuelle",
    color: "#F43F5E",
    items: [
      "Tous les contenus du site (textes, images, logos, vidéos, designs) sont la propriété de Mayombe Market ou de ses partenaires.",
      "Toute reproduction, modification, diffusion ou utilisation sans autorisation est strictement interdite.",
    ],
  },
  {
    number: "06",
    title: "Cookies et données personnelles",
    color: "#3B82F6",
    items: [
      "Le site utilise des cookies pour améliorer l'expérience utilisateur (voir Politique de Cookies).",
      "Les données collectées sont traitées conformément à notre Politique de Confidentialité.",
    ],
  },
  {
    number: "07",
    title: "Responsabilité",
    color: "#F43F5E",
    items: [
      "Mayombe Market s'efforce de fournir des informations exactes mais ne garantit pas l'exactitude, l'exhaustivité ou l'actualité des contenus.",
      "Le site ne peut être tenu responsable des dommages directs ou indirects liés à l'utilisation du site.",
    ],
  },
  {
    number: "08",
    title: "Liens externes",
    color: "#6b7280",
    items: [
      "Le site peut contenir des liens vers des sites tiers.",
      "Mayombe Market n'est pas responsable du contenu ou des pratiques de ces sites.",
    ],
  },
  {
    number: "09",
    title: "Modification des CGU",
    color: "#A855F7",
    items: [
      "Mayombe Market se réserve le droit de modifier les CGU à tout moment.",
      "Les utilisateurs seront informés des changements via le site ou par e-mail si nécessaire.",
    ],
  },
  {
    number: "10",
    title: "Loi applicable et juridiction",
    color: "#06B6D4",
    items: [
      "Les présentes CGU sont régies par la loi du Congo.",
      "Tout litige relatif à l'utilisation du site sera soumis aux tribunaux compétents du Congo.",
    ],
  },
];

export default function CGUPage() {
  const [expandedId, setExpandedId] = useState<string | null>("01");
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cgu-card {
          animation: condCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .cgu-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .cgu-header {
          transition: background 0.3s ease;
        }
        .cgu-header:hover {
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

      {/* TOP BAR */}
      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "24px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{
          fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Conditions Générales d'Utilisation
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
        <span style={{ color: "#999" }}>Conditions Générales d'Utilisation</span>
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
              Cadre juridique
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Conditions régissant l'accès et l'utilisation du site Mayombe Market. Dernière mise à jour : Février 2026.
            </div>
          </div>
        </div>

        {/* ARTICLES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {articles.map((a, idx) => {
            const isExpanded = expandedId === a.number;
            return (
              <div
                key={a.number}
                className="cgu-card"
                style={{
                  background: "white", borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `0 8px 32px ${a.color}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isExpanded ? a.color + "30" : "transparent"}`,
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                <button
                  className="cgu-header"
                  onClick={() => setExpandedId(isExpanded ? null : a.number)}
                  style={{
                    width: "100%", padding: "22px 28px",
                    border: "none",
                    background: isExpanded ? `${a.color}06` : "white",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpanded ? a.color : `${a.color}12`,
                    color: isExpanded ? "white" : a.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {a.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: a.color,
                      textTransform: "uppercase", letterSpacing: 2,
                      marginBottom: 2, opacity: 0.7,
                    }}>
                      Article {a.number}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                      {a.title}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isExpanded ? `${a.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isExpanded ? a.color : "#999",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 28px 28px", paddingLeft: 92 }}>
                    {a.content && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: 0 }}>
                        {a.content}
                      </p>
                    )}

                    {a.intro && (
                      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#555", margin: "0 0 14px" }}>
                        {a.intro}
                      </p>
                    )}

                    {a.items && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {a.items.map((item, ii) => (
                          <div key={ii} style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "10px 14px", borderRadius: 10, background: "#fafafa",
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6,
                              background: `${a.color}12`, color: a.color,
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
