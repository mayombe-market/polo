/**
 * Journaux structurés pour le debug (navigateur : F12 → Console).
 * Préfixe fixe `[Mayombe]` + scope pour repérer l’origine rapidement.
 */

const PREFIX = '[Mayombe]'

function safeExtra(extra?: Record<string, unknown>) {
  if (!extra || typeof extra !== 'object') return undefined
  try {
    return JSON.parse(JSON.stringify(extra)) as Record<string, unknown>
  } catch {
    return { _note: 'extra non sérialisable' }
  }
}

/** Erreur explicite (échec chargement image, exception, etc.) */
export function diagError(scope: string, message: string, extra?: Record<string, unknown>) {
  const e = safeExtra(extra)
  if (e && Object.keys(e).length > 0) {
    console.error(`${PREFIX} [${scope}] ${message}`, e)
  } else {
    console.error(`${PREFIX} [${scope}] ${message}`)
  }
}

/** Avertissement (données incomplètes, repli, etc.) — moins prioritaire qu’une erreur */
export function diagWarn(scope: string, message: string, extra?: Record<string, unknown>) {
  const e = safeExtra(extra)
  if (e && Object.keys(e).length > 0) {
    console.warn(`${PREFIX} [${scope}] ${message}`, e)
  } else {
    console.warn(`${PREFIX} [${scope}] ${message}`)
  }
}

/** Info ponctuelle (activation SW, etc.) — désactivable si bruyant */
export function diagInfo(scope: string, message: string, extra?: Record<string, unknown>) {
  const e = safeExtra(extra)
  if (e && Object.keys(e).length > 0) {
    console.info(`${PREFIX} [${scope}] ${message}`, e)
  } else {
    console.info(`${PREFIX} [${scope}] ${message}`)
  }
}
