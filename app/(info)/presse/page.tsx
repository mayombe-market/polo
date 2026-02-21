"use client";

import { useRouter } from "next/navigation";

const socials = [
  {
    name: "Facebook",
    color: "#1877F2",
    path: "M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z",
  },
  {
    name: "Instagram",
    color: "#E1306C",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.97.25 2.43.41.61.24 1.05.52 1.51.98.46.46.74.9.98 1.51.16.46.36 1.26.41 2.43.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.97-.41 2.43-.24.61-.52 1.05-.98 1.51-.46.46-.9.74-1.51.98-.46.16-1.26.36-2.43.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.25-2.43-.41a4.07 4.07 0 01-1.51-.98 4.07 4.07 0 01-.98-1.51c-.16-.46-.36-1.26-.41-2.43C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.97.41-2.43.24-.61.52-1.05.98-1.51a4.07 4.07 0 011.51-.98c.46-.16 1.26-.36 2.43-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 00-2.16 1.35A5.88 5.88 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.47 1.35 2.16a5.88 5.88 0 002.16 1.35c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 002.16-1.35 5.88 5.88 0 001.35-2.16c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 00-1.35-2.16A5.88 5.88 0 0019.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-10.85a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z",
  },
  {
    name: "TikTok",
    color: "#000000",
    path: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.96-.57-.26-1.1-.59-1.62-.93-.01 3.44.01 6.88-.02 10.32-.12 1.68-.82 3.31-1.96 4.55A8.06 8.06 0 019.4 25.6c-1.4.2-2.86.05-4.16-.52-2.11-.91-3.74-2.84-4.38-5.04-.2-.71-.28-1.45-.28-2.19.03-1.77.64-3.52 1.76-4.89 1.28-1.58 3.16-2.6 5.16-2.78.02 1.52-.01 3.04-.02 4.56-.92.2-1.77.7-2.35 1.42-.44.54-.7 1.2-.73 1.88-.02.51.08 1.03.31 1.49.47 1.01 1.55 1.69 2.7 1.72 .76.03 1.51-.17 2.13-.58.74-.48 1.24-1.24 1.38-2.09.08-.43.08-.87.08-1.3V.02h3.53z",
  },
  {
    name: "X",
    color: "#000000",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
];

export default function PressePage() {
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes condCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .social-card {
          animation: condCardIn 0.4s ease-out both;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .social-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
        }
        .back-btn {
          transition: all 0.3s ease;
        }
        .back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
        @media (max-width: 640px) {
          .socials-grid { grid-template-columns: repeat(2, 1fr) !important; }
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
          Presse & Réseaux
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
        <span style={{ color: "#999" }}>Presse</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 0" }}>

        {/* BANNER */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "white", borderRadius: 16,
          padding: "20px 28px", marginBottom: 40,
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
              Suivez-nous sur nos réseaux
            </div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Retrouvez Mayombe Market sur les réseaux sociaux pour suivre nos actualités, nouveautés et promotions.
            </div>
          </div>
        </div>

        {/* SOCIAL CARDS */}
        <div
          className="socials-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {socials.map((s, i) => (
            <div
              key={s.name}
              className="social-card"
              style={{
                background: "white",
                borderRadius: 16,
                padding: "28px 20px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                border: `2px solid ${s.color}10`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: `${s.color}0A`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill={s.color}>
                  <path d={s.path} />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
                {s.name}
              </div>
              <div style={{
                fontSize: 12, color: "#bbb", fontStyle: "italic",
              }}>
                Bientôt disponible
              </div>
            </div>
          ))}
        </div>

        {/* MESSAGE */}
        <div style={{
          background: "white", borderRadius: 16,
          padding: "32px 28px", textAlign: "center",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <p style={{
            fontSize: 15, color: "#666", lineHeight: 1.8, margin: 0,
            maxWidth: 480, marginLeft: "auto", marginRight: "auto",
          }}>
            Nos pages officielles seront bientôt en ligne. En attendant, vous pouvez nous contacter directement via notre service client pour toute demande presse ou partenariat.
          </p>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
