'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LegalArticle } from '@/lib/legal/types'

type Props = {
    articles: LegalArticle[]
    title: string
    breadcrumbLabel: string
    bannerTitle: string
    bannerDescription: string
    /** Fond de la zone de contenu (sous header / au-dessus du footer) */
    outerClassName: string
    defaultExpandedId?: string | null
}

export default function LegalAccordionDocument({
    articles,
    title,
    breadcrumbLabel,
    bannerTitle,
    bannerDescription,
    outerClassName,
    defaultExpandedId = '01',
}: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId)
    const router = useRouter()

    return (
        <div className={`min-h-screen ${outerClassName}`}>
            <style>{`
        @keyframes legalCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .legal-acc-card {
          animation: legalCardIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .legal-acc-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
        }
        .legal-acc-header {
          transition: background 0.3s ease;
        }
        .legal-acc-header:hover {
          filter: brightness(0.97);
        }
        .legal-back-btn {
          transition: all 0.3s ease;
        }
        .legal-back-btn:hover {
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(232,168,56,0.25);
        }
      `}</style>

            <div
                style={{
                    maxWidth: 800,
                    margin: '0 auto',
                    padding: '24px 20px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <h1
                    style={{
                        fontSize: 24,
                        fontWeight: 800,
                        margin: 0,
                        letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg, #1a1a2e, #E8A838)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {title}
                </h1>
                <button
                    type="button"
                    className="legal-back-btn"
                    onClick={() => router.back()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        borderRadius: 50,
                        background: '#1a1a2e',
                        border: 'none',
                        color: '#E8A838',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    ← Retour
                </button>
            </div>

            <div
                style={{
                    maxWidth: 800,
                    margin: '0 auto',
                    padding: '12px 20px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#bbb',
                }}
            >
                <a
                    href="/"
                    style={{ color: '#ccc', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#E8A838'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#ccc'
                    }}
                >
                    Accueil
                </a>
                <span style={{ color: '#ddd' }}>›</span>
                <span style={{ color: '#999' }}>{breadcrumbLabel}</span>
            </div>

            <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px 0' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'white',
                        borderRadius: 16,
                        padding: '20px 28px',
                        marginBottom: 32,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        borderLeft: '4px solid #E8A838',
                    }}
                >
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: '#E8A83810',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                background: 'linear-gradient(135deg, #E8A838, #F97316)',
                            }}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#E8A838', marginBottom: 2 }}>{bannerTitle}</div>
                        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{bannerDescription}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {articles.map((a, idx) => {
                        const isExpanded = expandedId === a.number
                        return (
                            <div
                                key={a.number}
                                className="legal-acc-card"
                                style={{
                                    background: 'white',
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    boxShadow: isExpanded ? `0 8px 32px ${a.color}15` : '0 2px 8px rgba(0,0,0,0.04)',
                                    border: `2px solid ${isExpanded ? `${a.color}30` : 'transparent'}`,
                                    animationDelay: `${idx * 0.06}s`,
                                }}
                            >
                                <button
                                    type="button"
                                    className="legal-acc-header"
                                    onClick={() => setExpandedId(isExpanded ? null : a.number)}
                                    style={{
                                        width: '100%',
                                        padding: '22px 28px',
                                        border: 'none',
                                        background: isExpanded ? `${a.color}06` : 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        textAlign: 'left',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 14,
                                            background: isExpanded ? a.color : `${a.color}12`,
                                            color: isExpanded ? 'white' : a.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: 15,
                                            flexShrink: 0,
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        {a.number}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: a.color,
                                                textTransform: 'uppercase',
                                                letterSpacing: 2,
                                                marginBottom: 2,
                                                opacity: 0.7,
                                            }}
                                        >
                                            Article {a.number}
                                        </div>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>{a.title}</div>
                                    </div>
                                    <div
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 8,
                                            background: isExpanded ? `${a.color}18` : '#f5f5f5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 14,
                                            color: isExpanded ? a.color : '#999',
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'all 0.3s',
                                            flexShrink: 0,
                                        }}
                                    >
                                        ▼
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div style={{ padding: '0 28px 28px', paddingLeft: 92 }}>
                                        {a.content && (
                                            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#555', margin: 0 }}>{a.content}</p>
                                        )}

                                        {a.intro && (
                                            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#555', margin: '0 0 14px' }}>{a.intro}</p>
                                        )}

                                        {a.items && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {a.items.map((item, ii) => (
                                                    <div
                                                        key={ii}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: 12,
                                                            padding: '10px 14px',
                                                            borderRadius: 10,
                                                            background: '#fafafa',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 22,
                                                                height: 22,
                                                                borderRadius: 6,
                                                                background: `${a.color}12`,
                                                                color: a.color,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                flexShrink: 0,
                                                                marginTop: 1,
                                                            }}
                                                        >
                                                            ✓
                                                        </div>
                                                        <span style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div style={{ height: 60 }} />
            </div>
        </div>
    )
}
