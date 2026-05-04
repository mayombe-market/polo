let audioContext: AudioContext | null = null

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext
}

/** Débloque l’audio après interaction utilisateur (politique navigateur). */
function resumeAudioIfNeeded(ctx: AudioContext) {
    if (ctx.state === 'suspended') {
        void ctx.resume()
    }
}

/** À appeler après un geste utilisateur (clic/touch) pour autoriser les sons ensuite. */
export function unlockNotificationAudio() {
    try {
        resumeAudioIfNeeded(getAudioContext())
    } catch {
        /* noop */
    }
}

/**
 * Sonnerie de notification in-app (ligne insérée dans `notifications`).
 * Volume plus marqué que les autres bips pour être entendu hors du focus.
 */
export function playNotificationAlertSound() {
    try {
        const ctx = getAudioContext()
        resumeAudioIfNeeded(ctx)
        const now = ctx.currentTime
        const vol = 0.38

        // Double coup : aigu puis médium (type « cloche »)
        const tones: { freq: number; at: number; dur: number }[] = [
            { freq: 1046, at: 0, dur: 0.12 },
            { freq: 784, at: 0.1, dur: 0.14 },
            { freq: 1318, at: 0.28, dur: 0.12 },
        ]

        for (const { freq, at, dur } of tones) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = freq
            const t0 = now + at
            gain.gain.setValueAtTime(0.0001, t0)
            gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
            osc.connect(gain).connect(ctx.destination)
            osc.start(t0)
            osc.stop(t0 + dur + 0.02)
        }
    } catch {
        /* Audio indisponible */
    }
}

/** Son de succes (paiement valide, commande confirmee) */
export function playSuccessSound() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        // Note 1 : Do (523 Hz)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.value = 523
        gain1.gain.setValueAtTime(0.3, now)
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc1.connect(gain1).connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.3)

        // Note 2 : Mi (659 Hz)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.value = 659
        gain2.gain.setValueAtTime(0.3, now + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
        osc2.connect(gain2).connect(ctx.destination)
        osc2.start(now + 0.15)
        osc2.stop(now + 0.45)

        // Note 3 : Sol (784 Hz)
        const osc3 = ctx.createOscillator()
        const gain3 = ctx.createGain()
        osc3.type = 'sine'
        osc3.frequency.value = 784
        gain3.gain.setValueAtTime(0.3, now + 0.3)
        gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.7)
        osc3.connect(gain3).connect(ctx.destination)
        osc3.start(now + 0.3)
        osc3.stop(now + 0.7)
    } catch (e) {
        // Audio non supporte, on ignore silencieusement
    }
}

/** Son de négociation (chime doux triangle wave) */
export function playNegotiationSound() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        // Chime doux : triangle wave 660Hz → 880Hz
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'triangle'
        osc1.frequency.setValueAtTime(660, now)
        osc1.frequency.linearRampToValueAtTime(880, now + 0.25)
        gain1.gain.setValueAtTime(0.2, now)
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
        osc1.connect(gain1).connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.4)

        // Note 2 : triangle 1100Hz (résolution)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'triangle'
        osc2.frequency.value = 1100
        gain2.gain.setValueAtTime(0.15, now + 0.3)
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
        osc2.connect(gain2).connect(ctx.destination)
        osc2.start(now + 0.3)
        osc2.stop(now + 0.6)
    } catch (e) {
        // Audio non supporte, on ignore silencieusement
    }
}

/** Son de livraison (notification logisticien — double bip grave) */
export function playDeliverySound() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        // Bip grave 1 : 440Hz
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'square'
        osc1.frequency.value = 440
        gain1.gain.setValueAtTime(0.15, now)
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
        osc1.connect(gain1).connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.15)

        // Bip grave 2 : 550Hz (plus haut)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'square'
        osc2.frequency.value = 550
        gain2.gain.setValueAtTime(0.15, now + 0.2)
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
        osc2.connect(gain2).connect(ctx.destination)
        osc2.start(now + 0.2)
        osc2.stop(now + 0.4)
    } catch (e) {
        // Audio non supporte, on ignore silencieusement
    }
}

/** Son de nouveau message (ding court et doux) */
export function playMessageSound() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        // Ding aigu doux : sine 1046Hz (Do aigu)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1046, now)
        osc.frequency.exponentialRampToValueAtTime(1318, now + 0.1)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.connect(gain).connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.3)
    } catch (e) {
        // Audio non supporte, on ignore silencieusement
    }
}

// ─── ALARME ADMIN — boucle infinie jusqu'à arrêt manuel ─────────────────────

let _alarmInterval: ReturnType<typeof setInterval> | null = null
let _alarmRunning = false

/**
 * Génère un burst d'alarme : 4 bips sawtooth alternés (1047 ↔ 1319 Hz), volume max.
 * Pensé pour être audible à 20 m.
 */
function _playAlarmBurst() {
    try {
        const ctx = getAudioContext()
        resumeAudioIfNeeded(ctx)
        const now = ctx.currentTime

        // Compressor pour maximiser le niveau de sortie
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -6
        comp.knee.value = 0
        comp.ratio.value = 20
        comp.attack.value = 0.001
        comp.release.value = 0.05
        comp.connect(ctx.destination)

        const pattern = [
            { freq: 1047, t: 0.00 },   // Do5
            { freq: 1319, t: 0.22 },   // Mi5
            { freq: 1047, t: 0.44 },   // Do5
            { freq: 1319, t: 0.66 },   // Mi5
            { freq: 1047, t: 0.88 },   // Do5 — 5ème note pour combler la pause
        ]

        for (const { freq, t } of pattern) {
            const osc  = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sawtooth'          // onde riche en harmoniques → perçante
            osc.frequency.value = freq

            const start = now + t
            gain.gain.setValueAtTime(0, start)
            gain.gain.linearRampToValueAtTime(1.0, start + 0.015) // attaque très rapide
            gain.gain.setValueAtTime(1.0, start + 0.15)
            gain.gain.linearRampToValueAtTime(0, start + 0.20)

            osc.connect(gain)
            gain.connect(comp)
            osc.start(start)
            osc.stop(start + 0.22)
        }
    } catch { /* noop */ }
}

/** Démarre l'alarme admin en boucle (ne fait rien si déjà active). */
export function startAdminAlarm() {
    if (_alarmRunning) return
    _alarmRunning = true
    _playAlarmBurst()
    _alarmInterval = setInterval(_playAlarmBurst, 2200)
}

/** Arrête l'alarme admin. */
export function stopAdminAlarm() {
    _alarmRunning = false
    if (_alarmInterval !== null) {
        clearInterval(_alarmInterval)
        _alarmInterval = null
    }
}

/** Retourne true si l'alarme est en cours. */
export function isAdminAlarmRunning() {
    return _alarmRunning
}

/** Son de nouvelle commande (notification vendeur) */
export function playNewOrderSound() {
    try {
        const ctx = getAudioContext()
        const now = ctx.currentTime

        // Double bip court
        for (let i = 0; i < 2; i++) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = 880
            const start = now + i * 0.2
            gain.gain.setValueAtTime(0.25, start)
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12)
            osc.connect(gain).connect(ctx.destination)
            osc.start(start)
            osc.stop(start + 0.12)
        }
    } catch (e) {
        // Audio non supporte, on ignore silencieusement
    }
}
