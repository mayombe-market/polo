'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen() {
    const [show, setShow] = useState(false)
    const [hiding, setHiding] = useState(false)

    useEffect(() => {
        // Ne montrer qu'une seule fois par session
        if (sessionStorage.getItem('splash_done')) return
        sessionStorage.setItem('splash_done', '1')
        setShow(true)

        // Cacher après 1.5s minimum
        const timer = setTimeout(() => {
            setHiding(true)
            // Supprimer complètement après la transition
            setTimeout(() => setShow(false), 600)
        }, 1500)

        // Sécurité : toujours cacher après 4s
        const safety = setTimeout(() => {
            setHiding(true)
            setTimeout(() => setShow(false), 600)
        }, 4000)

        return () => {
            clearTimeout(timer)
            clearTimeout(safety)
        }
    }, [])

    if (!show) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #009543 0%, #009543 40%, #FBDE4A 50%, #DC241F 60%, #DC241F 100%)',
                transition: 'opacity 0.5s ease',
                opacity: hiding ? 0 : 1,
                pointerEvents: hiding ? 'none' as const : 'auto' as const,
            }}
        >
            {/* Logo */}
            <div
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: 28,
                    background: 'white',
                    padding: 16,
                    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'splashBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}
            >
                <img src="/logo.png" alt="Mayombe Market" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>

            {/* Titre */}
            <div
                style={{
                    marginTop: 24,
                    color: 'white',
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: -1,
                    textTransform: 'uppercase' as const,
                    fontStyle: 'italic',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    animation: 'splashFadeUp 0.6s 0.3s ease forwards',
                    opacity: 0,
                }}
            >
                Mayombe Market
            </div>

            {/* Sous-titre */}
            <div
                style={{
                    marginTop: 8,
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 4,
                    textTransform: 'uppercase' as const,
                    animation: 'splashFadeUp 0.6s 0.5s ease forwards',
                    opacity: 0,
                }}
            >
                Mode & Lifestyle au Congo
            </div>

            {/* Loader */}
            <div
                style={{
                    marginTop: 40,
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'splashSpin 0.8s linear infinite, splashFadeUp 0.4s 0.7s ease forwards',
                    opacity: 0,
                }}
            />
        </div>
    )
}
