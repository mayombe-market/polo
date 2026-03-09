'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'

const ShareButtons = ({ title, text, url }: {
    title: string
    text: string
    url: string
}) => {
    const [copied, setCopied] = useState(false)
    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

    const shareMessage = `${text}\n${url}`

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback pour les anciens navigateurs
            const input = document.createElement('input')
            input.value = url
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            document.body.removeChild(input)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleNativeShare = async () => {
        try {
            await navigator.share({ title, text, url })
        } catch {
            // L'utilisateur a annulé le partage
        }
    }

    return (
        <div className="flex items-center gap-2 mb-4">
            {/* WhatsApp — bouton principal */}
            <button
                onClick={handleWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest bg-green-500 text-white border border-green-600 shadow-sm shadow-green-500/20 hover:bg-green-600 transition-all"
            >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
            </button>

            {/* Copier le lien */}
            <button
                onClick={handleCopy}
                className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-sm transition-all ${
                    copied
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={copied ? 'Copié !' : 'Copier le lien'}
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>

            {/* Partage natif (mobile) */}
            {canNativeShare && (
                <button
                    onClick={handleNativeShare}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                    title="Partager"
                >
                    <Share2 size={14} />
                </button>
            )}
        </div>
    )
}

export default ShareButtons
