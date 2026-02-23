let audioContext: AudioContext | null = null

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext
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
