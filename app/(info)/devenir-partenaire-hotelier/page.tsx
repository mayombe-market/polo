"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HotelPricingSection, HotelPlanComparisonModal } from "@/app/components/HotelSubscription"
import { SYSTEM_FONT_STACK } from "@/lib/systemFontStack"

const steps = [
    { num: "1", icon: "📝", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement et choisissez le profil Hôtellerie." },
    { num: "2", icon: "🏨", title: "Choisissez votre plan", desc: "Indépendant (gratuit), Hôtel Pro ou Chaîne selon votre établissement." },
    { num: "3", icon: "✅", title: "Validation admin", desc: "Les comptes Indépendant sont modérés. Hôtel Pro et Chaîne publient directement." },
    { num: "4", icon: "📋", title: "Publiez vos chambres", desc: "Ajoutez photos, prix/nuit, équipements, type de chambre et recevez des contacts." },
]

const advantages = [
    { icon: "🌍", title: "Visibilité nationale", desc: "Brazzaville, Pointe-Noire et toutes les villes du Congo." },
    { icon: "⭐", title: "Badge professionnel", desc: "Affichez votre statut Hôtel Pro ou Hôtel Certifié sur chaque annonce." },
    { icon: "📞", title: "Contact direct", desc: "Votre numéro visible sur vos annonces (plans payants)." },
    { icon: "🎥", title: "Visite virtuelle YouTube", desc: "Montrez l'ambiance de votre hôtel avec une vidéo (plans payants)." },
    { icon: "📊", title: "Statistiques", desc: "Suivez les vues et contacts générés par chaque chambre." },
    { icon: "⬆️", title: "Mises en avant", desc: "Boostez vos chambres pour apparaître en tête des résultats." },
]

export default function DevenirPartenaireHotelierPage() {
    const router = useRouter()
    const [billing, setBilling] = useState("monthly")
    const [showComparison, setShowComparison] = useState(false)

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
            fontFamily: SYSTEM_FONT_STACK,
        }}>
            {showComparison && <HotelPlanComparisonModal onClose={() => setShowComparison(false)} />}

            {/* ══════════════ HERO ══════════════ */}
            <div style={{ textAlign: "center", padding: "80px 24px 60px", position: "relative", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    width: 600, height: 600,
                    background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                }} />

                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 16px", borderRadius: 20, marginBottom: 20,
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                }}>
                    <span style={{ fontSize: 8, color: "#F59E0B" }}>●</span>
                    <span style={{ color: "#F59E0B", fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>
                        HÔTELLERIE AU CONGO-BRAZZAVILLE
                    </span>
                </div>

                <h1 style={{
                    color: "#F0ECE2", fontSize: 38, fontWeight: 800,
                    margin: "0 0 12px", lineHeight: 1.1,
                    maxWidth: 580, marginLeft: "auto", marginRight: "auto",
                }}>
                    Publiez vos chambres d&apos;hôtel sur{" "}
                    <span style={{ color: "#F59E0B" }}>Mayombe Market</span>
                </h1>

                <p style={{ color: "#888", fontSize: 16, margin: "0 auto 32px", maxWidth: 500, lineHeight: 1.7 }}>
                    Hôtel indépendant, chambre d&apos;hôtes ou grande chaîne — touchez vos clients
                    dans tout le Congo directement depuis votre téléphone.
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                        onClick={() => router.push("/complete-profile?type=hotel")}
                        style={{
                            padding: "18px 40px", borderRadius: 16, border: "none",
                            background: "linear-gradient(135deg, #F59E0B, #D97706)",
                            color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
                        }}
                    >
                        🏨 Publier mes chambres
                    </button>
                    <button
                        onClick={() => setShowComparison(true)}
                        style={{
                            padding: "18px 28px", borderRadius: 16, cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1.5px solid rgba(245,158,11,0.3)",
                            color: "#F59E0B", fontSize: 15, fontWeight: 700,
                        }}
                    >
                        Comparer les plans ?
                    </button>
                </div>

                {/* Stats rapides */}
                <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 48, flexWrap: "wrap" }}>
                    {[
                        { val: "3", label: "chambres gratuites" },
                        { val: "20", label: "chambres / mois Pro" },
                        { val: "∞", label: "chambres Chaîne" },
                    ].map((s, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                            <div style={{ color: "#F59E0B", fontSize: 32, fontWeight: 900 }}>{s.val}</div>
                            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ ÉTAPES ══════════════ */}
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 32px" }}>
                    Comment ça marche ?
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {steps.map((step, i) => (
                        <div key={i} style={{ padding: "20px", borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#F59E0B", fontSize: 13, fontWeight: 900,
                                }}>{step.num}</div>
                                <span style={{ fontSize: 22 }}>{step.icon}</span>
                            </div>
                            <h3 style={{ color: "#F0ECE2", fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>{step.title}</h3>
                            <p style={{ color: "#888", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ AVANTAGES ══════════════ */}
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 48px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 32px" }}>
                    Pourquoi choisir Mayombe Market ?
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {advantages.map((a, i) => (
                        <div key={i} style={{ padding: "18px 20px", borderRadius: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 26, flexShrink: 0 }}>{a.icon}</span>
                            <div>
                                <p style={{ color: "#F0ECE2", fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{a.title}</p>
                                <p style={{ color: "#888", fontSize: 11, margin: 0, lineHeight: 1.6 }}>{a.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ PLANS ══════════════ */}
            <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px 60px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
                    Choisissez votre plan
                </h2>
                <p style={{ color: "#888", fontSize: 13, textAlign: "center", margin: "0 0 28px" }}>
                    Commencez gratuitement, passez au pro quand vous êtes prêt
                </p>
                <HotelPricingSection
                    currentPlan="hotel_free"
                    billing={billing}
                    setBilling={setBilling}
                    onSelectPlan={() => router.push("/complete-profile?type=hotel")}
                    onSkip={() => router.push("/complete-profile?type=hotel")}
                />
            </div>

            {/* ══════════════ CTA FINAL ══════════════ */}
            <div style={{ textAlign: "center", padding: "48px 24px 80px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>
                    Prêt à publier votre première chambre ?
                </h2>
                <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px" }}>
                    Inscription gratuite — 3 chambres offertes dès le départ.
                </p>
                <button
                    onClick={() => router.push("/complete-profile?type=hotel")}
                    style={{
                        padding: "18px 48px", borderRadius: 16, border: "none",
                        background: "linear-gradient(135deg, #F59E0B, #D97706)",
                        color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                        boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
                    }}
                >
                    Créer mon compte hôtelier →
                </button>
            </div>
        </div>
    )
}
