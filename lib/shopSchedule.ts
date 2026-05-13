/**
 * Utilitaire partagé : planning d'ouverture des boutiques pâtisserie.
 * Stocké en JSONB dans profiles.shop_schedule.
 */

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface DaySchedule {
    closed: boolean
    open: string    // "08:00"
    close: string   // "20:00"
}

export type ShopSchedule = Partial<Record<DayKey, DaySchedule>>

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DAY_LABELS: Record<DayKey, string> = {
    mon: 'Lundi',
    tue: 'Mardi',
    wed: 'Mercredi',
    thu: 'Jeudi',
    fri: 'Vendredi',
    sat: 'Samedi',
    sun: 'Dimanche',
}

/** Planning par défaut : Lun–Sam 8h–20h, Dim 9h–14h */
export const DEFAULT_SCHEDULE: Record<DayKey, DaySchedule> = {
    mon: { closed: false, open: '08:00', close: '20:00' },
    tue: { closed: false, open: '08:00', close: '20:00' },
    wed: { closed: false, open: '08:00', close: '20:00' },
    thu: { closed: false, open: '08:00', close: '20:00' },
    fri: { closed: false, open: '08:00', close: '20:00' },
    sat: { closed: false, open: '09:00', close: '18:00' },
    sun: { closed: true,  open: '09:00', close: '14:00' },
}

/** JS Date.getDay() (0=dim) → DayKey */
const JS_DAY_TO_KEY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function parseMinutes(t: string): number {
    const [h, m] = (t || '00:00').split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
}

/**
 * Calcule si une boutique est actuellement ouverte.
 *
 * Règles (par priorité) :
 * 1. manualIsOpen === false → toujours fermé (fermeture d'urgence)
 * 2. Aucun planning configuré → ouvert (suit manualIsOpen = true)
 * 3. Planning configuré → vérifie jour courant + plage horaire
 */
export function computeIsOpen(
    schedule: ShopSchedule | null | undefined,
    manualIsOpen: boolean
): boolean {
    if (!manualIsOpen) return false
    if (!schedule || Object.keys(schedule).length === 0) return true

    const now    = new Date()
    const dayKey = JS_DAY_TO_KEY[now.getDay()]
    const day    = schedule[dayKey]

    if (!day || day.closed) return false

    const curr = now.getHours() * 60 + now.getMinutes()
    return curr >= parseMinutes(day.open) && curr < parseMinutes(day.close)
}

/**
 * Génère un texte résumé des horaires (ex. pour l'overlay "fermé")
 * Lun–Ven : 08:00–20:00 · Sam : 09:00–18:00 · Dim : Fermé
 */
export function formatScheduleText(schedule: ShopSchedule | null | undefined): string {
    if (!schedule || Object.keys(schedule).length === 0) return ''
    return DAY_KEYS
        .filter(k => schedule[k])
        .map(k => {
            const d = schedule[k]!
            const label = DAY_LABELS[k].slice(0, 3)
            return d.closed ? `${label} : Fermé` : `${label} : ${d.open}–${d.close}`
        })
        .join(' · ')
}
